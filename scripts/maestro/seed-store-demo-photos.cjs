#!/usr/bin/env node
/**
 * Seed photogenic store-shot demo project on DEV.
 *
 * Creates: project "Store Demo — Amoy Fit-Out"
 *          8 catalog tasks + photos in buildtrack-files + task_files
 *          creation / progress / review activities with photo paths
 *
 * Usage (repo root, DEV .env):
 *   node scripts/maestro/seed-store-demo-photos.cjs
 *   node scripts/maestro/seed-store-demo-photos.cjs --reset
 *
 * Never prints secrets. Dry-looking: logs counts only.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const PHOTO_DIR = path.join(ROOT, "docs/taskr/assets/store/demo-photos");
const CACHE_OUT = path.join(ROOT, ".cache/store-demo-seed.json");
const BUCKET = "buildtrack-files";

const PROJECT_NAME = "Store Demo — Amoy Fit-Out";
const CA_EMAIL = "carol.admina@test.com";
const PM_EMAIL = "john.managera@test.com";
const WORKER_EMAIL = "alice.workera1@test.com";

/** @type {Array<{
 *  id: string,
 *  title: string,
 *  description: string,
 *  status: string,
 *  pct: number,
 *  priority: string,
 *  tags: string[],
 *  location: string,
 *  primary: 'pm'|'worker',
 *  photos: string[],
 *  progressNote?: string,
 * }>} */
const CATALOG = [
  {
    id: "T01",
    title: "Remove façade scaffold — Amoy Street elevation",
    description:
      "Scaffold stacks ready for truck. Confirm loading bay clear before lift.",
    status: "in_progress",
    pct: 45,
    priority: "high",
    tags: ["critical_this_week", "site"],
    location: "Amoy Street elevation",
    primary: "worker",
    photos: ["photo-01-scaffold.jpg", "photo-01b-scaffold-progress.jpg"],
    progressNote: "Struck east bay; west still standing. 45% complete.",
  },
  {
    id: "T02",
    title: "Waterproof plant-room threshold — L2",
    description:
      "Membrane continuous under door sill. Waiting PM sign-off with photo proof.",
    status: "submitted_for_review",
    pct: 100,
    priority: "high",
    tags: ["critical_this_week", "site"],
    location: "L2 plant room",
    primary: "worker",
    photos: ["photo-02-waterproof.jpg"],
  },
  {
    id: "T03",
    title: "Punch: door hardware missing — core toilets L3",
    description: "Leaves missing on three WC doors. Order before handover walk.",
    status: "new",
    pct: 0,
    priority: "high",
    tags: ["critical_this_week", "site"],
    location: "L3 core toilets",
    primary: "pm",
    photos: ["photo-03-door-hardware.jpg"],
  },
  {
    id: "T04",
    title: "HVAC make-good after duct clash — Grid D/5",
    description: "Clash resolved; lagging and supports still open.",
    status: "in_progress",
    pct: 60,
    priority: "medium",
    tags: ["site"],
    location: "Grid D/5",
    primary: "worker",
    photos: ["photo-04-hvac-duct.jpg"],
    progressNote: "Duct re-routed. Lagging still open.",
  },
  {
    id: "T05",
    title: "Seal ceiling joints — L2 south corridor",
    description: "Shadow gap inconsistent — seal and photo before paint.",
    status: "in_progress",
    pct: 30,
    priority: "medium",
    tags: ["site"],
    location: "L2 south corridor",
    primary: "worker",
    photos: ["photo-05-ceiling-corridor.jpg"],
  },
  {
    id: "T06",
    title: "Fire-stop penetrations incomplete — L3 riser",
    description: "Unsealed sleeves around EL/HVAC risers. Fire-stop before close-up.",
    status: "new",
    pct: 0,
    priority: "high",
    tags: ["critical_this_week", "site"],
    location: "L3 riser cupboard",
    primary: "pm",
    photos: ["photo-06-firestop-riser.jpg"],
  },
  {
    id: "T07",
    title: "Rework: lobby tile alignment",
    description: "Tile joint drift at reception mat. Rework complete — ready for review.",
    status: "submitted_for_review",
    pct: 100,
    priority: "medium",
    tags: ["site"],
    location: "Ground lobby",
    primary: "worker",
    photos: ["photo-07-lobby-tiles.jpg"],
  },
  {
    id: "T08",
    title: "Window water test — L5 east",
    description: "Hose test passed east elevations. Keep record photo on file.",
    status: "approved",
    pct: 100,
    priority: "low",
    tags: ["site"],
    location: "L5 east elevation",
    primary: "pm",
    photos: ["photo-08-facade-windows.jpg"],
  },
];

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function wantReset() {
  return process.argv.includes("--reset");
}

