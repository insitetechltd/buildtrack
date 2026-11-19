/**
 * M-WEB-01 company project writes — session-scoped, web-safe columns only.
 * Archive = status cancelled (DEV has no projects.archived).
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import type { ProjectStatus } from "@/types/buildtrack";

export type WebProjectCreateInput = {
  companyId: string;
  createdBy: string;
  name: string;
  description?: string;
  location?: string;
  status?: ProjectStatus;
  clientName?: string;
  startDate?: string | null;
  budget?: number | null;
};

export type WebProjectUpdateInput = {
  name?: string;
  description?: string | null;
  location?: string | null;
  status?: ProjectStatus;
  clientName?: string | null;
  startDate?: string | null;
  budget?: number | null;
};

function clientInfoPayload(clientName: string | null | undefined) {
  const trimmed = clientName?.trim();
  if (!trimmed) return null;
  return { name: trimmed };
}

export async function createCompanyProject(
  input: WebProjectCreateInput,
): Promise<{ id: string | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) return { id: null, error: "Project name is required" };
  if (!input.companyId) return { id: null, error: "No company on this account" };
  const client = await getSessionScopedSupabase();
  if (!client) return { id: null, error: "Not signed in" };

  const { data, error } = await client
    .from("projects")
    .insert({
      name,
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      status: input.status || "active",
      client_info: clientInfoPayload(input.clientName),
      start_date: input.startDate || null,
      budget: input.budget ?? null,
      company_id: input.companyId,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data?.id ? String(data.id) : null, error: null };
}

export async function updateCompanyProject(
  projectId: string,
  updates: WebProjectUpdateInput,
): Promise<{ error: string | null }> {
  if (!projectId) return { error: "Missing project" };
  const client = await getSessionScopedSupabase();
  if (!client) return { error: "Not signed in" };

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) return { error: "Project name is required" };
    payload.name = name;
  }
  if (updates.description !== undefined) {
    payload.description = updates.description?.trim() || null;
  }
  if (updates.location !== undefined) {
    payload.location = updates.location?.trim() || null;
  }
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.startDate !== undefined) payload.start_date = updates.startDate;
  if (updates.budget !== undefined) payload.budget = updates.budget;
  if (updates.clientName !== undefined) {
    payload.client_info = clientInfoPayload(updates.clientName);
  }

  if (Object.keys(payload).length === 0) return { error: null };

  const { error } = await client.from("projects").update(payload).eq("id", projectId);
  return { error: error?.message ?? null };
}

/** Soft-archive without projects.archived column — mark cancelled. */
export async function archiveCompanyProject(
  projectId: string,
): Promise<{ error: string | null }> {
  return updateCompanyProject(projectId, { status: "cancelled" });
}
