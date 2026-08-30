/** Client for Edge `owner-ops-read` (M-OPS-03 read-only ops enrichments). */

export type OpsProviderStatus = {
  name: string;
  state: "operational" | "degraded" | "unavailable";
  detail: string;
  scope: string;
};

export type OwnerMonitoringOpsSnapshot = {
  generatedAt: string;
  providers: OpsProviderStatus[];
  secretsPresent: Record<string, boolean>;
  githubRepo: {
    configured: boolean;
    openIssues?: number;
    defaultBranch?: string;
    detail: string;
  };
  supabaseBackup: { state: string; detail: string };
  edgeLogs: { state: string; detail: string };
  authSignals: {
    state?: "ok" | "unavailable";
    listed: number | null;
    unconfirmed: number | null;
    banned: number | null;
    signedInLast7d: number | null;
    truncated: boolean;
    detail?: string;
  };
  note: string;
};

export type OwnerEconomicsStripeSnapshot = {
  generatedAt: string;
  stripeConfigured: boolean;
  providerState: string;
  detail: string;
  mrrCents: number | null;
  mrrEstimate?: boolean;
  currency: string | null;
  listIncomplete?: boolean;
  subscriptionStatusCounts: Record<string, number>;
  trialCount: number;
  pastDueCount: number;
  stripeListed?: number;
  dbSubscriptionRows?: number;
  reconcile: {
    state: string;
    aligned: number;
    dbOnly: number;
    stripeOnly: number;
    statusMismatch: number;
    flags: { companyId: string | null; kind: string; detail: string }[];
    truncated?: boolean;
  };
};

export type OwnerAuditEntry = {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  companyId: string | null;
  targetUserId: string | null;
  payload: Record<string, unknown>;
};

export type OwnerSearchUser = {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
  role: string;
  isActive: boolean;
  isPending: boolean;
};

export type OwnerSupportSnapshot = {
  generatedAt: string;
  company: {
    id: string;
    name: string;
    type: string;
    email: string | null;
    isActive: boolean;
    createdAt: string;
  };
  entitlement: Record<string, unknown> | null;
  subscription: {
    status: string | null;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
  };
  usage: {
    userCount: number | null;
    activeUsers: number | null;
    projectCount: number | null;
    projectLimit: number | null;
  };
  sections?: {
    entitlement: string;
    subscription: string;
    users: string;
    projects: string;
  };
};

export type OwnerSessionDebug = {
  user: {
    id: string;
    email: string | null;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
    createdAt: string | null;
    bannedUntil: string | null;
    appMetadataKeys: string[];
    userMetadataKeys: string[];
  };
};

export type OwnerOpsErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "server_misconfigured"
  | "internal_error"
  | "network"
  | "bad_response"
  | "not_configured"
  | "email_required"
  | "not_found";

export class OwnerOpsError extends Error {
  readonly code: OwnerOpsErrorCode;
  readonly status?: number;

