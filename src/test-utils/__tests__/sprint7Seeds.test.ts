import { getResponsibilityToken, isTaskOverdue } from '@/utils/accountabilityEngine';
import {
  applySprint7OverdueCrunchScenario,
  applySprint7RejectionLoopScenario,
  createSprint7SeedDataset,
  getSprint7IsolationWallView,
  SPRINT7_SCENARIO_TASK_IDS,
} from '../sprint7Seeds';

describe('Sprint 7 seed dataset', () => {
  it('creates the canonical Tristan/Herman dataset with exactly five tasks', () => {
    const seed = createSprint7SeedDataset(new Date('2026-06-18T12:00:00.000Z'));

    expect(seed.users.map((user) => user.name)).toEqual(['Tristan', 'Herman']);
    expect(seed.projects).toHaveLength(2);
    expect(seed.tasks).toHaveLength(5);
    expect(seed.primaryProjectId).toBeTruthy();
    expect(seed.privateProjectId).toBeTruthy();
  });

  it('routes the rejection loop task to ACTION_REQUIRED for Tristan and VOID_ARCHIVED for Herman', () => {
    const seed = applySprint7RejectionLoopScenario(
      createSprint7SeedDataset(new Date('2026-06-18T12:00:00.000Z')),
      new Date('2026-06-18T12:30:00.000Z'),
    );
    const task = seed.tasks.find((candidate) => candidate.id === SPRINT7_SCENARIO_TASK_IDS.rejectionLoop);

    expect(task?.status).toBe('declined');
    expect(task?.declinedReason).toContain('Declined by Tristan');
    expect(getResponsibilityToken(task!, seed.actors.tristan.id)).toBe('ACTION_REQUIRED');
    expect(getResponsibilityToken(task!, seed.actors.herman.id)).toBe('VOID_ARCHIVED');
  });

  it('forces submitted work overdue while preserving awaiting approval accountability', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-21T09:00:00.000Z'));

    const seed = applySprint7OverdueCrunchScenario(
      createSprint7SeedDataset(new Date('2026-06-18T12:00:00.000Z')),
      new Date('2026-06-21T09:00:00.000Z'),
    );
    const task = seed.tasks.find((candidate) => candidate.id === SPRINT7_SCENARIO_TASK_IDS.overdueReview);

    expect(task?.status).toBe('submitted_for_review');
    expect(getResponsibilityToken(task!, seed.actors.tristan.id)).toBe('AWAITING_APPROVAL');
    expect(isTaskOverdue(task!)).toBe(true);

    jest.useRealTimers();
  });

  it("builds Herman's isolation view without Tristan-only project metrics", () => {
    const seed = createSprint7SeedDataset(new Date('2026-06-18T12:00:00.000Z'));
    const view = getSprint7IsolationWallView(seed, 'herman');

    expect(view.visibleProjects.map((project) => project.id)).toEqual([seed.primaryProjectId]);
    expect(view.visibleTasks.every((task) => task.projectId === seed.primaryProjectId)).toBe(true);
    expect(view.hiddenProjectIds).toEqual([seed.privateProjectId]);
  });
});
