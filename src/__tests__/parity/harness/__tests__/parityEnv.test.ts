import {
  getParityEnv,
  requireParityEnv,
  isParityConfigured,
} from '../parityEnv';

const FAKE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const FAKE_SERVICE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const ENV_KEYS = [
  'PARITY_TARGET',
  'SUPABASE_TEST_CONFIRM_SANDBOX',
  'SUPABASE_PARITY_OLD_URL',
  'SUPABASE_PARITY_OLD_ANON_KEY',
  'SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY',
  'SUPABASE_PARITY_NEW_URL',
  'SUPABASE_PARITY_NEW_ANON_KEY',
  'SUPABASE_PARITY_NEW_SERVICE_ROLE_KEY',
  'SUPABASE_TEST_URL',
  'SUPABASE_TEST_ANON_KEY',
  'SUPABASE_TEST_SERVICE_ROLE_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
] as const;

describe('parityEnv', () => {
  const snapshot: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
    {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      snapshot[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const previous = snapshot[key];
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it('returns null without confirmation flag', () => {
    process.env.PARITY_TARGET = 'old';
    process.env.SUPABASE_PARITY_OLD_URL = 'https://old.supabase.co';
    process.env.SUPABASE_PARITY_OLD_ANON_KEY = FAKE_ANON;
    process.env.SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY = FAKE_SERVICE;
    delete process.env.SUPABASE_TEST_CONFIRM_SANDBOX;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    expect(getParityEnv()).toBeNull();
    expect(isParityConfigured()).toBe(false);
  });

  it('resolves OLD dedicated vars', () => {
    process.env.PARITY_TARGET = 'old';
    process.env.SUPABASE_TEST_CONFIRM_SANDBOX = '1';
    process.env.SUPABASE_PARITY_OLD_URL = 'https://old.supabase.co';
    process.env.SUPABASE_PARITY_OLD_ANON_KEY = FAKE_ANON;
    process.env.SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY = FAKE_SERVICE;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    expect(requireParityEnv()).toEqual({
      target: 'old',
      url: 'https://old.supabase.co',
      anonKey: FAKE_ANON,
      serviceRoleKey: FAKE_SERVICE,
    });
  });

  it('falls back to SUPABASE_TEST_* for old target', () => {
    process.env.PARITY_TARGET = 'old';
    process.env.SUPABASE_TEST_CONFIRM_SANDBOX = '1';
    delete process.env.SUPABASE_PARITY_OLD_URL;
    delete process.env.SUPABASE_PARITY_OLD_ANON_KEY;
    delete process.env.SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY;
    process.env.SUPABASE_TEST_URL = 'https://test.supabase.co';
    process.env.SUPABASE_TEST_ANON_KEY = FAKE_ANON;
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY = FAKE_SERVICE;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    expect(getParityEnv()?.url).toBe('https://test.supabase.co');
  });

  it('resolves NEW vars', () => {
    process.env.PARITY_TARGET = 'new';
    process.env.SUPABASE_TEST_CONFIRM_SANDBOX = '1';
    process.env.SUPABASE_PARITY_NEW_URL = 'https://new.supabase.co';
    process.env.SUPABASE_PARITY_NEW_ANON_KEY = FAKE_ANON;
    process.env.SUPABASE_PARITY_NEW_SERVICE_ROLE_KEY = FAKE_SERVICE;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    expect(requireParityEnv().target).toBe('new');
    expect(requireParityEnv().url).toBe('https://new.supabase.co');
  });

  it('refuses production URL equality', () => {
    process.env.PARITY_TARGET = 'old';
    process.env.SUPABASE_TEST_CONFIRM_SANDBOX = '1';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://prod.supabase.co';
    process.env.SUPABASE_PARITY_OLD_URL = 'https://prod.supabase.co';
    process.env.SUPABASE_PARITY_OLD_ANON_KEY = FAKE_ANON;
    process.env.SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY = FAKE_SERVICE;

    expect(getParityEnv()).toBeNull();
  });

  it('rejects ellipsis placeholder keys', () => {
    process.env.PARITY_TARGET = 'old';
    process.env.SUPABASE_TEST_CONFIRM_SANDBOX = '1';
    process.env.SUPABASE_PARITY_OLD_URL = 'https://sandbox.supabase.co';
    process.env.SUPABASE_PARITY_OLD_ANON_KEY = 'eyJ…paste-real-anon-jwt…';
    process.env.SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY =
      'eyJ…paste-real-service-role-jwt…';
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    expect(getParityEnv()).toBeNull();
  });
});
