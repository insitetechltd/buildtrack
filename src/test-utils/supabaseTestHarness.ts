import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SandboxEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

type AsyncKeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function getSandboxEnv(): SandboxEnv | null {
  const url = process.env.SUPABASE_TEST_URL;
  const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
  const confirmed = process.env.SUPABASE_TEST_CONFIRM_SANDBOX;

  if (!url || !anonKey || !serviceRoleKey) {
    return null;
  }

  if (confirmed !== '1') {
    return null;
  }

  const productionUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (productionUrl && productionUrl === url) {
    return null;
  }

  return { url, anonKey, serviceRoleKey };
}

export function requireSandboxEnv(): SandboxEnv {
  const env = getSandboxEnv();
  if (!env) {
    throw new Error(
      'Missing or unconfirmed SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY / SUPABASE_TEST_SERVICE_ROLE_KEY. Set SUPABASE_TEST_CONFIRM_SANDBOX=1 for a Supabase sandbox project before running sandbox simulation tests.',
    );
  }
  return env;
}

export function createNetworkToggleFetch(): {
  fetch: typeof fetch;
  setOnline: (online: boolean) => void;
} {
  let online = true;

  const wrappedFetch: typeof fetch = async (input, init) => {
    if (!online) {
      throw new Error('Network offline (simulated)');
    }
    return fetch(input as never, init);
  };

  return {
    fetch: wrappedFetch,
    setOnline: (nextOnline) => {
      online = nextOnline;
    },
  };
}

export function createMemoryStorage(): AsyncKeyValueStorage {
  const store: Record<string, string> = {};
  return {
    getItem: async (key) => store[key] ?? null,
    setItem: async (key, value) => {
      store[key] = value;
    },
    removeItem: async (key) => {
      delete store[key];
    },
  };
}

export function createSandboxAnonClient(options?: {
  fetch?: typeof fetch;
  storage?: AsyncKeyValueStorage;
}): SupabaseClient {
  const { url, anonKey } = requireSandboxEnv();
  const storage = options?.storage ?? createMemoryStorage();
  return createClient(url, anonKey, {
    global: options?.fetch ? { fetch: options.fetch } : undefined,
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      storage,
      detectSessionInUrl: false,
    },
  });
}

export function createSandboxServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = requireSandboxEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function shouldKeepTestData(): boolean {
  return process.env.KEEP_TEST_DATA === '1';
}

export async function cleanupIfAllowed(cleanup: () => Promise<void>): Promise<void> {
  if (shouldKeepTestData()) {
    return;
  }
  await cleanup();
}
