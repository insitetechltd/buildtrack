import {
  cleanupTestUser,
  createSandboxContext,
  describeSandbox,
  provisionTestUser,
} from './sandboxHelpers';
import { createSandboxAnonClient, cleanupIfAllowed } from '@/test-utils/supabaseTestHarness';

describeSandbox('Scenario A (Supabase): Session resiliency with offline restore', () => {
  jest.setTimeout(120_000);

  it('restores an existing session from storage while offline', async () => {
    const ctx = createSandboxContext();
    const user = await provisionTestUser(ctx);

    try {
      const signIn = await ctx.anon.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      if (signIn.error) {
        throw signIn.error;
      }

      expect(signIn.data.session?.user?.id).toBe(user.id);

      ctx.setOnline(false);

      const offlineClient = createSandboxAnonClient({
        fetch: ctx.fetch,
        storage: ctx.storage,
      });

      const restored = await offlineClient.auth.getSession();
      expect(restored.data.session?.user?.id).toBe(user.id);

      ctx.setOnline(true);
      const refreshedUser = await offlineClient.auth.getUser();
      expect(refreshedUser.data.user?.id).toBe(user.id);

      await cleanupIfAllowed(async () => {
        await offlineClient.auth.signOut();
      });
    } finally {
      await cleanupTestUser(ctx, user);
    }
  });
});
