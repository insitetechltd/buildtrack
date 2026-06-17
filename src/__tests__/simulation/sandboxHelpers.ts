import { setSupabaseClient } from '@/api/supabase';
import {
  cleanupIfAllowed,
  createNetworkToggleFetch,
  createMemoryStorage,
  createSandboxAnonClient,
  createSandboxServiceClient,
  getSandboxEnv,
} from '@/test-utils/supabaseTestHarness';

export type SandboxContext = {
  anon: ReturnType<typeof createSandboxAnonClient>;
  service: ReturnType<typeof createSandboxServiceClient>;
  fetch: typeof fetch;
  setOnline: (online: boolean) => void;
  storage: ReturnType<typeof createMemoryStorage>;
};

export function isSandboxConfigured(): boolean {
  return !!getSandboxEnv();
}

export function describeSandbox(name: string, fn: () => void): void {
  const env = getSandboxEnv();
  const describeFn = env ? describe : describe.skip;
  describeFn(name, fn);
}

export function createSandboxContext(): SandboxContext {
  const storage = createMemoryStorage();
  const network = createNetworkToggleFetch();
  const anon = createSandboxAnonClient({ fetch: network.fetch, storage });
  const service = createSandboxServiceClient();
  return { anon, service, fetch: network.fetch, setOnline: network.setOnline, storage };
}

export async function withSandboxSupabase<T>(
  ctx: SandboxContext,
  run: () => Promise<T>,
): Promise<T> {
  setSupabaseClient(ctx.anon);
  try {
    return await run();
  } finally {
    setSupabaseClient(null);
  }
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  companyId: string;
  phone: string;
  name: string;
};

export async function ensureTestCompanyId(ctx: SandboxContext): Promise<string> {
  const { data, error } = await ctx.service
    .from('companies')
    .select('id')
    .limit(1);

  if (error) {
    throw error;
  }

  const existingId = data?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const created = await ctx.service
    .from('companies')
    .insert({
      name: `Sim Test Co ${Date.now()}`,
      type: 'general_contractor',
      description: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      logo: null,
      tax_id: null,
      license_number: null,
      insurance_expiry: null,
      banner: null,
      created_by: null,
      is_active: true,
    })
    .select('id')
    .single();

  if (created.error) {
    throw created.error;
  }

  return created.data.id;
}

export function buildUniqueEmail(prefix: string): string {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return `${prefix}-${stamp}@sim.test`;
}

export async function provisionTestUser(ctx: SandboxContext): Promise<TestUser> {
  const email = buildUniqueEmail('user');
  const password = `SimPass-${Math.floor(Math.random() * 1_000_000)}!`;
  const companyId = await ensureTestCompanyId(ctx);
  const phone = `${Math.floor(10000000 + Math.random() * 89999999)}`;
  const name = `Sim User ${Date.now()}`;

  const createdUser = await (ctx.service.auth.admin as any).createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone, company_id: companyId },
  });

  if (createdUser.error) {
    throw createdUser.error;
  }

  const userId = createdUser.data.user.id as string;
  const updateProfile = await ctx.service
    .from('users')
    .update({
      name,
      email,
      phone,
      company_id: companyId,
      position: 'Automation',
      role: 'worker',
    })
    .eq('id', userId);

  if (updateProfile.error) {
    await cleanupIfAllowed(async () => {
      await (ctx.service.auth.admin as any).deleteUser(userId);
    });
    throw updateProfile.error;
  }

  return { id: userId, email, password, companyId, phone, name };
}

export async function cleanupTestUser(ctx: SandboxContext, user: TestUser): Promise<void> {
  await cleanupIfAllowed(async () => {
    await ctx.service.from('users').delete().eq('id', user.id);
    await (ctx.service.auth.admin as any).deleteUser(user.id);
  });
}
