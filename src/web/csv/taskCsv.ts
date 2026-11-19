/**
 * M-WEB-01 CSV mass task import — parse ≤200, mark good/bad, import valid only.
 * Unknown assignee email/name = bad (no auto-add to project).
 */
import Papa from "papaparse";

export const WEB_TASK_CSV_MAX_ROWS = 200;

/** Canonical headers for the downloadable template (Excel-friendly). */
export const WEB_TASK_CSV_HEADERS = [
  "title",
  "description",
  "assignee",
  "due",
  "status",
  "tags",
  "priority",
] as const;

export const WEB_TASK_CSV_COLUMN_HELP: { key: string; help: string }[] = [
  { key: "title", help: "Short task name (required)" },
  { key: "description", help: "What needs to be done (required)" },
  {
    key: "assignee",
    help: "Email or exact name of someone already on this project (required)",
  },
  { key: "due", help: "Due date, e.g. 2026-11-01 (optional)" },
  {
    key: "status",
    help: "new | doing | review | completed (optional; default new)",
  },
  { key: "tags", help: "Comma-separated tags (optional)" },
  {
    key: "priority",
    help: "low | medium | high | critical (optional; default medium)",
  },
];

/** Header + one example data row users can replace. */
export function buildTaskCsvTemplateText(): string {
  const header = WEB_TASK_CSV_HEADERS.join(",");
  const example = [
    "Fix lobby door",
    "Door sticks at the frame — plane and rehang",
    "teammate@company.com",
    "2026-11-01",
    "new",
    "critical_this_week",
    "medium",
  ]
    .map(csvEscape)
    .join(",");
  return `${header}\n${example}\n`;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Trigger a browser download of the task CSV template. */
export function downloadTaskCsvTemplate(filename = "taskr-task-import-template.csv"): void {
  if (typeof document === "undefined") return;
  const text = `\uFEFF${buildTaskCsvTemplateText()}`;
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type WebTaskCsvDraft = {
  rowIndex: number;
  title: string;
  description: string;
  assigneeRaw: string;
  assigneeUserId: string | null;
  dueDate: string | null;
  status: string;
  tags: string[];
  priority: string;
  ok: boolean;
  errors: string[];
};

export type WebTaskCsvAssignee = {
  id: string;
  name: string;
  email: string | null;
};

const STATUS_ALIASES: Record<string, string> = {
  new: "new",
  doing: "in_progress",
  "in progress": "in_progress",
  in_progress: "in_progress",
  wip: "wip",
  review: "reviewing",
  reviewing: "reviewing",
  submitted_for_review: "submitted_for_review",
  done: "done",
  completed: "completed",
  cancelled: "cancelled",
  rejected: "rejected",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function pick(
  row: Record<string, string>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function parseDue(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[|,]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function resolveAssignee(
  raw: string,
  roster: WebTaskCsvAssignee[],
): string | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const byEmail = roster.find((u) => (u.email || "").toLowerCase() === q);
  if (byEmail) return byEmail.id;
  const byName = roster.filter((u) => u.name.trim().toLowerCase() === q);
  if (byName.length === 1) return byName[0].id;
  return null;
}

export function parseTaskCsvText(
  text: string,
  roster: WebTaskCsvAssignee[],
): { drafts: WebTaskCsvDraft[]; error: string | null } {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
    return {
      drafts: [],
      error: parsed.errors[0]?.message || "Could not parse CSV",
    };
  }

  const rows = parsed.data || [];
  if (rows.length > WEB_TASK_CSV_MAX_ROWS) {
    return {
      drafts: [],
      error: `CSV has ${rows.length} rows; max is ${WEB_TASK_CSV_MAX_ROWS}`,
    };
  }

  const drafts = rows.map((row, index) => {
    const errors: string[] = [];
    const title = pick(row, "title", "task", "name");
    const description = pick(row, "description", "desc", "details");
    const assigneeRaw = pick(row, "assignee", "assignee_email", "email", "assigned_to");
    const dueRaw = pick(row, "due", "due_date", "duedate");
    const statusRaw = pick(row, "status");
    const tagsRaw = pick(row, "tags", "tag");
    const priority = pick(row, "priority") || "medium";

    if (!title) errors.push("Title required");
    if (!description) errors.push("Description required");
    if (!assigneeRaw) {
      errors.push("Assignee required");
    }

    const assigneeUserId = resolveAssignee(assigneeRaw, roster);
    if (assigneeRaw && !assigneeUserId) {
      errors.push("Unknown assignee (must already be on this project)");
    }

    let dueDate: string | null = null;
    if (dueRaw) {
      dueDate = parseDue(dueRaw);
      if (!dueDate) errors.push("Invalid due date");
    }

    const statusKey = statusRaw.toLowerCase();
    const status = statusRaw
      ? STATUS_ALIASES[statusKey] || statusKey
      : "new";
    if (statusRaw && !STATUS_ALIASES[statusKey] && statusKey !== "new") {
      // allow known DB values that pass light-edit allow-list via alias miss
      if (!["in_progress", "wip", "reviewing", "completed", "done", "cancelled"].includes(status)) {
        errors.push(`Unsupported status: ${statusRaw}`);
      }
    }

    return {
      rowIndex: index + 1,
      title,
      description,
      assigneeRaw,
      assigneeUserId,
      dueDate,
      status,
      tags: parseTags(tagsRaw),
      priority,
      ok: errors.length === 0,
      errors,
    } satisfies WebTaskCsvDraft;
  });

  return { drafts, error: null };
}

export function countCsvValidity(drafts: WebTaskCsvDraft[]): {
  good: number;
  bad: number;
} {
  let good = 0;
  let bad = 0;
  for (const d of drafts) {
    if (d.ok) good += 1;
    else bad += 1;
  }
  return { good, bad };
}

export function patchCsvDraft(
  draft: WebTaskCsvDraft,
  patch: Partial<
    Pick<
      WebTaskCsvDraft,
      "title" | "description" | "assigneeRaw" | "dueDate" | "status" | "tags" | "priority"
    >
  >,
  roster: WebTaskCsvAssignee[],
): WebTaskCsvDraft {
  const next: WebTaskCsvDraft = {
    ...draft,
    ...patch,
    errors: [],
    ok: true,
  };
  if (patch.assigneeRaw !== undefined || patch.title !== undefined) {
    // revalidate fully
  }
  const errors: string[] = [];
  if (!next.title.trim()) errors.push("Title required");
  if (!next.description.trim()) errors.push("Description required");
  if (!next.assigneeRaw.trim()) errors.push("Assignee required");
  const assigneeUserId = resolveAssignee(next.assigneeRaw, roster);
  if (next.assigneeRaw.trim() && !assigneeUserId) {
    errors.push("Unknown assignee (must already be on this project)");
  }
  next.assigneeUserId = assigneeUserId;
  next.errors = errors;
  next.ok = errors.length === 0;
  return next;
}
