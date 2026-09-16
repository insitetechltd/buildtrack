import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getMissingTaskColumnFromError,
  isMissingTaskColumnError,
  isOptionalEvolvedTaskColumn,
  stripOptionalEvolvedTaskColumns,
  stripTaskColumn,
} from "./taskDeferredSchemaCompat";

/** Map app / live role vocab → greenfield `users.system_permission`. */
export function toDbSystemPermission(
  roleOrPermission: string | null | undefined,
): "admin" | "manager" | "member" | null {
  if (!roleOrPermission) return null;
  const value = roleOrPermission.toLowerCase();
  if (value === "admin" || value === "company_admin") return "admin";
  if (value === "manager" || value === "supervisor") return "manager";
  if (
    value === "member" ||
    value === "worker" ||
    value === "foreman" ||
    value === "company_member"
  ) {
    return "member";
  }
  return "member";
}

/** Prefer task_assignments junction (NEW SoT); fall back to legacy column. */
export function coalesceAssignees(
  fromColumn: string[],
  fromJunction: string[],
): string[] {
  return fromJunction.length > 0 ? fromJunction : fromColumn;
}

export function isMissingRelationError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /relation|schema cache|does not exist|Could not find the table/i.test(
    error.message ?? "",
  );
}

function isMissingUsersRoleColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /role|schema cache|does not exist|Could not find/i.test(error.message ?? "")
  );
}

/**
 * NEW-schema ACL write (`users.system_permission` only).
 * DEV≡PROD parity (2026-09-15): do not write legacy `users.role`.
 */
export async function applyUsersAclWrite(
  client: SupabaseClient,
  args: {
    id?: string;
    mode: "insert" | "update";
    base: Record<string, unknown>;
    /** App vocab mapped onto greenfield system_permission. */
    roleValue?: string | null;
  },
): Promise<{ error: { code?: string; message?: string } | null; data?: unknown }> {
  const systemPermission = toDbSystemPermission(
    args.roleValue ||
      (typeof args.base.system_permission === "string"
        ? args.base.system_permission
        : null),
  );

  const { role: _dropRole, ...baseWithoutRole } = args.base as Record<
    string,
    unknown
  > & { role?: unknown };
  const payload = {
    ...baseWithoutRole,
    ...(systemPermission ? { system_permission: systemPermission } : {}),
  };

  if (args.mode === "insert") {
    const sysInsert = await client.from("users").insert(payload).select().single();
    return { error: sysInsert.error, data: sysInsert.data };
  }

  const id = args.id;
  if (!id) {
    return { error: { message: "missing user id for update" } };
  }

  const sysUpdate = await client.from("users").update(payload).eq("id", id);
  return { error: sysUpdate.error };
}

/**
 * NEW-schema ACL read — `system_permission` only (no legacy `role` dual SELECT).
 */
export async function selectUserAclSequential(
  client: SupabaseClient,
  userId: string,
): Promise<{
  name?: string;
  role?: string;
  systemPermission?: string;
} | null> {
  const sysOnly = await client
    .from("users")
    .select("name, system_permission")
    .eq("id", userId)
    .single();
  if (!sysOnly.error && sysOnly.data) {
    const row = sysOnly.data as { name?: string; system_permission?: string };
    return {
      name: row.name,
      role: undefined,
      systemPermission: row.system_permission,
    };
  }

  const nameOnly = await client
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();
  if (!nameOnly.error && nameOnly.data) {
    return {
      name: (nameOnly.data as { name?: string }).name,
      role: undefined,
      systemPermission: undefined,
    };
  }

  return null;
}

