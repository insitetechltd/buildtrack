import type { OwnerEntitlementView } from "./ownerEntitlementView";

export type TenantAction =
  | "listCompanies"
  | "getCompany"
  | "listProjects"
  | "getProject"
  | "listUsers"
  | "getUser";

export type OwnerTenantErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "invalid_action"
  | "invalid_company_id"
  | "invalid_project_id"
  | "invalid_user_id"
  | "not_found"
  | "server_misconfigured"
  | "internal_error"
  | "network"
  | "bad_response"
  | "not_configured";

export class OwnerTenantError extends Error {
  readonly code: OwnerTenantErrorCode;
  readonly status?: number;

  constructor(code: OwnerTenantErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OwnerTenantError";
    this.code = code;
    this.status = status;
  }
}

export type CompanyListItem = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  createdAt: string;
  projectCount: number;
  userCount: number;
};

export type CompanyListResult = {
  companies: CompanyListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CompanyDetail = {
  company: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  entitlement: OwnerEntitlementView;
  usage: {
    pmSeats: number;
    workerSeats: number;
    pmSeatLimit: number;
    workerSeatLimit: number;
    projectCount: number;
    projectLimit: number | null;
  };
  stats: { projects: number; tasks: number; users: number };
};

export type ProjectListItem = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  createdAt: string;
  taskCount: number;
};

export type ProjectListResult = {
  projects: ProjectListItem[];
  truncated: boolean;
  limit: number;
};

export type ProjectDetail = {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    startDate: string;
    endDate: string | null;
    location: string | null;
    budget: number | null;
    companyId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  tasksByStatus: Record<string, number>;
  taskTotal: number;
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  position: string;
  isPending: boolean;
  isActive: boolean;
  seatClass: string;
  createdAt: string;
};

export type UserListResult = {
  users: UserListItem[];
  truncated: boolean;
  limit: number;
};

export type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyId: string | null;
    role: string;
    position: string;
    isPending: boolean;
    isActive: boolean;
    seatClass: string;
    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;
  };
  assignments: {
    projectId: string | null;
    projectName: string;
    projectStatus: string;
    projectRole: string;
    isActive: boolean;
  }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseEntitlement(raw: unknown): OwnerEntitlementView {
  if (!isRecord(raw)) {
    throw new OwnerTenantError("bad_response", "Entitlement missing");
  }
  const meterLimitsRaw = raw.meterLimits;
  const meterLimits: Record<string, number | null> = {};
  if (isRecord(meterLimitsRaw)) {
    for (const [k, v] of Object.entries(meterLimitsRaw)) {
      meterLimits[k] = asNumber(v);
    }
  }
  return {
    tierSlug: asString(raw.tierSlug),
    tierDisplayName: asString(raw.tierDisplayName) ?? "Unknown",
    subscriptionStatus: asString(raw.subscriptionStatus) ?? "unknown",
    billingPhase: asString(raw.billingPhase) ?? "unknown",
    hasStripeSubscription: asBool(raw.hasStripeSubscription),
    meterLimits,
    trialEndsAt: asString(raw.trialEndsAt),
    statusLabel: asString(raw.statusLabel) ?? "",
    limitsLabel: asString(raw.limitsLabel) ?? "",
  };
}

export function parseCompanyListResult(payload: unknown): CompanyListResult {
  if (!isRecord(payload) || !Array.isArray(payload.companies)) {
    throw new OwnerTenantError("bad_response", "Company list invalid");
  }
  const companies: CompanyListItem[] = payload.companies.map((row, i) => {
    if (!isRecord(row)) {
      throw new OwnerTenantError("bad_response", `Company row ${i} invalid`);
    }
    const id = asString(row.id);
    const name = asString(row.name);
    if (!id || !name) {
      throw new OwnerTenantError("bad_response", `Company row ${i} missing id/name`);
    }
    return {
      id,
      name,
      type: asString(row.type) ?? "other",
      isActive: asBool(row.isActive, true),
      email: asString(row.email),
      phone: asString(row.phone),
      createdAt: asString(row.createdAt) ?? "",
      projectCount: asNumber(row.projectCount) ?? 0,
      userCount: asNumber(row.userCount) ?? 0,
    };
  });
  return {
    companies,
    total: asNumber(payload.total) ?? companies.length,
    limit: asNumber(payload.limit) ?? 25,
    offset: asNumber(payload.offset) ?? 0,
  };
}

