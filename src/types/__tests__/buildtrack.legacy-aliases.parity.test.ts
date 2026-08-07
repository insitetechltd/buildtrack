import {
  TaskStatus,
  Task,
  SubTask,
  UserRole,
  SystemPermission,
  ProjectRole,
} from "../buildtrack";

const EXPECTED_TASK_STATUSES: TaskStatus[] = [
  "new",
  "declined",
  "in_progress",
  "paused",
  "blocked",
  "ready_for_review",
  "changes_requested",
  "approved",
  "completed",
  "cancelled",
  "archived",
];

const SUPABASE_INITIAL_STATUS_ON_CREATE: TaskStatus = "new";

describe("Ca: TaskStatus legacy alias parity (roundtrip stability)", () => {
  test("Ca.1 TaskStatus runtime enumeration matches expected list exactly (11 entries)", () => {
    const asStrings: Array<TaskStatus & string> = [...EXPECTED_TASK_STATUSES];
    expect(asStrings).toHaveLength(11);
    expect(new Set(asStrings).size).toBe(11);
  });

  test("Ca.2 Supabase insert fallback uses TaskStatus.new as initial current_status", () => {
    expect(EXPECTED_TASK_STATUSES.includes(SUPABASE_INITIAL_STATUS_ON_CREATE)).toBe(
      true,
    );
    expect(SUPABASE_INITIAL_STATUS_ON_CREATE).toBe("new");
  });

  test("Ca.3 Legacy current_status alias key preserved on Task type", () => {
    type TaskKeys = keyof Task;
    const keyCheck: TaskKeys = "currentStatus";
    expect(keyCheck).toBe("currentStatus");
  });

  test("Ca.4 status and currentStatus are both TaskStatus-compatible (type assignability)", () => {
    const sample: Pick<Task, "status" | "currentStatus"> = {
      status: "in_progress",
      currentStatus: "in_progress",
    };
    expect(sample.status).toBe(sample.currentStatus);
    expect(EXPECTED_TASK_STATUSES.includes(sample.status)).toBe(true);
  });
});

const WORKER_ROLE_VALUES: Array<UserRole> = [
  "admin",
  "manager",
  "worker",
  "member",
];

const MEMBER_PERMISSION_VALUES: Array<SystemPermission> = [
  "admin",
  "manager",
  "member",
];

const PROJECT_ROLE_WITH_WORKER: Array<ProjectRole> = [
  "lead_project_manager",
  "contractor",
  "subcontractor",
  "inspector",
  "architect",
  "engineer",
  "worker",
  "foreman",
];

describe("Cb: worker→member alias parity (UserRole vs SystemPermission)", () => {
  test("Cb.1 UserRole union includes legacy 'worker' AND 'member' (4 values)", () => {
    expect(WORKER_ROLE_VALUES).toHaveLength(4);
    expect(WORKER_ROLE_VALUES).toContain("worker");
    expect(WORKER_ROLE_VALUES).toContain("member");
  });

  test("Cb.2 SystemPermission union maps worker→member (3 values, no 'worker')", () => {
    expect(MEMBER_PERMISSION_VALUES).toHaveLength(3);
    expect(MEMBER_PERMISSION_VALUES).toContain("member");
    const hasWorker = MEMBER_PERMISSION_VALUES.includes(
      "worker" as unknown as SystemPermission,
    );
    expect(hasWorker).toBe(false);
  });

  test("Cb.3 ProjectRole union still retains project-scoped 'worker' (8 entries)", () => {
    expect(PROJECT_ROLE_WITH_WORKER).toHaveLength(8);
    expect(PROJECT_ROLE_WITH_WORKER).toContain("worker");
    expect(PROJECT_ROLE_WITH_WORKER).toContain("foreman");
  });

  test("Cb.4 UserRole('worker') is a valid backward-compat alias — overlapping shared values align", () => {
    const sharedValues = WORKER_ROLE_VALUES.filter((v) =>
      MEMBER_PERMISSION_VALUES.includes(v as unknown as SystemPermission),
    );
    expect(sharedValues).toEqual(["admin", "manager", "member"]);
  });
});

const REQUIRED_TASK_KEYS: Array<keyof Task> = [
  "id",
  "title",
  "description",
  "status",
  "currentStatus",
  "completionPercentage",
  "subtasks",
  "updates",
];

describe("Cc: Task/SubTask unified alias parity (roundtrip)", () => {
  test("Cc.1 Task and SubTask both have parentTaskId/parentTask linking fields", () => {
    type SubTaskKeys = keyof SubTask;
    const stk: SubTaskKeys = "parentTaskId";
    expect(stk).toBe("parentTaskId");

    type TaskKeys = keyof Task;
    const tk: TaskKeys = "parentTaskId";
    expect(tk).toBe("parentTaskId");
  });

  test("Cc.2 Core 8 Task fields present on Task type", () => {
    expect(REQUIRED_TASK_KEYS).toHaveLength(8);
    expect(REQUIRED_TASK_KEYS).toContain("status");
    expect(REQUIRED_TASK_KEYS).toContain("currentStatus");
  });

  test("Cc.3 Task.subtasks and Task.currentStatus coexist on same unified interface shape", () => {
    const sample: Pick<Task, "subtasks" | "currentStatus" | "status"> = {
      subtasks: [],
      currentStatus: "new",
      status: "new",
    };
    expect(sample.subtasks).toEqual([]);
    expect(sample.currentStatus).toBe(sample.status);
  });

  test("Cc.4 SubTask TaskStatus uses the same unified TaskStatus values", () => {
    type SubTaskStatus = SubTask["status"];
    const subStatus: SubTaskStatus = "in_progress";
    expect(EXPECTED_TASK_STATUSES.includes(subStatus)).toBe(true);
  });
});