export async function syncTaskAssignmentsJunction(
  client: SupabaseClient,
  input: {
    taskId: string;
    assigneeIds: string[];
    primaryAssigneeId?: string | null;
    createdBy?: string | null;
  },
): Promise<{ error: { code?: string; message?: string } | null; usedJunction: boolean }> {
  const soft = await client
    .from("task_assignments")
    .update({ is_active: false })
    .eq("task_id", input.taskId);
  if (soft.error) {
    // NEW-only: task_assignments must exist (DEV≡PROD).
    return { error: soft.error, usedJunction: true };
  }

  if (input.assigneeIds.length === 0) {
    return { error: null, usedJunction: true };
  }

  const primaryId = input.primaryAssigneeId || input.assigneeIds[0] || null;
  const rows = input.assigneeIds.map((userId) => ({
    task_id: input.taskId,
    user_id: userId,
    assignment_kind:
      primaryId && String(userId) === String(primaryId) ? "primary" : "delegated",
    is_active: true,
    created_by: input.createdBy || null,
  }));

  const { error } = await client.from("task_assignments").insert(rows);
  return { error, usedJunction: true };
}

export async function fetchTaskIdsAssignedViaJunction(
  client: SupabaseClient,
  userId: string,
): Promise<{ taskIds: string[]; error: { code?: string; message?: string } | null }> {
  const { data, error } = await client
    .from("task_assignments")
    .select("task_id")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) {
    return { taskIds: [], error };
  }
  return {
    taskIds: [...new Set((data || []).map((row) => String(row.task_id)))],
    error: null,
  };
}

export async function hydrateAssigneesFromJunction(
  client: SupabaseClient,
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const byTask = new Map<string, string[]>();
  if (taskIds.length === 0) return byTask;
  const { data, error } = await client
    .from("task_assignments")
    .select("task_id, user_id")
    .in("task_id", taskIds)
    .eq("is_active", true);
  if (error || !data) return byTask;
  for (const row of data) {
    const taskId = String(row.task_id);
    const list = byTask.get(taskId) || [];
    list.push(String(row.user_id));
    byTask.set(taskId, list);
  }
  return byTask;
}

/** Retry task UPDATE while stripping evolved/DEV-only columns reported missing. */
export async function updateTaskStrippingEvolvedColumns(
  client: SupabaseClient,
  taskId: string,
  updateData: Record<string, unknown>,
): Promise<{
  error: { code?: string; message?: string } | null;
  finalPayload: Record<string, unknown>;
  strippedAssignedTo: boolean;
}> {
  // NEW-first: drop evolved/OLD columns before first UPDATE (DEV≡PROD parity).
  let strippedAssignedTo = Array.isArray(updateData.assigned_to);
  let working = stripOptionalEvolvedTaskColumns({ ...updateData });
  let error: { code?: string; message?: string } | null = null;
  let usedBulk = true;

  ({ error } = await client.from("tasks").update(working).eq("id", taskId));

  for (let attempt = 0; error && attempt < 12; attempt += 1) {
    if (!isMissingTaskColumnError(error)) break;
    const missing = getMissingTaskColumnFromError(error);
    if (!missing) break;

    if (!usedBulk && isOptionalEvolvedTaskColumn(missing)) {
      if (Array.isArray(working.assigned_to)) {
        strippedAssignedTo = true;
      }
      working = stripOptionalEvolvedTaskColumns(working);
      usedBulk = true;
    } else {
      if (missing === "assigned_to" && Array.isArray(working.assigned_to)) {
        strippedAssignedTo = true;
      }
      if (!(missing in working)) break;
      working = stripTaskColumn(working, missing);
    }

    if (Object.keys(working).length === 0) {
      error = null;
      break;
    }
    ({ error } = await client.from("tasks").update(working).eq("id", taskId));
  }

  return { error, finalPayload: working, strippedAssignedTo };
}


function isMissingActivityStatusColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code !== "42703" && error.code !== "PGRST204") return false;
  return /['"]status['"].*task_activities|task_activities.*['"]status['"]/i.test(
    error.message ?? "",
  );
}

/**
 * Insert task_activities (NEW SoT): status lives in `data`, never top-level.
 */