export function parseCompanyDetail(payload: unknown): CompanyDetail {
  if (!isRecord(payload) || !isRecord(payload.company)) {
    throw new OwnerTenantError("bad_response", "Company detail invalid");
  }
  const c = payload.company;
  const id = asString(c.id);
  const name = asString(c.name);
  if (!id || !name) {
    throw new OwnerTenantError("bad_response", "Company detail missing id/name");
  }
  if (!isRecord(payload.usage) || !isRecord(payload.stats)) {
    throw new OwnerTenantError("bad_response", "Company usage/stats missing");
  }
  const u = payload.usage;
  const s = payload.stats;
  return {
    company: {
      id,
      name,
      type: asString(c.type) ?? "other",
      description: asString(c.description),
      address: asString(c.address),
      phone: asString(c.phone),
      email: asString(c.email),
      website: asString(c.website),
      logo: asString(c.logo),
      isActive: asBool(c.isActive, true),
      createdAt: asString(c.createdAt) ?? "",
      updatedAt: asString(c.updatedAt) ?? "",
    },
    entitlement: parseEntitlement(payload.entitlement),
    usage: {
      pmSeats: asNumber(u.pmSeats) ?? 0,
      workerSeats: asNumber(u.workerSeats) ?? 0,
      pmSeatLimit: asNumber(u.pmSeatLimit) ?? 1,
      workerSeatLimit: asNumber(u.workerSeatLimit) ?? 5,
      projectCount: asNumber(u.projectCount) ?? 0,
      projectLimit: asNumber(u.projectLimit),
    },
    stats: {
      projects: asNumber(s.projects) ?? 0,
      tasks: asNumber(s.tasks) ?? 0,
      users: asNumber(s.users) ?? 0,
    },
  };
}

export function parseProjectListResult(payload: unknown): ProjectListResult {
  if (!isRecord(payload) || !Array.isArray(payload.projects)) {
    throw new OwnerTenantError("bad_response", "Project list invalid");
  }
  const projects = payload.projects.map((row, i) => {
    if (!isRecord(row)) {
      throw new OwnerTenantError("bad_response", `Project row ${i} invalid`);
    }
    const id = asString(row.id);
    const name = asString(row.name);
    if (!id || !name) {
      throw new OwnerTenantError("bad_response", `Project row ${i} missing id/name`);
    }
    return {
      id,
      name,
      status: asString(row.status) ?? "active",
      startDate: asString(row.startDate) ?? "",
      endDate: asString(row.endDate),
      location: asString(row.location),
      createdAt: asString(row.createdAt) ?? "",
      taskCount: asNumber(row.taskCount) ?? 0,
    };
  });
  return {
    projects,
    truncated: asBool(payload.truncated),
    limit: asNumber(payload.limit) ?? 100,
  };
}

export function parseProjectDetail(payload: unknown): ProjectDetail {
  if (!isRecord(payload) || !isRecord(payload.project)) {
    throw new OwnerTenantError("bad_response", "Project detail invalid");
  }
  const p = payload.project;
  const id = asString(p.id);
  const name = asString(p.name);
  if (!id || !name) {
    throw new OwnerTenantError("bad_response", "Project detail missing id/name");
  }
  const tasksByStatus: Record<string, number> = {};
  if (isRecord(payload.tasksByStatus)) {
    for (const [k, v] of Object.entries(payload.tasksByStatus)) {
      tasksByStatus[k] = asNumber(v) ?? 0;
    }
  }
  return {
    project: {
      id,
      name,
      description: asString(p.description) ?? "",
      status: asString(p.status) ?? "active",
      startDate: asString(p.startDate) ?? "",
      endDate: asString(p.endDate),
      location: asString(p.location),
      budget: asNumber(p.budget),
      companyId: asString(p.companyId),
      createdAt: asString(p.createdAt) ?? "",
      updatedAt: asString(p.updatedAt) ?? "",
    },
    tasksByStatus,
    taskTotal: asNumber(payload.taskTotal) ?? 0,
  };
}

export function parseUserListResult(payload: unknown): UserListResult {
  if (!isRecord(payload) || !Array.isArray(payload.users)) {
    throw new OwnerTenantError("bad_response", "User list invalid");
  }
  const users = payload.users.map((row, i) => {
    if (!isRecord(row)) {
      throw new OwnerTenantError("bad_response", `User row ${i} invalid`);
    }
    const id = asString(row.id);
    const name = asString(row.name);
    const email = asString(row.email);
    if (!id || !name || !email) {
      throw new OwnerTenantError("bad_response", `User row ${i} missing fields`);
    }
    return {
      id,
      name,
      email,
      phone: asString(row.phone) ?? "",
      role: asString(row.role) ?? "member",
      position: asString(row.position) ?? "",
      isPending: asBool(row.isPending),
      isActive: asBool(row.isActive, true),
      seatClass: asString(row.seatClass) ?? "worker",
      createdAt: asString(row.createdAt) ?? "",
    };
  });
  return {
    users,
    truncated: asBool(payload.truncated),
    limit: asNumber(payload.limit) ?? 100,
  };
}

