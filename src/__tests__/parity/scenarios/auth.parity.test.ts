import { createParityContext, describeParity } from './_parityTestSetup';
import {
  cleanupParityFixture,
  seedParityFixture,
  type ParitySeed,
} from '../harness/paritySeed';
import { recordParityCell, beginParityRunOnce } from '../harness/parityReport';
import {
  approvePendingUser,
  changePassword,
  fetchPublicUser,
  findAuthOrphans,
  rejectPendingUser,
  signInAs,
  signOut,
  updatePublicUserName,
} from '../ops/auth.ops';
import { PARITY_PASSWORD } from '../harness/paritySeed';

describeParity('Parity A-*: Auth & profile', () => {
  let seed: ParitySeed;

  beforeAll(async () => {
    beginParityRunOnce();
    const ctx = createParityContext();
    seed = await seedParityFixture(ctx);
  });

  afterAll(async () => {
    const ctx = createParityContext();
    await cleanupParityFixture(ctx, seed);
  });

  it('A-01 Tristan login email/password', async () => {
    const ctx = createParityContext();
    const session = await signInAs(ctx.anon, seed.users.tristan);
    const profile = await fetchPublicUser(ctx.service, session.userId);
    await signOut(ctx.anon);

    const ok = Boolean(profile && profile.email === seed.users.tristan.email);
    recordParityCell('A-01', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('A-02 phone-mapped login', async () => {
    const ctx = createParityContext();
    const { data: byPhone, error } = await ctx.service
      .from('users')
      .select('email')
      .eq('phone', seed.users.herman.phone)
      .maybeSingle();

    if (error || !byPhone?.email) {
      recordParityCell('A-02', 'FAIL', { message: 'phone lookup failed' });
      throw error || new Error('phone lookup failed');
    }

    const session = await signInAs(ctx.anon, {
      email: String(byPhone.email),
      password: seed.users.herman.password,
    });
    await signOut(ctx.anon);
    recordParityCell('A-02', 'PASS');
    expect(session.userId).toBe(seed.users.herman.id);
  });

  it('A-03 Pending login blocked or flagged', async () => {
    const ctx = createParityContext();
    const session = await signInAs(ctx.anon, seed.users.pending);
    const profile = await fetchPublicUser(ctx.service, session.userId);
    await signOut(ctx.anon);

    const pending = Boolean(profile?.is_pending);
    recordParityCell('A-03', pending ? 'PASS' : 'FAIL', {
      message: pending ? 'is_pending=true after login' : 'pending flag missing',
    });
    expect(pending).toBe(true);
  });

  it('A-04 session restore cold', async () => {
    const ctx = createParityContext();
    await signInAs(ctx.anon, seed.users.tristan);
    const restored = await ctx.anon.auth.getSession();
    const ok = Boolean(restored.data.session?.user?.id === seed.users.tristan.id);
    await signOut(ctx.anon);

    recordParityCell('A-04', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('A-05 change password', async () => {
    const ctx = createParityContext();
    const next = `${PARITY_PASSWORD}-rotated`;
    await changePassword(
      ctx.anon,
      seed.users.tristan.email,
      seed.users.tristan.password,
      next,
    );

    await expect(
      signInAs(ctx.anon, {
        email: seed.users.tristan.email,
        password: PARITY_PASSWORD,
      }),
    ).rejects.toBeTruthy();

    const session = await signInAs(ctx.anon, {
      email: seed.users.tristan.email,
      password: next,
    });

    // rotate back for other tests
    await changePassword(ctx.anon, seed.users.tristan.email, next, PARITY_PASSWORD);
    seed.users.tristan.password = PARITY_PASSWORD;
    await signOut(ctx.anon);

    recordParityCell('A-05', 'PASS');
    expect(session.userId).toBe(seed.users.tristan.id);
  });

  it('A-06 update profile name', async () => {
    const ctx = createParityContext();
    const newName = `Parity Tristan Updated ${seed.runId}`;
    await updatePublicUserName(ctx.service, seed.users.tristan.id, newName);
    const profile = await fetchPublicUser(ctx.service, seed.users.tristan.id);
    const ok = profile?.name === newName;
    recordParityCell('A-06', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('A-07 auth↔users sync smoke', async () => {
    const ctx = createParityContext();
    const orphans = await findAuthOrphans(ctx.service);
    // Fixture users must not be orphans; ignore unrelated sandbox orphans by checking our IDs
    const ourIds = new Set(Object.values(seed.users).map((u) => u.id));
    const badAuth = orphans.authMissingProfile.filter((id) => ourIds.has(id));
    const badProfile = orphans.profileMissingAuth.filter((id) => ourIds.has(id));
    const ok = badAuth.length === 0 && badProfile.length === 0;
    recordParityCell('A-07', ok ? 'PASS' : 'FAIL', {
      message: JSON.stringify({ badAuth, badProfile }),
    });
    expect(ok).toBe(true);
  });

  it('A-08 Admin approve Pending', async () => {
    const ctx = createParityContext();
    await approvePendingUser(ctx.service, seed.users.pending.id, seed.users.admin.id);
    const profile = await fetchPublicUser(ctx.service, seed.users.pending.id);
    const ok = profile?.is_pending === false;
    recordParityCell('A-08', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('A-09 Admin reject Pending', async () => {
    const ctx = createParityContext();
    // Re-flag as pending-like user already approved — create another reject target
    // Reject the existing pending user record + auth
    await rejectPendingUser(ctx.service, seed.users.pending.id);
    const profile = await fetchPublicUser(ctx.service, seed.users.pending.id);
    const ok = profile == null;
    recordParityCell('A-09', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });
});
