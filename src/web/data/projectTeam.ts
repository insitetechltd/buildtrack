/**
 * M-WEB-01 / M-WEB-02 project team — load roster + PA/member writes.
 * Uses project_role only (no category column — 42703 on DEV).
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import type { SystemPermission } from "@/types/buildtrack";
import {
  MEMBER_GRANT_CATEGORY,
  PROJECT_ADMIN_GRANT_CATEGORY,
} from "@/ui/contracts/projectMembership";

export type WebProjectMemberRow = {
  userId: string;
  name: string;
  email: string | null;
  systemPermission: SystemPermission;
  projectRole: string;
  isProjectAdmin: boolean;
  isActive: boolean;
  assignmentId: string | null;
};

function mapPermission(raw: unknown): SystemPermission {
  const v = String(raw ?? "member").toLowerCase();
  if (v === "admin") return "admin";
  if (v === "manager" || v === "supervisor") return "manager";
  return "member";
}

export function mapProjectMemberRow(
  assignment: Record<string, unknown>,
  user?: Record<string, unknown> | null,
): WebProjectMemberRow {
  const role = String(assignment.project_role ?? "worker").toLowerCase();
  const isPa = role === "lead_project_manager" || role === "project_admin";
  return {
    userId: String(assignment.user_id),
    name: user?.name != null ? String(user.name) : "—",
    email: user?.email != null ? String(user.email) : null,
    systemPermission: mapPermission(user?.system_permission),
    projectRole: role,
    isProjectAdmin: isPa,
    isActive: assignment.is_active !== false,
    assignmentId: assignment.id != null ? String(assignment.id) : null,
  };
}

export async function loadProjectTeam(
  projectId: string,
): Promise<{ members: WebProjectMemberRow[]; error: string | null }> {
  if (!projectId) return { members: [], error: "Missing project" };
  const client = await getSessionScopedSupabase();
  if (!client) return { members: [], error: "Not signed in" };

  const { data, error } = await client
    .from("user_project_assignments")
    .select("id,user_id,project_id,project_role,is_active")
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (error) return { members: [], error: error.message };

  const rows = (data || []) as Record<string, unknown>[];
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const userById: Record<string, Record<string, unknown>> = {};

  if (userIds.length > 0) {
    const { data: users } = await client
      .from("users")
      .select("id,name,email,system_permission")
      .in("id", userIds);
    for (const u of users || []) {
      userById[String(u.id)] = u as Record<string, unknown>;
    }
  }

  return {
    members: rows.map((row) => mapProjectMemberRow(row, userById[String(row.user_id)])),
    error: null,
  };
}

export async function addProjectMember(args: {
  projectId: string;
  userId: string;
  assignedBy: string;
  asProjectAdmin?: boolean;
}): Promise<{ error: string | null }> {
  const client = await getSessionScopedSupabase();
  if (!client) return { error: "Not signed in" };

  const role = args.asProjectAdmin
    ? PROJECT_ADMIN_GRANT_CATEGORY
    : MEMBER_GRANT_CATEGORY;

  if (args.asProjectAdmin) {
    await demoteOtherProjectAdmins(client, args.projectId, args.userId);
  }

  const { data: existing } = await client
    .from("user_project_assignments")
    .select("id,is_active")
    .eq("project_id", args.projectId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await client
      .from("user_project_assignments")
      .update({ is_active: true, project_role: role })
      .eq("id", existing.id);
    return { error: error?.message ?? null };
  }

  const { error } = await client.from("user_project_assignments").insert({
    user_id: args.userId,
    project_id: args.projectId,
    assigned_by: args.assignedBy,
    is_active: true,
    project_role: role,
  });
  return { error: error?.message ?? null };
}

export async function setProjectAdmin(args: {
  projectId: string;
  userId: string;
  asProjectAdmin: boolean;
}): Promise<{ error: string | null }> {
  const client = await getSessionScopedSupabase();
  if (!client) return { error: "Not signed in" };

  const role = args.asProjectAdmin
    ? PROJECT_ADMIN_GRANT_CATEGORY
    : MEMBER_GRANT_CATEGORY;

  if (args.asProjectAdmin) {
    await demoteOtherProjectAdmins(client, args.projectId, args.userId);
  }

  const { error } = await client
    .from("user_project_assignments")
    .update({ project_role: role, is_active: true })
    .eq("project_id", args.projectId)
    .eq("user_id", args.userId);
  return { error: error?.message ?? null };
}

export async function removeProjectMember(args: {
  projectId: string;
  userId: string;
}): Promise<{ error: string | null }> {
  const client = await getSessionScopedSupabase();
  if (!client) return { error: "Not signed in" };

  const { error } = await client
    .from("user_project_assignments")
    .update({ is_active: false })
    .eq("project_id", args.projectId)
    .eq("user_id", args.userId);
  return { error: error?.message ?? null };
}

async function demoteOtherProjectAdmins(
  client: NonNullable<Awaited<ReturnType<typeof getSessionScopedSupabase>>>,
  projectId: string,
  keepUserId: string,
) {
  const { data } = await client
    .from("user_project_assignments")
    .select("user_id,project_role,is_active")
    .eq("project_id", projectId)
    .eq("is_active", true);

  for (const row of data || []) {
    const uid = String(row.user_id);
    if (uid === keepUserId) continue;
    const role = String(row.project_role || "").toLowerCase();
    if (role === "lead_project_manager" || role === "project_admin") {
      await client
        .from("user_project_assignments")
        .update({ project_role: MEMBER_GRANT_CATEGORY })
        .eq("project_id", projectId)
        .eq("user_id", uid);
    }
  }
}