export function parseUserDetail(payload: unknown): UserDetail {
  if (!isRecord(payload) || !isRecord(payload.user)) {
    throw new OwnerTenantError("bad_response", "User detail invalid");
  }
  const u = payload.user;
  const id = asString(u.id);
  const name = asString(u.name);
  const email = asString(u.email);
  if (!id || !name || !email) {
    throw new OwnerTenantError("bad_response", "User detail missing fields");
  }
  const assignments = Array.isArray(payload.assignments)
    ? payload.assignments.map((row, i) => {
        if (!isRecord(row)) {
          throw new OwnerTenantError("bad_response", `Assignment ${i} invalid`);
        }
        return {
          projectId: asString(row.projectId),
          projectName: asString(row.projectName) ?? "Unknown",
          projectStatus: asString(row.projectStatus) ?? "",
          projectRole: asString(row.projectRole) ?? "",
          isActive: asBool(row.isActive, true),
        };
      })
    : [];
  return {
    user: {
      id,
      name,
      email,
      phone: asString(u.phone) ?? "",
      companyId: asString(u.companyId),
      role: asString(u.role) ?? "member",
      position: asString(u.position) ?? "",
      isPending: asBool(u.isPending),
      isActive: asBool(u.isActive, true),
      seatClass: asString(u.seatClass) ?? "worker",
      createdAt: asString(u.createdAt) ?? "",
      updatedAt: asString(u.updatedAt) ?? "",
      approvedAt: asString(u.approvedAt),
    },
    assignments,
  };
}

export function mapOwnerTenantHttpError(
  status: number,
  body: unknown,
): OwnerTenantError {
  const code =
    isRecord(body) && typeof body.error === "string" ? body.error : null;
  if (status === 401 || code === "not_authenticated") {
    return new OwnerTenantError("not_authenticated", "Sign in again", 401);
  }
  if (status === 403 || code === "forbidden") {
    return new OwnerTenantError("forbidden", "Not authorized", 403);
  }
  if (status === 404 || code === "not_found") {
    return new OwnerTenantError("not_found", "Not found", 404);
  }
  if (status === 400 || code === "invalid_action") {
    return new OwnerTenantError("invalid_action", "Invalid request", 400);
  }
  return new OwnerTenantError(
    "internal_error",
    `Request failed (${status})`,
    status,
  );
}

type InvokeClient = {
  functions: {
    invoke: (
      name: string,
      options: { body: Record<string, unknown> },
    ) => Promise<{ data: unknown; error: { message?: string; context?: Response } | null }>;
  };
};

async function invokeTenant<T>(
  client: InvokeClient,
  body: Record<string, unknown>,
  parse: (payload: unknown) => T,
): Promise<T> {
  const { data, error } = await client.functions.invoke("owner-tenant-read", {
    body,
  });
  if (error) {
    const ctx = error.context;
    if (ctx && typeof (ctx as Response).json === "function") {
      try {
        const errBody = await (ctx as Response).clone().json();
        throw mapOwnerTenantHttpError((ctx as Response).status, errBody);
      } catch (mapped) {
        if (mapped instanceof OwnerTenantError) throw mapped;
      }
    }
    throw new OwnerTenantError("network", error.message || "Network error");
  }
  return parse(data);
}

export async function fetchCompanyList(
  client: InvokeClient | null,
  opts?: { query?: string; limit?: number; offset?: number },
): Promise<CompanyListResult> {
  if (!client) {
    throw new OwnerTenantError("not_configured", "Supabase not configured");
  }
  return invokeTenant(
    client,
    {
      action: "listCompanies",
      query: opts?.query ?? "",
      limit: opts?.limit ?? 25,
      offset: opts?.offset ?? 0,
    },
    parseCompanyListResult,
  );
}

export async function fetchCompanyDetail(
  client: InvokeClient | null,
  companyId: string,
): Promise<CompanyDetail> {
  if (!client) {
    throw new OwnerTenantError("not_configured", "Supabase not configured");
  }
  return invokeTenant(
    client,
    { action: "getCompany", companyId },
    parseCompanyDetail,
  );
}

export async function fetchProjectList(
  client: InvokeClient | null,
  companyId: string,
): Promise<ProjectListResult> {
  if (!client) {
    throw new OwnerTenantError("not_configured", "Supabase not configured");
  }
  return invokeTenant(
    client,
    { action: "listProjects", companyId },
    parseProjectListResult,
  );
}

export async function fetchProjectDetail(
  client: InvokeClient | null,
  projectId: string,
  companyId: string,
): Promise<ProjectDetail> {
  if (!client) {
    throw new OwnerTenantError("not_configured", "Supabase not configured");
  }
  return invokeTenant(
    client,
    { action: "getProject", projectId, companyId },
    parseProjectDetail,
  );
}

export async function fetchUserList(
  client: InvokeClient | null,
  companyId: string,
): Promise<UserListResult> {
  if (!client) {
    throw new OwnerTenantError("not_configured", "Supabase not configured");
  }
  return invokeTenant(
    client,
    { action: "listUsers", companyId },
    parseUserListResult,
  );
}

export async function fetchUserDetail(
  client: InvokeClient | null,
  userId: string,
  companyId: string,
): Promise<UserDetail> {
  if (!client) {
    throw new OwnerTenantError("not_configured", "Supabase not configured");
  }
  return invokeTenant(
    client,
    { action: "getUser", userId, companyId },
    parseUserDetail,
  );
}