export async function insertTaskActivityDualPath(
  client: SupabaseClient,
  row: Record<string, unknown>,
  opts?: { select?: boolean },
): Promise<{
  error: { code?: string; message?: string } | null;
  data?: unknown;
  strippedStatus: boolean;
}> {
  const doInsert = async (payload: Record<string, unknown>) => {
    const q = client.from("task_activities").insert(payload);
    if (opts?.select) {
      return q.select().single();
    }
    const result = await q;
    return result;
  };

  const { status: droppedStatus, ...withoutStatus } = row;
  const hadTopLevelStatus = droppedStatus !== undefined;
  const dataObj =
    withoutStatus.data && typeof withoutStatus.data === "object"
      ? { ...(withoutStatus.data as Record<string, unknown>) }
      : {};
  if (hadTopLevelStatus && dataObj.status === undefined) {
    dataObj.status = droppedStatus;
  }
  const newPayload = {
    ...withoutStatus,
    data: Object.keys(dataObj).length > 0 ? dataObj : withoutStatus.data ?? {},
  };

  const result = await doInsert(newPayload);
  return {
    error: result.error,
    data: result.data,
    strippedStatus: hadTopLevelStatus,
  };
}

export async function insertTaskFile(
  client: SupabaseClient,
  row: {
    task_id: string;
    storage_path: string;
    activity_id?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    created_by?: string | null;
  },
): Promise<{
  error: { code?: string; message?: string } | null;
  usedTable: boolean;
}> {
  const { error } = await client.from("task_files").insert({
    task_id: row.task_id,
    storage_path: row.storage_path,
    activity_id: row.activity_id ?? null,
    mime_type: row.mime_type ?? null,
    size_bytes: row.size_bytes ?? null,
    created_by: row.created_by ?? null,
  });
  // NEW-only: task_files must exist (DEV≡PROD).
  return { error, usedTable: !error };
}

export async function hydrateAttachmentsFromTaskFiles(
  client: SupabaseClient,
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const byTask = new Map<string, string[]>();
  if (taskIds.length === 0) return byTask;
  const { data, error } = await client
    .from("task_files")
    .select("task_id, storage_path")
    .in("task_id", taskIds);
  if (error || !data) return byTask;
  for (const row of data) {
    const taskId = String(row.task_id);
    const path = String(row.storage_path || "");
    if (!path) continue;
    const list = byTask.get(taskId) || [];
    list.push(path);
    byTask.set(taskId, list);
  }
  return byTask;
}

export async function hydrateStarsFromTaskStars(
  client: SupabaseClient,
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const byTask = new Map<string, string[]>();
  if (taskIds.length === 0) return byTask;
  const { data, error } = await client
    .from("task_stars")
    .select("task_id, user_id")
    .in("task_id", taskIds);
  if (error || !data) return byTask;
  for (const row of data) {
    const taskId = String(row.task_id);
    const list = byTask.get(taskId) || [];
    list.push(String(row.user_id));
    byTask.set(taskId, list);
  }
  return byTask;
}

/**
 * Prefer task_stars junction. If table missing → mode "array" (caller writes starred_by_users).
 * Never silently succeed with no persist.
 */
export async function toggleTaskStarDualPath(
  client: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    currentlyStarred: boolean;
  },
): Promise<{
  error: { code?: string; message?: string } | null;
  mode: "junction" | "array";
}> {
  if (input.currentlyStarred) {
    const { error } = await client
      .from("task_stars")
      .delete()
      .eq("task_id", input.taskId)
      .eq("user_id", input.userId);
    // NEW-only: task_stars must exist (DEV≡PROD).
    return { error, mode: "junction" };
  }

  const { error } = await client.from("task_stars").insert({
    task_id: input.taskId,
    user_id: input.userId,
  });
  // Unique violation = already starred → treat as success
  if (error && (error.code === "23505" || /duplicate/i.test(error.message ?? ""))) {
    return { error: null, mode: "junction" };
  }
  return { error, mode: "junction" };
}
