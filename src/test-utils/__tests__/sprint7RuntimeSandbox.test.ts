import { useAuthStore } from '@/state/authStore';
import { useCompanyStore } from '@/state/companyStore';
import { useProjectFilterStore } from '@/state/projectFilterStore';
import { useProjectStore } from '@/state/projectStore.supabase';
import { useTaskStore } from '@/state/taskStore.supabase';
import { useUserStore } from '@/state/userStore.supabase';
import {
  initializeSprint7RuntimeSandbox,
  loadScenarioAPreset,
  loadScenarioBPreset,
  loadScenarioCPreset,
  resetSprint7RuntimeSandbox,
  switchSprint7RuntimeSandboxActor,
} from '../sprint7RuntimeSandbox';
import { SPRINT7_PROJECT_IDS, SPRINT7_SCENARIO_TASK_IDS } from '../sprint7Seeds';
import { getResponsibilityToken, isTaskOverdue } from '@/utils/accountabilityEngine';

describe('Sprint 7 runtime sandbox', () => {
  afterEach(async () => {
    await resetSprint7RuntimeSandbox();
  });

  it('hydrates all runtime stores for Tristan using the canonical dataset', async () => {
    await initializeSprint7RuntimeSandbox({
      activeActor: 'tristan',
      now: new Date('2026-06-18T12:00:00.000Z'),
    });

    expect(useAuthStore.getState().user?.name).toBe('Tristan');
    expect(useCompanyStore.getState().companies).toHaveLength(2);
    expect(useUserStore.getState().users).toHaveLength(2);
    expect(useProjectStore.getState().projects).toHaveLength(2);
    expect(useTaskStore.getState().tasks).toHaveLength(5);
    expect(useProjectStore.getState().getProjectsByUser(useAuthStore.getState().user!.id)).toHaveLength(2);
    expect(useProjectFilterStore.getState().selectedProjectId).toBeNull();
  });

  it('switches to Herman without dropping the hydrated task and project state', async () => {
    await initializeSprint7RuntimeSandbox({
      activeActor: 'tristan',
      now: new Date('2026-06-18T12:00:00.000Z'),
    });

    await switchSprint7RuntimeSandboxActor('herman');

    const authUser = useAuthStore.getState().user;
    expect(authUser?.name).toBe('Herman');
    expect(useTaskStore.getState().tasks).toHaveLength(5);
    expect(useProjectStore.getState().getProjectsByUser(authUser!.id)).toHaveLength(1);
    expect(useProjectFilterStore.getState().selectedProjectId).toBe(
      useProjectStore.getState().getProjectsByUser(authUser!.id)[0]?.id,
    );
  });

  it('loads Scenario A directly into the rejection loop state for Tristan', async () => {
    const dataset = await loadScenarioAPreset(new Date('2026-06-18T12:30:00.000Z'));
    const task = useTaskStore
      .getState()
      .tasks.find((candidate) => candidate.id === SPRINT7_SCENARIO_TASK_IDS.rejectionLoop);

    expect(useAuthStore.getState().user?.name).toBe('Tristan');
    expect(task?.status).toBe('declined');
    expect(getResponsibilityToken(task!, dataset.actors.tristan.id)).toBe('ACTION_REQUIRED');
    expect(getResponsibilityToken(task!, dataset.actors.herman.id)).toBe('VOID_ARCHIVED');
  });

  it('loads Scenario B directly into an overdue review state for Tristan', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-21T09:00:00.000Z'));

    await loadScenarioBPreset(new Date('2026-06-21T09:00:00.000Z'));
    const task = useTaskStore
      .getState()
      .tasks.find((candidate) => candidate.id === SPRINT7_SCENARIO_TASK_IDS.overdueReview);

    expect(useAuthStore.getState().user?.name).toBe('Tristan');
    expect(task?.status).toBe('submitted_for_review');
    expect(isTaskOverdue(task!)).toBe(true);

    jest.useRealTimers();
  });

  it('loads Scenario C directly into Herman isolation mode', async () => {
    await loadScenarioCPreset(new Date('2026-06-18T12:00:00.000Z'));

    const authUser = useAuthStore.getState().user;
    const visibleProjects = useProjectStore.getState().getProjectsByUser(authUser!.id);

    expect(authUser?.name).toBe('Herman');
    expect(visibleProjects).toHaveLength(1);
    expect(visibleProjects[0]?.id).toBe(SPRINT7_PROJECT_IDS.shared);
    expect(useProjectFilterStore.getState().selectedProjectId).toBe(SPRINT7_PROJECT_IDS.shared);
  });
});
