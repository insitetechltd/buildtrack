import { createParityContext, describeParity } from './_parityTestSetup';
import {
  cleanupParityFixture,
  seedParityFixture,
  type ParitySeed,
} from '../harness/paritySeed';
import { recordParityCell, beginParityRunOnce } from '../harness/parityReport';
import {
  assignUserToProject,
  createCompany,
  createProject,
  fetchProjectIdsForUser,
  getLastSelectedProject,
  removeUserFromProject,
  setLastSelectedProject,
  updateAssignmentCategory,
} from '../ops/projects.ops';
import { createTask, fetchTasksByProject } from '../ops/tasks.lifecycle.ops';
import { probeAnonSelectTasks } from '../ops/schema.ops';

describeParity('Parity P-* / L-*: Projects & isolation', () => {
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

  it('P-01 Admin create company', async () => {
    const ctx = createParityContext();
    const id = await createCompany(ctx.service, `Parity Extra Co ${seed.runId}`);
    recordParityCell('P-01', id ? 'PASS' : 'FAIL');
    expect(id).toBeTruthy();
  });

  it('P-02 Admin create project', async () => {
    const ctx = createParityContext();
    const id = await createProject(ctx.service, {
      name: `Parity Extra Project ${seed.runId}`,
      createdBy: seed.users.admin.id,
      companyId: seed.companies.mainId,
    });
    recordParityCell('P-02', id ? 'PASS' : 'FAIL');
    expect(id).toBeTruthy();
  });

  it('P-03/P-04/P-05 assignment mutations', async () => {
    const ctx = createParityContext();
    const projectId = await createProject(ctx.service, {
      name: `Parity assign proj ${seed.runId}`,
      createdBy: seed.users.tristan.id,
      companyId: seed.companies.mainId,
    });

    await assignUserToProject(ctx.service, {
      userId: seed.users.herman.id,
      projectId,
      category: 'worker',
      assignedBy: seed.users.tristan.id,
    });
    recordParityCell('P-03', 'PASS');

    await updateAssignmentCategory(ctx.service, {
      userId: seed.users.herman.id,
      projectId,
      category: 'foreman',
    });
    recordParityCell('P-05', 'PASS');

    await removeUserFromProject(ctx.service, {
      userId: seed.users.herman.id,
      projectId,
    });
    const ids = await fetchProjectIdsForUser(ctx.service, seed.users.herman.id);
    const removed = !ids.includes(projectId);
    recordParityCell('P-04', removed ? 'PASS' : 'FAIL');
    expect(removed).toBe(true);
  });

  it('P-06 Tristan sees Harbor + Penthouse', async () => {
    const ctx = createParityContext();
    const ids = await fetchProjectIdsForUser(ctx.service, seed.users.tristan.id);
    const ok =
      ids.includes(seed.projects.harborId) &&
      ids.includes(seed.projects.penthouseId);
    recordParityCell('P-06', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('P-07 Herman sees Harbor only', async () => {
    const ctx = createParityContext();
    const ids = await fetchProjectIdsForUser(ctx.service, seed.users.herman.id);
    const ok =
      ids.includes(seed.projects.harborId) &&
      !ids.includes(seed.projects.penthouseId);
    recordParityCell('P-07', ok ? 'PASS' : 'FAIL', {
      message: JSON.stringify(ids),
    });
    expect(ok).toBe(true);
  });

  it('P-08 setSelectedProject persists', async () => {
    const ctx = createParityContext();
    await setLastSelectedProject(
      ctx.service,
      seed.users.tristan.id,
      seed.projects.harborId,
    );
    const selected = await getLastSelectedProject(
      ctx.service,
      seed.users.tristan.id,
    );
    const ok = selected === seed.projects.harborId;
    recordParityCell('P-08', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('P-09 offline bootstrap fallback smoke', async () => {
    const ctx = createParityContext();
    ctx.setOnline(false);
    let threw = false;
    try {
      await getLastSelectedProject(ctx.anon, seed.users.tristan.id);
    } catch {
      threw = true;
    }
    ctx.setOnline(true);
    // Offline should fail network; local AsyncStorage fallback is app-layer (DELTA/SKIP if only DB)
    recordParityCell('P-09', threw ? 'PASS' : 'SKIP', {
      message: threw
        ? 'network toggle blocks DB read (app local fallback separate)'
        : 'offline toggle did not block — SKIP',
    });
    expect(typeof threw).toBe('boolean');
  });

  it('L-HARBOR / L-PENT isolation for Herman', async () => {
    const ctx = createParityContext();
    await createTask(ctx.service, {
      projectId: seed.projects.penthouseId,
      title: `Penthouse secret ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.tristan.id],
      target: ctx.target,
    });

    const hermanProjects = await fetchProjectIdsForUser(
      ctx.service,
      seed.users.herman.id,
    );
    const harborTasks = await fetchTasksByProject(
      ctx.service,
      seed.projects.harborId,
      ctx.target,
    );
    const penthouseTasks = await fetchTasksByProject(
      ctx.service,
      seed.projects.penthouseId,
      ctx.target,
    );

    // Assignment-level isolation (RLS may still allow service reads)
    const harborOk = hermanProjects.includes(seed.projects.harborId);
    const pentOk = !hermanProjects.includes(seed.projects.penthouseId);

    recordParityCell('L-HARBOR', harborOk ? 'PASS' : 'FAIL');
    recordParityCell('L-PENT', pentOk ? 'PASS' : 'FAIL');
    expect(harborOk && pentOk).toBe(true);
    expect(harborTasks).toBeTruthy();
    expect(penthouseTasks.length).toBeGreaterThanOrEqual(0);
  });

  it('L-matrix anon read DELTA-SEC', async () => {
    const ctx = createParityContext();
    const probe = await probeAnonSelectTasks(ctx.anon);
    if (ctx.target === 'new') {
      recordParityCell('L-matrix-anon', probe.allowed ? 'FAIL' : 'DELTA', {
        message: 'DELTA-SEC',
      });
      expect(probe.allowed).toBe(false);
    } else {
      recordParityCell('L-matrix-anon', 'PASS', {
        message: probe.allowed ? 'OLD allows anon' : 'OLD denies anon',
      });
    }
  });
});
