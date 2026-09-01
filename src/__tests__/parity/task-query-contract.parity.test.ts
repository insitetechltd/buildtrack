import fs from "node:fs";
import path from "node:path";

import * as taskr from "../../state/taskQueryPredicates";
import * as hq from "../../../supabase/functions/owner-tenant-read/taskQueryPredicates";

type Impl = typeof taskr;

const U = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

type Fixture = {
  id: string;
  title: string;
  deleted_at: string | null;
  archived_at: string | null;
  cancelled_at: string | null;
  assigned_to: string[];
  primary_assignee_id: string | null;
  assigned_by: string | null;
  delegated_user_ids: string[];
  status: string | null;
  current_status: string | null;
};

function base(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: "t",
    title: "Install HVAC",
    deleted_at: null,
    archived_at: null,
    cancelled_at: null,
    assigned_to: [U],
    primary_assignee_id: U,
    assigned_by: OTHER,
    delegated_user_ids: [],
    status: "in_progress",
    current_status: "in_progress",
    ...overrides,
  };
}

/** Contract §10 fixture matrix */
const T1 = base({ id: "T1", assigned_to: [U], primary_assignee_id: null });
const T2 = base({
  id: "T2",
  assigned_to: [],
  primary_assignee_id: U,
});
const T3 = base({ id: "T3", deleted_at: "2026-09-01T00:00:00Z" });
const T4 = base({ id: "T4", archived_at: "2026-09-01T00:00:00Z" });
const T5 = base({ id: "T5", cancelled_at: "2026-09-01T00:00:00Z" });
const T6 = base({
  id: "T6",
  status: "in_progress",
  current_status: null,
});
const T7 = base({
  id: "T7",
  status: null,
  current_status: "in_progress",
});
const stale = base({
  id: "stale",
  status: "in_progress",
  current_status: "new",
});

const impls: Array<[string, Impl]> = [
  ["taskr", taskr],
  ["hq-edge", hq],
];

describe("task-query-contract parity (A5)", () => {
  it.each(impls)("%s TASK_LISTABLE matches T1–T5", (_name, impl) => {
    expect(impl.isTaskListable(T1)).toBe(true);
    expect(impl.isTaskListable(T2)).toBe(true);
    expect(impl.isTaskListable(T3)).toBe(false);
    expect(impl.isTaskListable(T4)).toBe(false);
    expect(impl.isTaskListable(T5)).toBe(false);
  });

  it.each(impls)("%s TASK_ASSIGNED_TO_USER matches T1–T2 only", (_name, impl) => {
    expect(impl.isTaskAssignedToUser(T1, U)).toBe(true);
    expect(impl.isTaskAssignedToUser(T2, U)).toBe(true);
    expect(impl.isTaskAssignedToUser(T3, U)).toBe(true);
    expect(impl.isTaskListable(T3) && impl.isTaskAssignedToUser(T3, U)).toBe(false);
    expect(impl.isTaskAssignedToUser(base({ assigned_to: [], primary_assignee_id: null }), U)).toBe(
      false,
    );
  });

  it.each(impls)("%s TASK_RELATED_TO_USER includes assigner and delegate", (_name, impl) => {
    const asAssigner = base({
      assigned_to: [],
      primary_assignee_id: null,
      assigned_by: U,
    });
    const asDelegate = base({
      assigned_to: [],
      primary_assignee_id: OTHER,
      assigned_by: OTHER,
      delegated_user_ids: [U],
    });
    expect(impl.isTaskRelatedToUser(asAssigner, U)).toBe(true);
    expect(impl.taskRelationRoles(asAssigner, U)).toEqual(["assigner"]);
    expect(impl.isTaskRelatedToUser(asDelegate, U)).toBe(true);
    expect(impl.taskRelationRoles(asDelegate, U)).toEqual(["delegate"]);
    expect(impl.isTaskAssignedToUser(asAssigner, U)).toBe(false);
    expect(impl.taskRelationRoles(T1, U)).toEqual(["assignee"]);
  });

  it.each(impls)("%s TASK_EFFECTIVE_STATUS T6/T7 and status wins stale current_status", (_name, impl) => {
    expect(impl.taskEffectiveStatus(T6)).toBe("in_progress");
    expect(impl.taskEffectiveStatus(T7)).toBe("in_progress");
    expect(impl.taskEffectiveStatus(stale)).toBe("in_progress");
    expect(impl.taskEffectiveStatus({})).toBe("new");
  });

  it.each(impls)("%s TASK_SEARCH_TITLE sanitizes and matches title only", (_name, impl) => {
    expect(impl.sanitizeTaskSearchTitle("  HVAC%*_xx  ")).toBe("HVACxx");
    expect(impl.sanitizeTaskSearchTitle("a".repeat(90)).length).toBe(80);
    expect(impl.matchesTaskSearchTitle("Install HVAC", "hvac")).toBe(true);
    expect(impl.matchesTaskSearchTitle("Install HVAC", "in_progress")).toBe(false);
    expect(impl.matchesTaskSearchTitle("Install HVAC", "Acme Project")).toBe(false);
  });

  it("HQ PostgREST effective-status filter includes null status + current_status", () => {
    expect(hq.postgrestEffectiveStatusFilter("in_progress")).toBe(
      "status.eq.in_progress,and(status.is.null,current_status.eq.in_progress)",
    );
  });

  it("Taskr and HQ predicate modules agree on the fixture matrix", () => {
    const rows = [T1, T2, T3, T4, T5, T6, T7, stale];
    for (const row of rows) {
      expect(taskr.isTaskListable(row)).toBe(hq.isTaskListable(row));
      expect(taskr.isTaskAssignedToUser(row, U)).toBe(hq.isTaskAssignedToUser(row, U));
      expect(taskr.isTaskRelatedToUser(row, U)).toBe(hq.isTaskRelatedToUser(row, U));
      expect(taskr.taskRelationRoles(row, U)).toEqual(hq.taskRelationRoles(row, U));
      expect(taskr.taskEffectiveStatus(row)).toBe(hq.taskEffectiveStatus(row));
    }
  });

  it("call sites use the named helpers (drift detector)", () => {
    const root = path.resolve(__dirname, "../../..");
    const store = fs.readFileSync(path.join(root, "src/state/taskStore.supabase.ts"), "utf8");
    const edge = fs.readFileSync(
      path.join(root, "supabase/functions/owner-tenant-read/index.ts"),
      "utf8",
    );
    const pane = fs.readFileSync(
      path.join(root, "apps/owner/src/screens/tenant/TaskListPane.tsx"),
      "utf8",
    );
    expect(store).toMatch(/taskEffectiveStatus\(/);
    expect(store).not.toMatch(/current_status \|\| ['"]new['"]/);
    expect(edge).toMatch(/taskEffectiveStatus\(/);
    expect(edge).toMatch(/sanitizeTaskSearchTitle\(/);
    expect(edge).toMatch(/postgrestEffectiveStatusFilter\(/);
    expect(pane).toMatch(/TASK_LIST_SEARCH_PLACEHOLDER/);
    expect(pane).toMatch(/taskListSearchFetchQuery/);
    expect(pane).not.toMatch(/primaryAssigneeName \?\? ""\)\.toLowerCase/);
  });
});
