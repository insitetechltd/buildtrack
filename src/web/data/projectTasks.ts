/**
 * M-WEB-01 project task list — session-scoped, web-safe selects.
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import {
  createSignedFileUrl,
  extractBuildtrackStoragePath,
} from "@/api/fileUploadService";

export type WebProjectTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  completionPercentage: number;
  primaryAssigneeId: string | null;
  primaryAssigneeName: string | null;
  tags: string[];
  updatedAt: string | null;
  nestingLevel: number;
  /** Raw storage paths/URLs (task_files + activity photos). No tasks.attachments — absent on NEW/DEV. */
  attachmentRefs: string[];
  /** Resolved https URLs for ActivityStyleRowCard (signed when needed). */
  photoUris: string[];
};

const MAX_CARD_PHOTOS = 6;

/** Prefer task_files / activity photo refs. Ignore evolved `attachments` col if present in a row object. */
export function collectAttachmentRefs(
  _row: Record<string, unknown>,
  fileRefs: string[] = [],
  activityRefs: string[] = [],
): string[] {
  return [...fileRefs, ...activityRefs].filter(
    (v, i, all) => Boolean(v) && all.indexOf(v) === i,
  );
}

export function mapProjectTaskRow(
  row: Record<string, unknown>,
  nameById: Record<string, string> = {},
  extraRefs: string[] = [],
  photoUris: string[] = [],
): WebProjectTaskRow {
  const primaryAssigneeId =
    row.primary_assignee_id != null ? String(row.primary_assignee_id) : null;
  const tags = Array.isArray(row.tags)
    ? row.tags.map((t) => String(t))
    : [];
  const attachmentRefs = collectAttachmentRefs(row, extraRefs);
  return {
    id: String(row.id),
    title: String(row.title ?? "Untitled"),
    description: row.description != null ? String(row.description) : null,
    status: String(row.status ?? "unknown"),
    priority: row.priority != null ? String(row.priority) : null,
    dueDate: row.due_date != null ? String(row.due_date) : null,
    completionPercentage: Number(row.completion_percentage ?? 0) || 0,
    primaryAssigneeId,
    primaryAssigneeName: primaryAssigneeId
      ? nameById[primaryAssigneeId] ?? null
      : null,
    tags,
    updatedAt: row.updated_at != null ? String(row.updated_at) : null,
    nestingLevel: Number(row.nesting_level ?? 0) || 0,
    attachmentRefs,
    photoUris,
  };
}

/** Resolve storage path / legacy URL to a displayable https URL for web. */
export async function resolveWebPhotoUri(ref: string): Promise<string | null> {
  if (!ref) return null;
  if (/^(file:|content:|data:|asset:)/i.test(ref)) return null;
  if (/^https?:\/\//i.test(ref)) {
    const path = extractBuildtrackStoragePath(ref);
    if (path) return createSignedFileUrl(path);
    return ref;
  }
  return createSignedFileUrl(ref);
}

export async function resolveWebPhotoUris(refs: string[]): Promise<string[]> {
  const unique = refs.filter((v, i, all) => Boolean(v) && all.indexOf(v) === i);
  const limited = unique.slice(0, MAX_CARD_PHOTOS);
  const resolved = await Promise.all(limited.map((ref) => resolveWebPhotoUri(ref)));
  return resolved.filter((uri): uri is string => Boolean(uri));
}

export async function loadProjectMeta(
  projectId: string,
): Promise<{ name: string | null; error: string | null }> {
  if (!projectId) return { name: null, error: "Missing project" };
  const client = await getSessionScopedSupabase();
  if (!client) return { name: null, error: "Not signed in" };
  const { data, error } = await client
    .from("projects")
    .select("id,name")
    .eq("id", projectId)
    .maybeSingle();
  if (error) return { name: null, error: error.message };
  return { name: data?.name ? String(data.name) : null, error: null };
}

export async function loadProjectTasks(
  projectId: string,
): Promise<{ tasks: WebProjectTaskRow[]; error: string | null }> {
  if (!projectId) {
    return { tasks: [], error: "Missing project" };
  }
  const client = await getSessionScopedSupabase();
  if (!client) {
    return { tasks: [], error: "Not signed in" };
  }

  // NEW/DEV schema: no tasks.attachments (OPTIONAL_EVOLVED). Photos → task_files + activity data.
  const { data, error } = await client
    .from("tasks")
    .select(
      "id,title,description,status,priority,due_date,completion_percentage,primary_assignee_id,delegated_user_ids,tags,updated_at,nesting_level,deleted_at,archived_at",
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return { tasks: [], error: error.message };
  }

  const rows = (data || []) as Record<string, unknown>[];
  const taskIds = rows.map((r) => String(r.id));
  const assigneeIds = [
    ...new Set(
      rows
        .map((r) => (r.primary_assignee_id != null ? String(r.primary_assignee_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const nameById: Record<string, string> = {};
  if (assigneeIds.length > 0) {
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id,name")
      .in("id", assigneeIds);
    if (!usersError && users) {
      for (const u of users) {
        nameById[String(u.id)] = String(u.name ?? "");
      }
    }
  }

  const filesByTask: Record<string, string[]> = {};
  const activityPhotosByTask: Record<string, string[]> = {};
  if (taskIds.length > 0) {
    const [{ data: fileRows }, { data: activityRows }] = await Promise.all([
      client
        .from("task_files")
        .select("task_id,storage_path,created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false }),
      client
        .from("task_activities")
        .select("task_id,data,created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false }),
    ]);

    for (const f of fileRows || []) {
      const tid = String((f as { task_id: string }).task_id);
      const path = String((f as { storage_path?: string }).storage_path || "").trim();
      if (!path) continue;
      if (!filesByTask[tid]) filesByTask[tid] = [];
      filesByTask[tid].push(path);
    }

    for (const a of activityRows || []) {
      const tid = String((a as { task_id: string }).task_id);
      const data = (a as { data?: { photos?: unknown } }).data;
      const photos = Array.isArray(data?.photos) ? data.photos : [];
      for (const photo of photos) {
        const ref = photo != null ? String(photo).trim() : "";
        if (!ref) continue;
        if (!activityPhotosByTask[tid]) activityPhotosByTask[tid] = [];
        activityPhotosByTask[tid].push(ref);
      }
    }
  }

  const tasks = await Promise.all(
    rows.map(async (row) => {
      const tid = String(row.id);
      const refs = collectAttachmentRefs(
        row,
        filesByTask[tid] || [],
        activityPhotosByTask[tid] || [],
      );
      const photoUris = await resolveWebPhotoUris(refs);
      return mapProjectTaskRow(row, nameById, refs, photoUris);
    }),
  );

  return { tasks, error: null };
}

export function formatDueDate(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
