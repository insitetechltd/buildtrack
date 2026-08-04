import { createParityContext, describeParity } from './_parityTestSetup';
import {
  cleanupParityFixture,
  seedParityFixture,
  type ParitySeed,
} from '../harness/paritySeed';
import { recordParityCell, beginParityRunOnce } from '../harness/parityReport';
import { writeGoldenSnapshot } from '../harness/goldenArtifacts';
import { toCanonicalTask } from '../harness/parityAssert';
import {
  acceptTask,
  acceptTaskCompletion,
  addAssignerComment,
  addTaskUpdate,
  archiveTask,
  assignTask,
  cancelTask,
  createTask,
  declineTask,
  fetchTaskById,
  fetchTasksByProject,
  rejectTaskCompletion,
  softDeleteTask,
  submitTaskForReview,
  updateTaskMetadata,
} from '../ops/tasks.lifecycle.ops';
import {
  createSubTask,
  deleteSubTask,
  fetchSubTask,
  updateSubTaskStatus,
} from '../ops/tasks.subtasks.ops';

describeParity('Parity T/U/L-*: Task lifecycle', () => {
  let seed: ParitySeed;
  let lifecycleTaskId = '';

  beforeAll(async () => {
    beginParityRunOnce();
    const ctx = createParityContext();
    seed = await seedParityFixture(ctx);
  });

  afterAll(async () => {
    const ctx = createParityContext();
    await cleanupParityFixture(ctx, seed);
    if (lifecycleTaskId) {
      try {
        const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
        writeGoldenSnapshot('T-lifecycle-canonical', toCanonicalTask(task));
      } catch {
        // Task may already be soft-deleted; skip snapshot.
      }
    }
  });

  it('T-01 createTask on Harbor', async () => {
    const ctx = createParityContext();
    lifecycleTaskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity lifecycle ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
      locationOnSite: 'Level 12 Corridor',
    });
    seed.taskIds.lifecycle = lifecycleTaskId;
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const ok = task.status === 'new' && task.projectId === seed.projects.harborId;
    recordParityCell('T-01', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-02 Herman acceptTask', async () => {
    const ctx = createParityContext();
    await acceptTask(ctx.service, {
      taskId: lifecycleTaskId,
      userId: seed.users.herman.id,
      target: ctx.target,
    });
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const ok = task.status === 'in_progress' || task.status === 'accepted';
    recordParityCell('T-02', ok ? 'PASS' : 'FAIL', { message: `status=${task.status}` });
    expect(ok).toBe(true);
  });

  it('T-03 decline path on secondary task', async () => {
    const ctx = createParityContext();
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity decline ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    seed.taskIds.secondary = taskId;
    await declineTask(ctx.service, {
      taskId,
      userId: seed.users.herman.id,
      reason: 'Conflict on site',
      target: ctx.target,
    });
    const task = await fetchTaskById(ctx.service, taskId, ctx.target);
    const ok = task.status === 'declined';
    recordParityCell('T-03', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-04 addTaskUpdate progress', async () => {
    const ctx = createParityContext();
    await addTaskUpdate(ctx.service, {
      taskId: lifecycleTaskId,
      userId: seed.users.herman.id,
      description: 'Progress with photos',
      completionPercentage: 40,
      photos: ['https://example.test/photo-1.jpg'],
    });
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const ok =
      task.completionPercentage === 40 &&
      (task.activities || []).some((a) => a.activityType === 'progress_update');
    recordParityCell('T-04', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-05 submitTaskForReview', async () => {
    const ctx = createParityContext();
    await submitTaskForReview(ctx.service, {
      taskId: lifecycleTaskId,
      userId: seed.users.herman.id,
      target: ctx.target,
    });
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const ok = task.status === 'submitted_for_review';
    recordParityCell('T-05', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-06 acceptTaskCompletion', async () => {
    const ctx = createParityContext();
    // recreate path: use secondary approved flow on a fresh task
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity approve ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    await acceptTask(ctx.service, {
      taskId,
      userId: seed.users.herman.id,
      target: ctx.target,
    });
    await submitTaskForReview(ctx.service, {
      taskId,
      userId: seed.users.herman.id,
      target: ctx.target,
    });
    await acceptTaskCompletion(ctx.service, {
      taskId,
      userId: seed.users.tristan.id,
      target: ctx.target,
    });
    const task = await fetchTaskById(ctx.service, taskId, ctx.target);
    const ok = task.status === 'approved';
    recordParityCell('T-06', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-07 rejectTaskCompletion', async () => {
    const ctx = createParityContext();
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity reject ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    await acceptTask(ctx.service, {
      taskId,
      userId: seed.users.herman.id,
      target: ctx.target,
    });
    await submitTaskForReview(ctx.service, {
      taskId,
      userId: seed.users.herman.id,
      target: ctx.target,
    });
    await rejectTaskCompletion(ctx.service, {
      taskId,
      userId: seed.users.tristan.id,
      reason: 'Incomplete firestop',
      target: ctx.target,
    });
    const task = await fetchTaskById(ctx.service, taskId, ctx.target);
    const ok = task.status === 'rejected';
    recordParityCell('T-07', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-08 reassign/assignTask', async () => {
    const ctx = createParityContext();
    await assignTask(ctx.service, {
      taskId: lifecycleTaskId,
      actorId: seed.users.tristan.id,
      assigneeIds: [seed.users.tristan.id],
      target: ctx.target,
    });
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const ok = task.assignedTo.includes(seed.users.tristan.id);
    recordParityCell('T-08', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-09 cancelTask', async () => {
    const ctx = createParityContext();
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity cancel ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    await cancelTask(ctx.service, {
      taskId,
      userId: seed.users.tristan.id,
      target: ctx.target,
    });
    const task = await fetchTaskById(ctx.service, taskId, ctx.target);
    const ok = task.status === 'cancelled' || Boolean(task.cancelledAt);
    recordParityCell('T-09', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-10 archiveTask', async () => {
    const ctx = createParityContext();
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity archive ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    await archiveTask(ctx.service, {
      taskId,
      userId: seed.users.tristan.id,
    });
    const task = await fetchTaskById(ctx.service, taskId, ctx.target);
    const ok = Boolean(task.archivedAt);
    recordParityCell('T-10', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-11 soft delete hidden from active lists', async () => {
    const ctx = createParityContext();
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity delete ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    await softDeleteTask(ctx.service, {
      taskId,
      userId: seed.users.tristan.id,
    });
    const active = await fetchTasksByProject(
      ctx.service,
      seed.projects.harborId,
      ctx.target,
    );
    const ok = !active.some((t) => t.id === taskId);
    recordParityCell('T-11', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-12 updateTask metadata', async () => {
    const ctx = createParityContext();
    await updateTaskMetadata(ctx.service, {
      taskId: lifecycleTaskId,
      title: `Parity renamed ${seed.runId}`,
      tags: ['parity', 'harbor'],
      billingStatus: 'billable',
    });
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const ok = task.title.includes('Parity renamed');
    recordParityCell('T-12', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('T-13 Herman createTask allowed', async () => {
    const ctx = createParityContext();
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity herman-create ${seed.runId}`,
      assignedBy: seed.users.herman.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    recordParityCell('T-13', taskId ? 'PASS' : 'FAIL');
    expect(taskId).toBeTruthy();
  });

  it('T-14 Admin createTask (record OLD allow)', async () => {
    const ctx = createParityContext();
    const taskId = await createTask(ctx.service, {
      projectId: seed.projects.harborId,
      title: `Parity admin-create ${seed.runId}`,
      assignedBy: seed.users.admin.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    // Service-role path always allows; documents DB capability. App UI may still block.
    recordParityCell('T-14', taskId ? 'PASS' : 'FAIL', {
      message: 'DB write allowed via service seed path; UI may still block admin',
    });
    expect(taskId).toBeTruthy();
  });

  it('L-01 fetchTaskById activities chronological', async () => {
    const ctx = createParityContext();
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const stamps = (task.activities || []).map((a) => a.timestamp);
    const sorted = [...stamps].sort();
    const ok = stamps.join('|') === sorted.join('|');
    recordParityCell('L-01', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('L-02 fetchTasksByProject scopes activities', async () => {
    const ctx = createParityContext();
    const tasks = await fetchTasksByProject(
      ctx.service,
      seed.projects.harborId,
      ctx.target,
    );
    const ok = tasks.every((t) =>
      (t.activities || []).every((a) => a.taskId === t.id),
    );
    recordParityCell('L-02', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('L-04 addAssignerComment', async () => {
    const ctx = createParityContext();
    await addAssignerComment(ctx.service, {
      taskId: lifecycleTaskId,
      userId: seed.users.tristan.id,
      comment: 'Please add photos of joints',
    });
    const task = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const ok = (task.activities || []).some(
      (a) =>
        a.activityType === 'assigner_comment' ||
        a.activityType === 'comment' ||
        (a.description || '').includes('photos'),
    );
    recordParityCell('L-04', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);
  });

  it('U-01 createSubTask nested fields', async () => {
    const ctx = createParityContext();
    const parent = await fetchTaskById(ctx.service, lifecycleTaskId, ctx.target);
    const subId = await createSubTask(ctx.service, {
      parentTask: parent,
      title: `Parity subtask ${seed.runId}`,
      assignedBy: seed.users.tristan.id,
      assigneeIds: [seed.users.herman.id],
      target: ctx.target,
    });
    const sub = await fetchSubTask(ctx.service, subId, ctx.target);
    const ok =
      sub.parentTaskId === parent.id && Number(sub.nestingLevel || 0) >= 1;
    recordParityCell('U-01', ok ? 'PASS' : 'FAIL');
    expect(ok).toBe(true);

    await updateSubTaskStatus(ctx.service, {
      taskId: subId,
      status: 'in_progress',
      target: ctx.target,
    });
    const updated = await fetchSubTask(ctx.service, subId, ctx.target);
    recordParityCell('U-02', updated.status === 'in_progress' ? 'PASS' : 'FAIL');
    expect(updated.status).toBe('in_progress');

    await deleteSubTask(ctx.service, {
      taskId: subId,
      userId: seed.users.tristan.id,
    });
    const deleted = await fetchSubTask(ctx.service, subId, ctx.target);
    recordParityCell('U-04', deleted.deletedAt ? 'PASS' : 'FAIL');
    expect(deleted.deletedAt).toBeTruthy();
  });
});
