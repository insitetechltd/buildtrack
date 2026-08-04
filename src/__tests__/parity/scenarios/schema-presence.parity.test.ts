import { createParityContext, describeParity } from './_parityTestSetup';
import { recordParityCell, beginParityRunOnce } from '../harness/parityReport';
import {
  probeAnonSelectTasks,
  probeCoreTables,
  probeTableExists,
  probeTaskAssignmentsTable,
  probeTaskColumns,
} from '../ops/schema.ops';

// re-export helper pattern via local setup file - create it
describeParity('Parity S-*: Schema presence', () => {
  beforeAll(() => {
    beginParityRunOnce();
  });

  it('S-01 core tables present', async () => {
    const ctx = createParityContext();
    const tables = await probeCoreTables(ctx.service);
    const missing = Object.entries(tables)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    if (missing.length) {
      recordParityCell('S-01', 'FAIL', { message: `missing: ${missing.join(',')}` });
    } else {
      recordParityCell('S-01', 'PASS');
    }
    expect(missing).toEqual([]);
  });

  it('S-02 task_read_status present', async () => {
    const ctx = createParityContext();
    const exists = await probeTableExists(ctx.service, 'task_read_status');
    recordParityCell('S-02', exists ? 'PASS' : 'FAIL', {
      message: exists ? undefined : 'task_read_status missing',
    });
    expect(exists).toBe(true);
  });

  it('S-03 project_locations present', async () => {
    const ctx = createParityContext();
    const exists = await probeTableExists(ctx.service, 'project_locations');
    recordParityCell('S-03', exists ? 'PASS' : 'FAIL');
    expect(exists).toBe(true);
  });

  it('S-04 roles optional', async () => {
    const ctx = createParityContext();
    const exists = await probeTableExists(ctx.service, 'roles');
    recordParityCell('S-04', exists ? 'PASS' : 'SKIP', {
      message: exists ? 'roles present' : 'roles absent — SKIP allowed',
    });
    expect(typeof exists).toBe('boolean');
  });

  it('S-05 redesign or assignments surface', async () => {
    const ctx = createParityContext();
    const cols = await probeTaskColumns(ctx.service);
    const hasAssignments = await probeTaskAssignmentsTable(ctx.service);
    const ok =
      cols.hasAssignedToArray ||
      cols.hasPrimaryAssignee ||
      hasAssignments ||
      cols.hasTags;

    recordParityCell('S-05', ok ? 'PASS' : 'FAIL', {
      message: JSON.stringify({ ...cols, hasAssignments }),
    });
    expect(ok).toBe(true);
  });

  it('S-06 anon SELECT on tasks (DELTA-SEC on new)', async () => {
    const ctx = createParityContext();
    const probe = await probeAnonSelectTasks(ctx.anon);

    if (ctx.target === 'old') {
      recordParityCell('S-06', 'PASS', {
        message: probe.allowed
          ? 'OLD allows anon read (baseline / known risk)'
          : 'OLD denies anon read',
      });
      expect(typeof probe.allowed).toBe('boolean');
      return;
    }

    if (probe.allowed) {
      recordParityCell('S-06', 'FAIL', {
        message: 'NEW must deny anon SELECT (DELTA-SEC)',
      });
      expect(probe.allowed).toBe(false);
    } else {
      recordParityCell('S-06', 'DELTA', {
        message: 'DELTA-SEC: anon SELECT denied on NEW',
      });
      expect(probe.allowed).toBe(false);
    }
  });

  it('S-07 records RLS inventory note', async () => {
    // PostgREST cannot read pg_policies; record inventory as SKIP with guidance
    recordParityCell('S-07', 'SKIP', {
      message: 'Run SUPABASE_OPERATIONS_RUNBOOK pg_policies query via psql',
    });
    expect(true).toBe(true);
  });
});
