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

/** Prefer tasks.assigned_to when present; else junction user ids. */
export function coalesceAssignees(
  fromColumn: string[],
  fromJunction: string[],
): string[] {
  return fromColumn.length > 0 ? fromColumn : fromJunction;
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
 * Dual-path users UPDATE/INSERT for ACL column.
 * Tries live `role` first; on missing column retries with `system_permission`.
 */
export async function applyUsersAclWrite(
  client: SupabaseClient,
  args: {
    id?: string;
    mode: "insert" | "update";
    base: Record<string, unknown>;
    /** Live tenants CHECK vocab (supervisor/worker/admin/…). */
    roleValue?: string | null;
  },
): Promise<{ error: { code?: string; message?: string } | null; data?: unknown }> {
  const systemPermission = toDbSystemPermission(
    args.roleValue ||
      (typeof args.base.system_permission === "string"
        ? args.base.system_permission
        : null),
  );

  if (args.mode === "insert") {
    const withRole = {
      ...args.base,
      ...(args.roleValue ? { role: args.roleValue } : {}),
    };
    const roleInsert = await client.from("users").insert(withRole).select().single();
    if (!roleInsert.error) {
      return { error: null, data: roleInsert.data };
    }
    if (!isMissingUsersRoleColumn(roleInsert.error) || !systemPermission) {
      return { error: roleInsert.error };
    }
    const { role: _drop, ...rest } = withRole;
    const sysInsert = await client
      .from("users")
      .insert({ ...rest, system_permission: systemPermission })
      .select()
      .single();
    return { error: sysInsert.error, data: sysInsert.data };
  }

  const id = args.id;
  if (!id) {
    return { error: { message: "missing user id for update" } };
  }

  const withRole = {
    ...args.base,
    ...(args.roleValue ? { role: args.roleValue } : {}),
  };
  const roleUpdate = await client.from("users").update(withRole).eq("id", id);
  if (!roleUpdate.error) {
    return { error: null };
  }
  if (!isMissingUsersRoleColumn(roleUpdate.error) || !systemPermission) {
    return { error: roleUpdate.error };
  }
  const { role: _drop, ...rest } = withRole;
  const sysUpdate = await client
    .from("users")
    .update({ ...rest, system_permission: systemPermission })
    .eq("id", id);
  return { error: sysUpdate.error };
}

/**
 * Sequential ACL read — never SELECT role + system_permission together
 * (PostgREST aborts if either column is missing).
 */
export async function selectUserAclSequential(
  client: SupabaseClient,
  userId: string,
): Promise<{
  name?: string;
  role?: string;
  systemPermission?: string;
} | null> {
  const both = await client
    .from("users")
    .select("name, role, system_permission")
    .eq("id", userId)
    .single();

  if (!both.error && both.data) {
    const row = both.data as {
      name?: string;
      role?: string;
      system_permission?: string;
    };
    return {
      name: row.name,
      role: row.role,
      systemPermission: row.system_permission,
    };
  }

  if (both.error && isMissingUsersRoleColumn(both.error)) {
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
  }

  const roleOnly = await client
    .from("users")
    .select("name, role")
    .eq("id", userId)
    .single();
  if (!roleOnly.error && roleOnly.data) {
    const row = roleOnly.data as { name?: string; role?: string };
    return { name: row.name, role: row.role, systemPermission: undefined };
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
    if (isMissingRelationError(soft.error)) {
      return { error: null, usedJunction: false };
    }
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
  let working = { ...updateData };
  let error: { code?: string; message?: string } | null = null;
  let strippedAssignedTo = false;
  let usedBulk = false;

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
  if (error && isMissingRelationError(error)) {
    return { error: null, usedTable: false };
  }
  return { error, usedTable: true };
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
    if (error && isMissingRelationError(error)) {
      return { error: null, mode: "array" };
    }
    return { error, mode: "junction" };
  }

  const { error } = await client.from("task_stars").insert({
    task_id: input.taskId,
    user_id: input.userId,
  });
  if (error && isMissingRelationError(error)) {
    return { error: null, mode: "array" };
  }
  // Unique violation = already starred → treat as success
  if (error && (error.code === "23505" || /duplicate/i.test(error.message ?? ""))) {
    return { error: null, mode: "junction" };
  }
  return { error, mode: "junction" };
}
