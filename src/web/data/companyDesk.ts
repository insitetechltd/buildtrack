/**
 * M-WEB-01 company desk loaders — session-scoped, web-safe selects.
 * Avoids mobile projectStore embeds that still request users.role (42703 on DEV).
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import type { SystemPermission } from "@/types/buildtrack";

export type WebCompanyUserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  systemPermission: SystemPermission;
  isPending: boolean;
  isActive: boolean;
};

export type WebCompanyProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  location: string | null;
  startDate: string | null;
  budget: number | null;
  clientName: string | null;
  createdById: string | null;
  createdByName: string | null;
  leadPmName: string | null;
  memberCount: number;
  taskCount: number;
  createdAt: string | null;
};

function mapPermission(raw: unknown): SystemPermission {
  const v = String(raw ?? "member").toLowerCase();
  if (v === "admin") return "admin";
  if (v === "manager" || v === "supervisor") return "manager";
  return "member";
}

export function mapCompanyUserRow(row: Record<string, unknown>): WebCompanyUserRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: row.email != null ? String(row.email) : null,
    phone: row.phone != null ? String(row.phone) : null,
    systemPermission: mapPermission(row.system_permission ?? row.role),
    isPending: Boolean(row.is_pending),
    isActive: row.is_active !== false,
  };
}

function clientNameFromInfo(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const name = (raw as { name?: unknown }).name;
  return name != null && String(name).trim() ? String(name) : null;
}

export function mapCompanyProjectRow(
  row: Record<string, unknown>,
  extras?: Partial<
    Pick<
      WebCompanyProjectRow,
      | "createdByName"
      | "leadPmName"
      | "memberCount"
      | "taskCount"
    >
  >,
): WebCompanyProjectRow {
  const budgetRaw = row.budget;
  const budget =
    budgetRaw == null || budgetRaw === ""
      ? null
      : Number(budgetRaw);
  return {
    id: String(row.id),
    name: String(row.name ?? "Untitled"),
    description: row.description != null ? String(row.description) : null,
    status: String(row.status ?? "active"),
    location: row.location != null ? String(row.location) : null,
    startDate: row.start_date != null ? String(row.start_date) : null,
    budget: Number.isFinite(budget as number) ? (budget as number) : null,
    clientName: clientNameFromInfo(row.client_info),
    createdById: row.created_by != null ? String(row.created_by) : null,
    createdByName: extras?.createdByName ?? null,
    leadPmName: extras?.leadPmName ?? null,
    memberCount: extras?.memberCount ?? 0,
    taskCount: extras?.taskCount ?? 0,
    createdAt: row.created_at != null ? String(row.created_at) : null,
  };
}

export async function loadCompanyUsers(
  companyId: string,
): Promise<{ users: WebCompanyUserRow[]; error: string | null }> {
  if (!companyId) {
    return { users: [], error: "No company on this account" };
  }
  const client = await getSessionScopedSupabase();
  if (!client) {
    return { users: [], error: "Not signed in" };
  }
  const { data, error } = await client
    .from("users")
    .select("id,name,email,phone,system_permission,is_pending,is_active,deleted_at")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    return { users: [], error: error.message };
  }
  return {
    users: (data || []).map((row) => mapCompanyUserRow(row as Record<string, unknown>)),
    error: null,
  };
}

export async function loadCompanyProjects(
  companyId: string,
): Promise<{ projects: WebCompanyProjectRow[]; error: string | null }> {
  if (!companyId) {
    return { projects: [], error: "No company on this account" };
  }
  const client = await getSessionScopedSupabase();
  if (!client) {
    return { projects: [], error: "Not signed in" };
  }
  const { data, error } = await client
    .from("projects")
    .select(
      "id,name,description,status,location,start_date,budget,client_info,created_by,created_at,company_id",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return { projects: [], error: error.message };
  }

  const rows = (data || []) as Record<string, unknown>[];
  const projectIds = rows.map((row) => String(row.id));

  const taskCountByProject: Record<string, number> = {};
  const memberCountByProject: Record<string, number> = {};
  const leadPmIdByProject: Record<string, string> = {};
  const nameByUserId: Record<string, string> = {};

  if (projectIds.length > 0) {
    const { data: taskRows } = await client
      .from("tasks")
      .select("id,project_id")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .is("archived_at", null);
    for (const task of taskRows || []) {
      const pid = String((task as { project_id: string }).project_id);
      taskCountByProject[pid] = (taskCountByProject[pid] || 0) + 1;
    }

    const { data: assignmentRows } = await client
      .from("user_project_assignments")
      .select("user_id,project_id,project_role,is_active")
      .in("project_id", projectIds)
      .eq("is_active", true);
    for (const row of assignmentRows || []) {
      const a = row as {
        user_id: string;
        project_id: string;
        project_role?: string | null;
      };
      const pid = String(a.project_id);
      memberCountByProject[pid] = (memberCountByProject[pid] || 0) + 1;
      const role = String(a.project_role || "").toLowerCase();
      if (
        !leadPmIdByProject[pid] &&
        (role === "lead_project_manager" || role === "project_admin")
      ) {
        leadPmIdByProject[pid] = String(a.user_id);
      }
    }

    const userIds = [
      ...new Set(
        [
          ...rows.map((row) =>
            row.created_by != null ? String(row.created_by) : null,
          ),
          ...Object.values(leadPmIdByProject),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    if (userIds.length > 0) {
      const { data: users } = await client
        .from("users")
        .select("id,name")
        .in("id", userIds);
      for (const u of users || []) {
        nameByUserId[String(u.id)] = String(u.name ?? "");
      }
    }
  }

  return {
    projects: rows.map((row) => {
      const id = String(row.id);
      const createdById = row.created_by != null ? String(row.created_by) : null;
      const leadId = leadPmIdByProject[id];
      return mapCompanyProjectRow(row, {
        createdByName: createdById ? nameByUserId[createdById] ?? null : null,
        leadPmName: leadId ? nameByUserId[leadId] ?? null : null,
        memberCount: memberCountByProject[id] || 0,
        taskCount: taskCountByProject[id] || 0,
      });
    }),
    error: null,
  };
}

/** Seat label for roster display — mirrors webSeatBand wording. */
export function permissionLabel(user: Pick<WebCompanyUserRow, "systemPermission">): string {
  if (user.systemPermission === "admin") return "CA";
  if (user.systemPermission === "manager") return "PM";
  return "Worker";
}