async function lookupUser(supabase, email) {
  const { data, error } = await supabase
    .from("users")
    .select("id, company_id, name, email")
    .eq("email", email)
    .maybeSingle();
  if (error || !data?.id) {
    throw new Error(`user not found: ${email} ${error?.message || ""}`);
  }
  return data;
}

async function ensureUpa(supabase, { userId, projectId, role, assignedBy }) {
  const { data: existing } = await supabase
    .from("user_project_assignments")
    .select("id, is_active")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.is_active) return;
  if (existing?.id) {
    const { error } = await supabase
      .from("user_project_assignments")
      .update({ is_active: true, project_role: role })
      .eq("id", existing.id);
    if (error) throw new Error(`reactivate UPA: ${error.message}`);
    return;
  }
  const { error } = await supabase.from("user_project_assignments").insert({
    user_id: userId,
    project_id: projectId,
    project_role: role,
    assigned_by: assignedBy,
    is_active: true,
  });
  if (error) throw new Error(`insert UPA: ${error.message}`);
}

async function ensureProject(supabase, { companyId, createdBy }) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id, name, company_id")
    .eq("name", PROJECT_NAME)
    .eq("company_id", companyId)
    .maybeSingle();
  if (existing?.id) return existing;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: PROJECT_NAME,
      description:
        "Photogenic demo project for App Store screenshots. Not a customer job.",
      status: "active",
      location: "Amoy Street, Wan Chai",
      company_id: companyId,
      created_by: createdBy,
      start_date: new Date().toISOString().slice(0, 10),
    })
    .select("id, name, company_id")
    .single();
  if (error || !data?.id) {
    throw new Error(`create project: ${error?.message || "unknown"}`);
  }
  return data;
}

async function cancelExistingCatalogTasks(supabase, projectId) {
  const titles = CATALOG.map((t) => t.title);
  const { data: rows } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("project_id", projectId)
    .in("title", titles);
  let n = 0;
  for (const row of rows || []) {
    if (row.status === "cancelled" || row.status === "deleted") continue;
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (!error) n += 1;
  }
  return n;
}

