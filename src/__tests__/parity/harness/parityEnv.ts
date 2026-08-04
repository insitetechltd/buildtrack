import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createMemoryStorage,
  createNetworkToggleFetch,
  shouldKeepTestData,
  cleanupIfAllowed,
} from '@/test-utils/supabaseTestHarness';

export type ParityTarget = 'old' | 'new';

export type ParityEnv = {
  target: ParityTarget;
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export type ParityContext = {
  target: ParityTarget;
  anon: SupabaseClient;
  service: SupabaseClient;
  fetch: typeof fetch;
  setOnline: (online: boolean) => void;
  storage: ReturnType<typeof createMemoryStorage>;
};

function readTarget(): ParityTarget {
  const raw = (process.env.PARITY_TARGET || 'old').toLowerCase();
  return raw === 'new' ? 'new' : 'old';
}

/**
 * Resolve OLD or NEW Supabase credentials.
 * Falls back to SUPABASE_TEST_* when PARITY_TARGET=old and dedicated vars are unset.
 */
export function getParityEnv(): ParityEnv | null {
  const { env } = explainParityEnv();
  return env;
}

export function explainParityEnv(): {
  env: ParityEnv | null;
  reason: string | null;
} {
  const target = readTarget();
  const confirmed = process.env.SUPABASE_TEST_CONFIRM_SANDBOX;

  if (confirmed !== '1') {
    return {
      env: null,
      reason: 'SUPABASE_TEST_CONFIRM_SANDBOX is not set to 1',
    };
  }

  const prefix = target === 'new' ? 'SUPABASE_PARITY_NEW' : 'SUPABASE_PARITY_OLD';
  let url = process.env[`${prefix}_URL`];
  let anonKey = process.env[`${prefix}_ANON_KEY`];
  let serviceRoleKey = process.env[`${prefix}_SERVICE_ROLE_KEY`];

  if ((!url || !anonKey || !serviceRoleKey) && target === 'old') {
    url = url || process.env.SUPABASE_TEST_URL;
    anonKey = anonKey || process.env.SUPABASE_TEST_ANON_KEY;
    serviceRoleKey = serviceRoleKey || process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  }

  if (!url || !anonKey || !serviceRoleKey) {
    return {
      env: null,
      reason: `Missing ${prefix}_URL / _ANON_KEY / _SERVICE_ROLE_KEY (or SUPABASE_TEST_* for old)`,
    };
  }

  if (!isUsableSupabaseKey(anonKey)) {
    return {
      env: null,
      reason:
        'ANON_KEY looks like a placeholder or non-ASCII (must be a real eyJ… JWT or sb_… key)',
    };
  }
  if (!isUsableSupabaseKey(serviceRoleKey)) {
    return {
      env: null,
      reason:
        'SERVICE_ROLE_KEY looks like a placeholder or non-ASCII (must be a real eyJ… JWT or sb_… key)',
    };
  }

  // Concatenate key so babel-preset-expo cannot statically inline EXPO_PUBLIC_*.
  const productionUrl = process.env['EXPO' + '_PUBLIC_SUPABASE_URL'];
  if (productionUrl && productionUrl === url) {
    return {
      env: null,
      reason: 'Parity URL equals EXPO_PUBLIC_SUPABASE_URL (refusing production)',
    };
  }

  return { env: { target, url, anonKey, serviceRoleKey }, reason: null };
}

function isUsableSupabaseKey(value: string): boolean {
  if (!value || /[^\x00-\x7F]/.test(value)) {
    return false;
  }
  const trimmed = value.trim();
  if (
    trimmed === '…' ||
    trimmed === '...' ||
    trimmed.includes('<') ||
    trimmed.toLowerCase().includes('your-')
  ) {
    return false;
  }
  // Legacy JWT keys (eyJ…) or newer sb_publishable_ / sb_secret_ keys
  if (trimmed.startsWith('eyJ') && trimmed.length > 40) {
    return true;
  }
  if (trimmed.startsWith('sb_') && trimmed.length > 20) {
    return true;
  }
  return false;
}

export function requireParityEnv(): ParityEnv {
  const { env, reason } = explainParityEnv();
  if (!env) {
    throw new Error(
      `Missing or invalid parity Supabase env${reason ? `: ${reason}` : ''}. ` +
        'Set SUPABASE_TEST_CONFIRM_SANDBOX=1 and real Dashboard → Settings → API keys ' +
        '(not placeholder "…"). Parity URL must not equal EXPO_PUBLIC_SUPABASE_URL.',
    );
  }
  return env;
}

export function isParityConfigured(): boolean {
  return !!getParityEnv();
}

export function describeParity(name: string, fn: () => void): void {
  const { env, reason } = explainParityEnv();
  if (!env) {
    // eslint-disable-next-line no-console
    console.warn(`[parity] Skipping "${name}": ${reason}`);
    describe.skip(name, fn);
    return;
  }
  describe(name, fn);
}

export function createParityAnonClient(
  env: ParityEnv,
  options?: {
    fetch?: typeof fetch;
    storage?: ReturnType<typeof createMemoryStorage>;
  },
): SupabaseClient {
  const storage = options?.storage ?? createMemoryStorage();
  return createClient(env.url, env.anonKey, {
    global: options?.fetch ? { fetch: options.fetch } : undefined,
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      storage,
      detectSessionInUrl: false,
    },
  });
}

export function createParityServiceClient(env: ParityEnv): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function createParityContext(): ParityContext {
  const env = requireParityEnv();
  const storage = createMemoryStorage();
  const network = createNetworkToggleFetch();
  return {
    target: env.target,
    anon: createParityAnonClient(env, { fetch: network.fetch, storage }),
    service: createParityServiceClient(env),
    fetch: network.fetch,
    setOnline: network.setOnline,
    storage,
  };
}

export { shouldKeepTestData, cleanupIfAllowed };