  constructor(code: OwnerOpsErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OwnerOpsError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBool(value: unknown): boolean {
  return value === true;
}

type InvokeClient = {
  functions: {
    invoke: (
      name: string,
      options?: { body?: Record<string, unknown> },
    ) => Promise<{
      data: unknown;
      error: { message?: string; context?: Response } | null;
    }>;
  };
};

async function invokeOps(
  client: InvokeClient | null,
  body: Record<string, unknown>,
): Promise<unknown> {
  if (!client) {
    throw new OwnerOpsError("not_configured", "Supabase not configured");
  }
  const { data, error } = await client.functions.invoke("owner-ops-read", {
    body,
  });
  if (error) {
    const ctx = error.context;
    if (ctx && typeof (ctx as Response).json === "function") {
      try {
        const errBody = await (ctx as Response).clone().json();
        const status = (ctx as Response).status;
        const code = isRecord(errBody) ? asString(errBody.error) : null;
        if (status === 401) {
          throw new OwnerOpsError("not_authenticated", "Sign in again", 401);
        }
        if (status === 403) {
          throw new OwnerOpsError("forbidden", "Not authorized", 403);
        }
        if (code === "email_required") {
          throw new OwnerOpsError("email_required", "Enter a full email", 400);
        }
        if (code === "not_found") {
          throw new OwnerOpsError("not_found", "Not found", 404);
        }
        throw new OwnerOpsError(
          "internal_error",
          `Request failed (${status})`,
          status,
        );
      } catch (mapped) {
        if (mapped instanceof OwnerOpsError) throw mapped;
      }
    }
    throw new OwnerOpsError("network", error.message || "Network error");
  }
  if (isRecord(data) && asString(data.error)) {
    const code = asString(data.error)!;
    if (code === "email_required") {
      throw new OwnerOpsError("email_required", "Enter a full email", 400);
    }
    if (code === "not_found") {
      throw new OwnerOpsError("not_found", "Not found", 404);
    }
    if (code === "forbidden") {
      throw new OwnerOpsError("forbidden", "Not authorized", 403);
    }
    throw new OwnerOpsError("internal_error", "Request failed");
  }
  return data;
}

export function parseMonitoringOpsSnapshot(
  payload: unknown,
): OwnerMonitoringOpsSnapshot {
  if (!isRecord(payload) || !Array.isArray(payload.providers)) {
    throw new OwnerOpsError("bad_response", "Monitoring ops snapshot invalid");
  }
  const providers: OpsProviderStatus[] = [];
  for (const p of payload.providers) {
    if (!isRecord(p)) continue;
    const state = asString(p.state);
    if (
      state !== "operational" &&
      state !== "degraded" &&
      state !== "unavailable"
    ) {
      continue;
    }
    providers.push({
      name: asString(p.name) ?? "unknown",
      state,
      detail: asString(p.detail) ?? "",
      scope: asString(p.scope) ?? "global_provider",
    });
  }
  const secrets: Record<string, boolean> = {};
  if (isRecord(payload.secretsPresent)) {
    for (const [k, v] of Object.entries(payload.secretsPresent)) {
      secrets[k] = asBool(v);
    }
  }
  const gh = isRecord(payload.githubRepo) ? payload.githubRepo : {};
  const auth = isRecord(payload.authSignals) ? payload.authSignals : {};
  const backup = isRecord(payload.supabaseBackup) ? payload.supabaseBackup : {};
  const logs = isRecord(payload.edgeLogs) ? payload.edgeLogs : {};
  return {
    generatedAt: asString(payload.generatedAt) ?? "",
    providers,
    secretsPresent: secrets,
    githubRepo: {
      configured: asBool(gh.configured),
      openIssues: asNumber(gh.openIssues) ?? undefined,
      defaultBranch: asString(gh.defaultBranch) ?? undefined,
      detail: asString(gh.detail) ?? "",
    },
    supabaseBackup: {
      state: asString(backup.state) ?? "unavailable",
      detail: asString(backup.detail) ?? "",
    },
    edgeLogs: {
      state: asString(logs.state) ?? "unavailable",
      detail: asString(logs.detail) ?? "",
    },
    authSignals: {
      state:
        asString(auth.state) === "ok" || asString(auth.state) === "unavailable"
          ? (asString(auth.state) as "ok" | "unavailable")
          : asNumber(auth.listed) != null
            ? "ok"
            : "unavailable",
      listed: asNumber(auth.listed),
      unconfirmed: asNumber(auth.unconfirmed),
      banned: asNumber(auth.banned),
      signedInLast7d: asNumber(auth.signedInLast7d),
      truncated: asBool(auth.truncated),
      detail: asString(auth.detail) ?? undefined,
    },
    note: asString(payload.note) ?? "",
  };
}

export function parseEconomicsStripeSnapshot(
  payload: unknown,
): OwnerEconomicsStripeSnapshot {
  if (!isRecord(payload) || !isRecord(payload.reconcile)) {
    throw new OwnerOpsError("bad_response", "Stripe economics invalid");
  }
  const rec = payload.reconcile;
  const flags: OwnerEconomicsStripeSnapshot["reconcile"]["flags"] = [];
  if (Array.isArray(rec.flags)) {
    for (const f of rec.flags) {
      if (!isRecord(f)) continue;
      flags.push({
        companyId: asString(f.companyId),
        kind: asString(f.kind) ?? "unknown",
        detail: asString(f.detail) ?? "",
      });
    }
  }
  const counts: Record<string, number> = {};
  if (isRecord(payload.subscriptionStatusCounts)) {
    for (const [k, v] of Object.entries(payload.subscriptionStatusCounts)) {
      const n = asNumber(v);
      if (n !== null) counts[k] = n;
    }
  }
  return {
    generatedAt: asString(payload.generatedAt) ?? "",
    stripeConfigured: asBool(payload.stripeConfigured),
    providerState: asString(payload.providerState) ?? "unavailable",
    detail: asString(payload.detail) ?? "",
    mrrCents: asNumber(payload.mrrCents),
    mrrEstimate: payload.mrrEstimate === true,
    currency: asString(payload.currency),
    listIncomplete: asBool(payload.listIncomplete),
    subscriptionStatusCounts: counts,
    trialCount: asNumber(payload.trialCount) ?? 0,
    pastDueCount: asNumber(payload.pastDueCount) ?? 0,
    stripeListed: asNumber(payload.stripeListed) ?? undefined,
    dbSubscriptionRows: asNumber(payload.dbSubscriptionRows) ?? undefined,
    reconcile: {
      state: asString(rec.state) ?? "unknown",
      aligned: asNumber(rec.aligned) ?? 0,
      dbOnly: asNumber(rec.dbOnly) ?? 0,
      stripeOnly: asNumber(rec.stripeOnly) ?? 0,
      statusMismatch: asNumber(rec.statusMismatch) ?? 0,
      flags,
      truncated: asBool(rec.truncated),
    },
  };
}

export async function fetchMonitoringOpsSnapshot(
  client: InvokeClient | null,
): Promise<OwnerMonitoringOpsSnapshot> {
  return parseMonitoringOpsSnapshot(
    await invokeOps(client, { action: "monitoringSnapshot" }),
  );
}

export async function fetchEconomicsStripeSnapshot(
  client: InvokeClient | null,
): Promise<OwnerEconomicsStripeSnapshot> {
  return parseEconomicsStripeSnapshot(
    await invokeOps(client, { action: "economicsStripe" }),
  );
}

export async function fetchOwnerAuditLogs(
  client: InvokeClient | null,
  limit = 50,
): Promise<OwnerAuditEntry[]> {
  const data = await invokeOps(client, { action: "listAuditLogs", limit });
  if (!isRecord(data) || !Array.isArray(data.entries)) {
    throw new OwnerOpsError("bad_response", "Audit log invalid");
  }
  return data.entries.map((row) => {
    const r = isRecord(row) ? row : {};
    return {
      id: asString(r.id) ?? "",
      occurredAt: asString(r.occurredAt) ?? "",
      actorUserId: asString(r.actorUserId),
      actorEmail: asString(r.actorEmail),
      action: asString(r.action) ?? "",
      companyId: asString(r.companyId),
      targetUserId: asString(r.targetUserId),
      payload: isRecord(r.payload) ? r.payload : {},
    };
  });
}

export async function searchOwnerUsers(
  client: InvokeClient | null,
  email: string,
): Promise<OwnerSearchUser[]> {
  const data = await invokeOps(client, { action: "searchUsers", email });
  if (!isRecord(data) || !Array.isArray(data.users)) {
    throw new OwnerOpsError("bad_response", "Search invalid");
  }
  return data.users.map((row) => {
    const u = isRecord(row) ? row : {};
    return {
      id: asString(u.id) ?? "",
      name: asString(u.name) ?? "",
      email: asString(u.email) ?? "",
      companyId: asString(u.companyId),
      companyName: asString(u.companyName),
      role: asString(u.role) ?? "member",
      isActive: u.isActive !== false,
      isPending: asBool(u.isPending),
    };
  });
}

export async function fetchSupportSnapshot(
  client: InvokeClient | null,
  companyId: string,
): Promise<OwnerSupportSnapshot> {
  const data = await invokeOps(client, {
    action: "getSupportSnapshot",
    companyId,
  });
  if (!isRecord(data) || !isRecord(data.company) || !isRecord(data.usage)) {
    throw new OwnerOpsError("bad_response", "Support snapshot invalid");
  }
  const c = data.company;
  const u = data.usage;
  const sub = isRecord(data.subscription) ? data.subscription : {};
  return {
    generatedAt: asString(data.generatedAt) ?? "",
    company: {
      id: asString(c.id) ?? "",
      name: asString(c.name) ?? "",
      type: asString(c.type) ?? "",
      email: asString(c.email),
      isActive: c.isActive !== false,
      createdAt: asString(c.createdAt) ?? "",
    },
    entitlement: isRecord(data.entitlement) ? data.entitlement : null,
    subscription: {
      status: asString(sub.status),
      stripeSubscriptionId: asString(sub.stripeSubscriptionId),
      stripeCustomerId: asString(sub.stripeCustomerId),
    },
    usage: {
      userCount: asNumber(u.userCount),
      activeUsers: asNumber(u.activeUsers),
      projectCount: asNumber(u.projectCount),
      projectLimit: asNumber(u.projectLimit),
    },
    sections: isRecord(data.sections)
      ? {
        entitlement: asString(data.sections.entitlement) ?? "ok",
        subscription: asString(data.sections.subscription) ?? "ok",
        users: asString(data.sections.users) ?? "ok",
        projects: asString(data.sections.projects) ?? "ok",
      }
      : undefined,
  };
}

export async function fetchUserSessionDebug(
  client: InvokeClient | null,
  userId: string,
): Promise<OwnerSessionDebug> {
  const data = await invokeOps(client, {
    action: "getUserSessionDebug",
    userId,
  });
  if (!isRecord(data) || !isRecord(data.user)) {
    throw new OwnerOpsError("bad_response", "Session debug invalid");
  }
  const u = data.user;
  return {
    user: {
      id: asString(u.id) ?? "",
      email: asString(u.email),
      emailConfirmedAt: asString(u.emailConfirmedAt),
      lastSignInAt: asString(u.lastSignInAt),
      createdAt: asString(u.createdAt),
      bannedUntil: asString(u.bannedUntil),
      appMetadataKeys: Array.isArray(u.appMetadataKeys)
        ? u.appMetadataKeys.filter((k): k is string => typeof k === "string")
        : [],
      userMetadataKeys: Array.isArray(u.userMetadataKeys)
        ? u.userMetadataKeys.filter((k): k is string => typeof k === "string")
        : [],
    },
  };
}