async function uploadPhoto(supabase, { companyId, taskId, filename, localPath }) {
  const bytes = fs.readFileSync(localPath);
  const storagePath = `${companyId}/tasks/${taskId}/store-demo-${filename}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(`storage upload ${filename}: ${error.message}`);
  return { storagePath, sizeBytes: bytes.length };
}

async function insertActivity(supabase, row) {
  const { data, error } = await supabase
    .from("task_activities")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(`activity ${row.activity_type}: ${error.message}`);
  return data;
}

async function seedTask(supabase, ctx, item) {
  const primary = item.primary === "pm" ? ctx.pm : ctx.worker;
  const due = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const now = Date.now();
  const createdAt = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
  const acceptedAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
  const progressAt = new Date(now - 6 * 60 * 60 * 1000).toISOString();
  const reviewAt = new Date(now - 2 * 60 * 60 * 1000).toISOString();

  const payload = {
    project_id: ctx.project.id,
    title: item.title,
    description: item.description,
    billing_status: "non_billable",
    priority: item.priority,
    category: "general",
    due_date: due,
    status: item.status,
    completion_percentage: item.pct,
    primary_assignee_id: primary.id,
    delegated_user_ids: [],
    assigned_by: ctx.pm.id,
    tags: item.tags,
    location_on_site: item.location,
    accepted_by:
      item.status === "new" || item.status === "reported" ? null : primary.id,
    accepted_at:
      item.status === "new" || item.status === "reported" ? null : acceptedAt,
    reviewed_by: item.status === "approved" ? ctx.pm.id : null,
    reviewed_at: item.status === "approved" ? reviewAt : null,
    created_at: createdAt,
    updated_at: new Date().toISOString(),
  };

  const { data: task, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("id, title")
    .single();
  if (error || !task?.id) {
    throw new Error(`insert task ${item.id}: ${error?.message || "unknown"}`);
  }

  const { error: assignErr } = await supabase.from("task_assignments").insert({
    task_id: task.id,
    user_id: primary.id,
    assignment_kind: "primary",
    is_active: true,
    created_by: ctx.pm.id,
  });
  if (assignErr) {
    throw new Error(`task_assignments ${item.id}: ${assignErr.message}`);
  }

  const uploaded = [];
  for (const filename of item.photos) {
    const localPath = path.join(PHOTO_DIR, filename);
    if (!fs.existsSync(localPath)) {
      throw new Error(`missing photo file: ${localPath}`);
    }
    const up = await uploadPhoto(supabase, {
      companyId: ctx.companyId,
      taskId: task.id,
      filename,
      localPath,
    });
    uploaded.push(up);
  }

  const createPhotos = uploaded.slice(0, 1).map((u) => u.storagePath);
  const progressPhotos =
    uploaded.length > 1
      ? uploaded.slice(1).map((u) => u.storagePath)
      : item.status !== "new"
        ? createPhotos
        : [];

  const creation = await insertActivity(supabase, {
    task_id: task.id,
    user_id: ctx.pm.id,
    activity_type: "creation",
    timestamp: createdAt,
    description: `Task created by ${ctx.pm.name || "PM"}`,
    completion_percentage: 0,
    data: {
      title: item.title,
      assignedTo: [primary.id],
      assignedBy: ctx.pm.id,
      photos: createPhotos,
      status: "new",
    },
  });

  if (item.status !== "new") {
    await insertActivity(supabase, {
      task_id: task.id,
      user_id: primary.id,
      activity_type: "status_change",
      timestamp: acceptedAt,
      description: `Task accepted by ${primary.name || "assignee"}`,
      completion_percentage: 0,
      data: {
        fromStatus: "new",
        toStatus: "in_progress",
        reason: `Task accepted by ${primary.name || "assignee"}`,
      },
    });
  }

  let progressActivityId = null;
  if (
    item.status === "in_progress" ||
    item.status === "submitted_for_review" ||
    item.status === "approved"
  ) {
    const progress = await insertActivity(supabase, {
      task_id: task.id,
      user_id: primary.id,
      activity_type: "progress_update",
      timestamp: progressAt,
      description: item.progressNote || `Progress update ${item.pct}%`,
      completion_percentage: item.pct,
      data: {
        completionPercentage: item.pct,
        notes: item.progressNote || `Progress ${item.pct}%`,
        photos: progressPhotos.length ? progressPhotos : createPhotos,
        status: item.status === "in_progress" ? "in_progress" : item.status,
      },
    });
    progressActivityId = progress.id;
  }

  if (item.status === "submitted_for_review" || item.status === "approved") {
    await insertActivity(supabase, {
      task_id: task.id,
      user_id: primary.id,
      activity_type: "status_change",
      timestamp: reviewAt,
      description: `Submitted for review by ${primary.name || "assignee"}`,
      completion_percentage: 100,
      data: {
        fromStatus: "in_progress",
        toStatus: "submitted_for_review",
      },
    });
  }

  if (item.status === "approved") {
    await insertActivity(supabase, {
      task_id: task.id,
      user_id: ctx.pm.id,
      activity_type: "status_change",
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
      description: `Approved by ${ctx.pm.name || "PM"}`,
      completion_percentage: 100,
      data: {
        fromStatus: "submitted_for_review",
        toStatus: "approved",
      },
    });
  }

  for (let i = 0; i < uploaded.length; i += 1) {
    const up = uploaded[i];
    const activityId =
      i === 0 ? creation.id : progressActivityId || creation.id;
    const { error: fileErr } = await supabase.from("task_files").insert({
      task_id: task.id,
      storage_path: up.storagePath,
      mime_type: "image/jpeg",
      size_bytes: up.sizeBytes,
      created_by: i === 0 ? ctx.pm.id : primary.id,
      activity_id: activityId,
    });
    if (fileErr) {
      throw new Error(`task_files ${item.id}: ${fileErr.message}`);
    }
  }

  return {
    catalogId: item.id,
    taskId: task.id,
    title: task.title,
    status: item.status,
    photos: uploaded.map((u) => u.storagePath),
  };
}

async function main() {
  loadDotEnv();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("FAIL: missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(2);
  }
  if (!url.includes("zusulknbhaumougqckec")) {
    console.error(
      "FAIL: refuse to seed — EXPO_PUBLIC_SUPABASE_URL is not DEV (zusulknbhaumougqckec)",
    );
    process.exit(2);
  }

  for (const item of CATALOG) {
    for (const filename of item.photos) {
      const p = path.join(PHOTO_DIR, filename);
      if (!fs.existsSync(p)) {
        console.error("FAIL: missing photo", p);
        process.exit(3);
      }
    }
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ca = await lookupUser(supabase, CA_EMAIL);
  const pm = await lookupUser(supabase, PM_EMAIL);
  const worker = await lookupUser(supabase, WORKER_EMAIL);
  if (ca.company_id !== pm.company_id || pm.company_id !== worker.company_id) {
    throw new Error("CA/PM/Worker company_id mismatch");
  }

  const project = await ensureProject(supabase, {
    companyId: ca.company_id,
    createdBy: ca.id,
  });

  await ensureUpa(supabase, {
    userId: ca.id,
    projectId: project.id,
    role: "lead_project_manager",
    assignedBy: ca.id,
  });
  await ensureUpa(supabase, {
    userId: pm.id,
    projectId: project.id,
    role: "lead_project_manager",
    assignedBy: ca.id,
  });
  await ensureUpa(supabase, {
    userId: worker.id,
    projectId: project.id,
    role: "worker",
    assignedBy: ca.id,
  });

  let cancelled = 0;
  if (wantReset()) {
    cancelled = await cancelExistingCatalogTasks(supabase, project.id);
  } else {
    // Idempotent: cancel prior catalog titles so re-runs don't duplicate UI noise
    cancelled = await cancelExistingCatalogTasks(supabase, project.id);
  }

  const ctx = {
    project,
    companyId: ca.company_id,
    ca,
    pm,
    worker,
  };

  const seeded = [];
  for (const item of CATALOG) {
    seeded.push(await seedTask(supabase, ctx, item));
    console.log(`SEED_TASK ${item.id} ${item.status} ${item.title}`);
  }

  const summary = {
    plane: "DEV",
    projectId: project.id,
    projectName: PROJECT_NAME,
    companyId: ca.company_id,
    actors: { ca: CA_EMAIL, pm: PM_EMAIL, worker: WORKER_EMAIL },
    cancelledPriorCatalog: cancelled,
    tasks: seeded,
    seededAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(CACHE_OUT), { recursive: true });
  fs.writeFileSync(CACHE_OUT, JSON.stringify(summary, null, 2));

  console.log(
    `SEED_OK project=${PROJECT_NAME} tasks=${seeded.length} cancelledPrior=${cancelled}`,
  );
  console.log(`WROTE ${CACHE_OUT}`);
  console.log(
    `LOGIN_HINT ca=${CA_EMAIL} pm=${PM_EMAIL} worker=${WORKER_EMAIL} project="${PROJECT_NAME}"`,
  );
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
