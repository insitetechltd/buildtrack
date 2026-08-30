export type OwnerTenantWriteErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "invalid_action"
  | "invalid_company_id"
  | "invalid_user_id"
  | "invalid_email"
  | "invalid_name"
  | "company_not_found"
  | "company_switch_forbidden"
  | "email_exists"
  | "pm_seat_limit"
  | "worker_seat_limit"
  | "seat_limit"
  | "cannot_deactivate_sole_admin"
  | "not_found"
  | "internal_error"
  | "network"
  | "bad_response"
  | "not_configured";

export class OwnerTenantWriteError extends Error {
  readonly code: OwnerTenantWriteErrorCode;
  readonly status?: number;

  constructor(code: OwnerTenantWriteErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OwnerTenantWriteError";
    this.code = code;
    this.status = status;
  }
}

export type CreatedOwnerUser = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
  seatClass: string;
  isActive: boolean;
};

export type DeactivatedOwnerUser = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  isActive: boolean;
  alreadyInactive?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseCreateUserResult(payload: unknown): CreatedOwnerUser {
  if (!isRecord(payload) || !isRecord(payload.user)) {
    throw new OwnerTenantWriteError("bad_response", "Create user response invalid");
  }
  const u = payload.user;
  const id = asString(u.id);
  const email = asString(u.email);
  const name = asString(u.name);
  const companyId = asString(u.companyId);
  if (!id || !email || !name || !companyId) {
    throw new OwnerTenantWriteError("bad_response", "Create user missing fields");
  }
  return {
    id,
    email,
    name,
    companyId,
    role: asString(u.role) ?? "worker",
    seatClass: asString(u.seatClass) ?? "worker",
    isActive: asBool(u.isActive, true),
  };
}

export function parseDeactivateUserResult(payload: unknown): DeactivatedOwnerUser {
  if (!isRecord(payload) || !isRecord(payload.user)) {
    throw new OwnerTenantWriteError("bad_response", "Deactivate response invalid");
  }
  const u = payload.user;
  const id = asString(u.id);
  const email = asString(u.email) ?? "";
  const name = asString(u.name) ?? "";
  const companyId = asString(u.companyId);
  if (!id || !companyId) {
    throw new OwnerTenantWriteError("bad_response", "Deactivate missing fields");
  }
  return {
    id,
    email,
    name,
    companyId,
    isActive: asBool(u.isActive, false),
    alreadyInactive: asBool(u.alreadyInactive),
  };
}

function mapWriteHttpError(status: number, body: unknown): OwnerTenantWriteError {
  const code =
    isRecord(body) && typeof body.error === "string"
      ? (body.error as OwnerTenantWriteErrorCode)
      : "internal_error";
  const detail =
    isRecord(body) && typeof body.message === "string"
      ? body.message
      : isRecord(body) && typeof body.detail === "string"
      ? body.detail
      : `Request failed (${status})`;

  if (status === 401) {
    return new OwnerTenantWriteError("not_authenticated", "Sign in again", 401);
  }
  if (status === 403) {
    return new OwnerTenantWriteError("forbidden", "Not authorized", 403);
  }
  if (status === 404) {
    return new OwnerTenantWriteError("not_found", "Not found", 404);
  }
  if (
    code === "pm_seat_limit" ||
    code === "worker_seat_limit" ||
    code === "seat_limit" ||
    code === "cannot_deactivate_sole_admin" ||
    code === "email_exists" ||
    code === "company_switch_forbidden"
  ) {
    return new OwnerTenantWriteError(code, detail, status);
  }
  return new OwnerTenantWriteError(
    code in {
      invalid_action: 1,
      invalid_company_id: 1,
      invalid_user_id: 1,
      invalid_email: 1,
      invalid_name: 1,
      company_not_found: 1,
    }
      ? code
      : "internal_error",
    detail,
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

async function invokeWrite<T>(
  client: InvokeClient,
  body: Record<string, unknown>,
  parse: (payload: unknown) => T,
): Promise<T> {
  const { data, error } = await client.functions.invoke("owner-tenant-write", {
    body,
  });
  if (error) {
    const ctx = error.context;
    if (ctx && typeof (ctx as Response).json === "function") {
      try {
        const errBody = await (ctx as Response).clone().json();
        throw mapWriteHttpError((ctx as Response).status, errBody);
      } catch (mapped) {
        if (mapped instanceof OwnerTenantWriteError) throw mapped;
      }
    }
    throw new OwnerTenantWriteError("network", error.message || "Network error");
  }
  return parse(data);
}

export async function createOwnerTenantUser(
  client: InvokeClient | null,
  opts: {
    companyId: string;
    email: string;
    name: string;
    seatClass: "pm" | "worker";
  },
): Promise<CreatedOwnerUser> {
  if (!client) {
    throw new OwnerTenantWriteError("not_configured", "Supabase not configured");
  }
  return invokeWrite(
    client,
    {
      action: "createUser",
      companyId: opts.companyId,
      email: opts.email,
      name: opts.name,
      seatClass: opts.seatClass,
    },
    parseCreateUserResult,
  );
}

export async function deactivateOwnerTenantUser(
  client: InvokeClient | null,
  opts: { companyId: string; userId: string },
): Promise<DeactivatedOwnerUser> {
  if (!client) {
    throw new OwnerTenantWriteError("not_configured", "Supabase not configured");
  }
  return invokeWrite(
    client,
    {
      action: "deactivateUser",
      companyId: opts.companyId,
      userId: opts.userId,
    },
    parseDeactivateUserResult,
  );
}
