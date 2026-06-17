import { describeSandbox, createSandboxContext, ensureTestCompanyId, buildUniqueEmail } from './sandboxHelpers';
import { cleanupIfAllowed } from '@/test-utils/supabaseTestHarness';

describeSandbox('Scenario D (Supabase): Auth & user profile convergence', () => {
  jest.setTimeout(120_000);

  it('creates auth user and confirms public.users record matches auth ID', async () => {
    const ctx = createSandboxContext();
    const companyId = await ensureTestCompanyId(ctx);
    const email = buildUniqueEmail('convergence');
    const password = `SimPass-${Math.floor(Math.random() * 1_000_000)}!`;
    const phone = `${Math.floor(10000000 + Math.random() * 89999999)}`;
    const name = `Sim Converge ${Date.now()}`;

    const created = await (ctx.service.auth.admin as any).createUser({
      email,
      password,
      email_confirm: true,
    });

    if (created.error) {
      throw created.error;
    }

    const userId = created.data.user.id as string;

    try {
      const signIn = await ctx.anon.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        throw signIn.error;
      }

      const profileUpdate = await ctx.anon
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

      if (profileUpdate.error) {
        throw profileUpdate.error;
      }

      const authUser = await (ctx.service.auth.admin as any).getUserById(userId);
      if (authUser.error) {
        throw authUser.error;
      }

      const profile = await ctx.service
        .from('users')
        .select('id,email,phone,name,company_id,role')
        .eq('id', userId)
        .single();
      if (profile.error) {
        throw profile.error;
      }

      expect(authUser.data.user.id).toBe(profile.data.id);
      expect(authUser.data.user.email).toBe(profile.data.email);
      expect(profile.data.name).toBe(name);
      expect(profile.data.phone).toBe(phone);
      expect(profile.data.company_id).toBe(companyId);
      expect(profile.data.role).toBe('worker');
    } finally {
      await cleanupIfAllowed(async () => {
        await ctx.service.from('users').delete().eq('id', userId);
        await (ctx.service.auth.admin as any).deleteUser(userId);
      });
    }
  });
});
