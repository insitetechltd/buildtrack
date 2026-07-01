import { getSandboxEnv, requireSandboxEnv } from '../supabaseTestHarness';

describe('supabaseTestHarness sandbox env gating', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null unless SUPABASE_TEST_CONFIRM_SANDBOX=1 is set', () => {
    process.env.SUPABASE_TEST_URL = 'https://example.supabase.co';
    process.env.SUPABASE_TEST_ANON_KEY = 'anon-key';
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY = 'service-role-key';
    delete process.env.SUPABASE_TEST_CONFIRM_SANDBOX;

    expect(getSandboxEnv()).toBeNull();
  });

  it('throws unless SUPABASE_TEST_CONFIRM_SANDBOX=1 is set', () => {
    process.env.SUPABASE_TEST_URL = 'https://example.supabase.co';
    process.env.SUPABASE_TEST_ANON_KEY = 'anon-key';
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY = 'service-role-key';
    delete process.env.SUPABASE_TEST_CONFIRM_SANDBOX;

    expect(() => requireSandboxEnv()).toThrow(/SUPABASE_TEST_CONFIRM_SANDBOX/);
  });

  it('returns env when all required variables including confirm are set', () => {
    process.env.SUPABASE_TEST_URL = 'https://example.supabase.co';
    process.env.SUPABASE_TEST_ANON_KEY = 'anon-key';
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_TEST_CONFIRM_SANDBOX = '1';

    expect(getSandboxEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
      serviceRoleKey: 'service-role-key',
    });
  });
});

