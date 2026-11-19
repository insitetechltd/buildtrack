/**
 * M-WEB-01 task light edit + CSV create — session-scoped, no photos.
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";

export type WebTaskLightEditInput = {
  title?: string;
  description?: string | null;
  status?: string;
  dueDate?: string | null;
  primaryAssigneeId?: string | null;
  tags?: string[];
};

export type WebTaskCreateInput = {
  projectId: string;
  assignedBy: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  primaryAssigneeId: string;
  tags?: string[];
};

const ALLOWED_LIGHT_STATUS = new Set([
  "new",
  "in_progress",
  "wip",
  "reviewing",
  "submitted_for_review",
  "completed",
  "done",
  "cancelled",
  "rejected",
  "reported",
  "resolved",
]);

export function isAllowedWebTaskStatus(status: string): boolean {
  return ALLOWED_LIGHT_STATUS.has(String(status || "").toLowerCase());
}

export async function updateProjectTaskLight(
  taskId: string,
  updates: WebTaskLightEditInput,
): Promise<{ error: string | null }> {
  if (!taskId) return { error: "Missing task" };
  const client = await getSessionScopedSupabase();
  if (!client) return { error: "Not signed in" };

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (!title) return { error: "Title is required" };
    payload.title = title;
  }
  if (updates.description !== undefined) {
    payload.description = updates.description?.trim() || null;
  }
  if (updates.status !== undefined) {
    const status = updates.status.trim().toLowerCase();
    if (!isAllowedWebTaskStatus(status)) {
      return { error: `Unsupported status: ${updates.status}` };
    }
    payload.status = status;
  }
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.primaryAssigneeId !== undefined) {
    // NEW/DEV: no assigned_to column — primary_assignee_id only.
    payload.primary_assignee_id = updates.primaryAssigneeId;
  }
  if (updates.tags !== undefined) payload.tags = updates.tags;

  const { error } = await client.from("tasks").update(payload).eq("id", taskId);
  return { error: error?.message ?? null };
}

export async function createProjectTaskFromCsv(
  input: WebTaskCreateInput,
): Promise<{ id: string | null; error: string | null }> {
  const title = input.title.trim();
  if (!title) return { id: null, error: "Title is required" };
  if (!input.projectId) return { id: null, error: "Missing project" };
  if (!input.primaryAssigneeId) return { id: null, error: "Assignee is required" };

  const client = await getSessionScopedSupabase();
  if (!client) return { id: null, error: "Not signed in" };

  const status = (input.status || "new").trim().toLowerCase();
  if (!isAllowedWebTaskStatus(status)) {
    return { id: null, error: `Unsupported status: ${input.status}` };
  }

  const priorityRaw = (input.priority || "medium").trim().toLowerCase();
  const priority = priorityRaw === "critical" ? "urgent" : priorityRaw;

  // NEW/DEV: no evolved columns (assigned_to, attachments). Assignees via primary_assignee_id.
  const { data, error } = await client
    .from("tasks")
    .insert({
      project_id: input.projectId,
      title,
      description: input.description?.trim() || null,
      status,
      priority,
      due_date: input.dueDate || null,
      primary_assignee_id: input.primaryAssigneeId,
      assigned_by: input.assignedBy,
      tags: input.tags || [],
      completion_percentage: 0,
      category: "general",
      billing_status: "non_billable",
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data?.id ? String(data.id) : null, error: null };
}
