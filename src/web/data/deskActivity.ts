/**
 * Desk home — Activities-tab style: queue stats + critical snapshots + recent feed.
 * Scoped to projects the signed-in user can see (company for CA, assignments otherwise).
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import {
  createSignedFileUrl,
  extractBuildtrackStoragePath,
} from "@/api/fileUploadService";
import { endOfLocalWeek, startOfLocalWeek } from "@/utils/localWeek";
import {
  isWebTaskOverdue,
  matchesNewStatusFilter,
  matchesReviewingStatusFilter,
  matchesWipStatusFilter,
} from "@/web/tasks/webTaskPresentation";
import { loadDeskSummary, type WebDeskSummary } from "./deskSummary";

export type WebDeskQueueStats = {
  open: number;
  newCount: number;
  doing: number;
  inReview: number;
  overdue: number;
  taskCount: number;
  projectCount: number;
};

export type WebDeskCriticalItem = {
  id: string;
  taskId: string;
  projectId: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  imageUri?: string;
};

export type WebDeskActivityEvent = {
  id: string;
  action: string;
  timestampLabel: string;
  actorLabel?: string;
  actorUserId?: string;
};

export type WebDeskActivityItem = {
  id: string;
  taskId: string;
  projectId: string;
  title: string;
  subtitle: string;
  timestampLabel: string;
  actorLabel?: string;
  actorUserId?: string;
  previewPhotoUris: string[];
  events: WebDeskActivityEvent[];
};

export type WebDeskHome = {
  queue: WebDeskQueueStats;
  critical: WebDeskCriticalItem[];
  activity: WebDeskActivityItem[];
  summary: WebDeskSummary;
};

const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 5;
const RECENT_MAX = 20;

function formatCalendarLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatActivityStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function activityHeadline(typeOrStatus: string): string {
  const raw = String(typeOrStatus || "").trim();
  if (!raw) return "Update";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function resolvePhoto(ref: string): Promise<string | null> {
  if (!ref) return null;
  if (/^(file:|content:|data:|asset:)/i.test(ref)) return null;
  if (/^https?:\/\//i.test(ref)) {
    const path = extractBuildtrackStoragePath(ref);
    if (path) return createSignedFileUrl(path);
    return ref;
  }
  return createSignedFileUrl(ref);
}

async function resolvePhotos(refs: string[], limit = 4): Promise<string[]> {
  const unique = refs.filter((v, i, a) => Boolean(v) && a.indexOf(v) === i).slice(0, limit);
  const out = await Promise.all(unique.map(resolvePhoto));
  return out.filter((u): u is string => Boolean(u));
}

export async function loadDeskHome(args: {
  userId: string;
  companyId: string | null | undefined;
  isCompanyAdmin: boolean;
}): Promise<{ home: WebDeskHome; error: string | null }> {
  const { summary, error: summaryError } = await loadDeskSummary(args);
  const emptyQueue: WebDeskQueueStats = {
    open: 0,
    newCount: 0,
    doing: 0,
    inReview: 0,
    overdue: 0,
    taskCount: 0,
    projectCount: 0,
  };
  if (summaryError) {
    return {
      home: { queue: emptyQueue, critical: [], activity: [], summary },
      error: summaryError,
    };
  }

  const projectIds = summary.projects.map((p) => p.id);
  const queue: WebDeskQueueStats = {
    open: summary.totals.openTasks,
    newCount: 0,
    doing: summary.totals.doing,
    inReview: summary.totals.inReview,
    overdue: summary.totals.overdue,
    taskCount: summary.totals.taskCount,
    projectCount: summary.totals.projectCount,
  };

  if (projectIds.length === 0) {
    return { home: { queue, critical: [], activity: [], summary }, error: null };
  }

  const client = await getSessionScopedSupabase();
  if (!client) {
    return {
      home: { queue, critical: [], activity: [], summary },
      error: "Not signed in",
    };
  }

  const { data: taskRows, error: taskErr } = await client
    .from("tasks")
    .select(
      "id,project_id,title,description,status,due_date,tags,primary_assignee_id,deleted_at,archived_at",
    )
    .in("project_id", projectIds)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (taskErr) {
    return { home: { queue, critical: [], activity: [], summary }, error: taskErr.message };
  }

  const tasks = (taskRows || []) as Record<string, unknown>[];
  let newCount = 0;
  for (const t of tasks) {
    if (matchesNewStatusFilter(String(t.status || ""))) newCount += 1;
  }
  queue.newCount = newCount;
  // Recompute open/doing/review/overdue from full task set for accuracy
  let open = 0;
  let doing = 0;
  let inReview = 0;
  let overdue = 0;
  for (const t of tasks) {
    const status = String(t.status || "");
    const dueDate = t.due_date != null ? String(t.due_date) : null;
    if (
      matchesNewStatusFilter(status) ||
      matchesWipStatusFilter(status) ||
      matchesReviewingStatusFilter(status)
    ) {
      open += 1;
    }
    if (matchesWipStatusFilter(status)) doing += 1;
    if (matchesReviewingStatusFilter(status)) inReview += 1;
    if (isWebTaskOverdue({ status, dueDate })) overdue += 1;
  }
  queue.open = open;
  queue.doing = doing;
  queue.inReview = inReview;
  queue.overdue = overdue;
  queue.taskCount = tasks.length;

  const today = new Date();
  const weekStart = startOfLocalWeek(today);
  const weekEnd = endOfLocalWeek(today);
  const projectNameById = Object.fromEntries(
    summary.projects.map((p) => [p.id, p.name]),
  );

  const criticalCandidates = tasks
    .filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(String(t.due_date));
      if (Number.isNaN(d.getTime())) return false;
      return d >= weekStart && d <= weekEnd;
    })
    .map((t) => {
      const d = new Date(String(t.due_date));
      return { t, sort: d.getTime(), dateLabel: formatCalendarLabel(d) };
    })
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 3); // mobile Activities shows ≤3 this-week critical cards

  const criticalTaskIds = criticalCandidates.map((c) => String(c.t.id));
  const filesByTask: Record<string, string[]> = {};
  if (criticalTaskIds.length > 0) {
    const { data: fileRows } = await client
      .from("task_files")
      .select("task_id,storage_path,created_at")
      .in("task_id", criticalTaskIds)
      .order("created_at", { ascending: false });
    for (const f of fileRows || []) {
      const tid = String((f as { task_id: string }).task_id);
      const path = String((f as { storage_path?: string }).storage_path || "").trim();
      if (!path) continue;
      if (!filesByTask[tid]) filesByTask[tid] = [];
      if (filesByTask[tid].length < 1) filesByTask[tid].push(path);
    }
  }

  const critical: WebDeskCriticalItem[] = await Promise.all(
    criticalCandidates.map(async ({ t, dateLabel }) => {
      const tid = String(t.id);
      const pid = String(t.project_id);
      const photos = await resolvePhotos(filesByTask[tid] || [], 1);
      return {
        id: `critical:${tid}`,
        taskId: tid,
        projectId: pid,
        title: String(t.title ?? "Untitled"),
        subtitle: projectNameById[pid] || "Project",
        dateLabel,
        imageUri: photos[0],
      };
    }),
  );

  const sinceIso = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const taskIds = tasks.map((t) => String(t.id));
  const projectIdByTask = Object.fromEntries(
    tasks.map((t) => [String(t.id), String(t.project_id)]),
  );
  // task_activities has no project_id — filter by task_id + timestamp.
  const { data: activityRows, error: actErr } = await client
    .from("task_activities")
    .select("id,task_id,activity_type,description,data,user_id,timestamp,created_at")
    .in("task_id", taskIds)
    .gte("timestamp", sinceIso)
    .order("timestamp", { ascending: false })
    .limit(80);

  if (actErr) {
    return { home: { queue, critical, activity: [], summary }, error: actErr.message };
  }

  const taskTitleById = Object.fromEntries(
    tasks.map((t) => [String(t.id), String(t.title ?? "Untitled")]),
  );
  const actorIds = [
    ...new Set(
      (activityRows || [])
        .map((a) =>
          (a as { user_id?: string }).user_id != null
            ? String((a as { user_id: string }).user_id)
            : null,
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nameById: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: users } = await client
      .from("users")
      .select("id,name")
      .in("id", actorIds);
    for (const u of users || []) {
      nameById[String(u.id)] = String(u.name ?? "");
    }
  }

  // Group by task — newest event first (mobile feed style).
  type Acc = {
    taskId: string;
    projectId: string;
    taskTitle: string;
    events: WebDeskActivityEvent[];
    photoRefs: string[];
    sortTs: string;
  };
  const groups = new Map<string, Acc>();

  for (const raw of activityRows || []) {
    const a = raw as {
      id: string;
      task_id: string;
      activity_type?: string;
      description?: string | null;
      data?: { photos?: unknown; status?: string };
      user_id?: string | null;
      timestamp?: string;
      created_at?: string;
    };
    const taskId = String(a.task_id);
    const projectId = projectIdByTask[taskId];
    if (!projectId) continue;
    const createdAt = String(a.timestamp || a.created_at || new Date().toISOString());
    const actorUserId = a.user_id != null ? String(a.user_id) : undefined;
    const action =
      (a.description && String(a.description).trim()) ||
      activityHeadline(a.activity_type || a.data?.status || "update");
    const event: WebDeskActivityEvent = {
      id: String(a.id),
      action,
      timestampLabel: formatActivityStamp(createdAt),
      actorLabel: actorUserId ? nameById[actorUserId] : undefined,
      actorUserId,
    };
    const photos = Array.isArray(a.data?.photos)
      ? a.data!.photos!.map((p) => String(p).trim()).filter(Boolean)
      : [];

    const existing = groups.get(taskId);
    if (!existing) {
      groups.set(taskId, {
        taskId,
        projectId,
        taskTitle: taskTitleById[taskId] || "Task",
        events: [event],
        photoRefs: photos,
        sortTs: createdAt,
      });
    } else if (existing.events.length < 4) {
      existing.events.push(event);
      for (const p of photos) {
        if (!existing.photoRefs.includes(p)) existing.photoRefs.push(p);
      }
    }
  }

  const activity: WebDeskActivityItem[] = await Promise.all(
    [...groups.values()]
      .sort((a, b) => (a.sortTs < b.sortTs ? 1 : -1))
      .slice(0, RECENT_MAX)
      .map(async (g) => {
        const latest = g.events[0];
        const previewPhotoUris = await resolvePhotos(g.photoRefs, 4);
        return {
          id: `activity-group:${g.taskId}`,
          taskId: g.taskId,
          projectId: g.projectId,
          title: latest?.action || "Update",
          subtitle: g.taskTitle,
          timestampLabel: latest?.timestampLabel || "",
          actorLabel: latest?.actorLabel,
          actorUserId: latest?.actorUserId,
          previewPhotoUris,
          events: g.events,
        };
      }),
  );

  return { home: { queue, critical, activity, summary }, error: null };
}
