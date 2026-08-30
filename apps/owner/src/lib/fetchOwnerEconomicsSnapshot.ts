export type OwnerEconomicsTotals = {
  companies: number;
  companiesWithSubscriptionRow: number;
  companiesWithoutSubscriptionRow: number;
  companiesWithStripeSubscriptionId: number;
  trialsNotEnded: number;
};

export type OwnerEconomicsSnapshot = {
  generatedAt: string;
  currencyNote: string;
  stripeDashboardHint: string;
  totals: OwnerEconomicsTotals;
  subscriptionStatusCounts: Record<string, number>;
  entitlementStatusCounts: Record<string, number>;
  billingPhaseCounts: Record<string, number>;
  tierCounts: Record<string, number>;
};

export type OwnerEconomicsErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "server_misconfigured"
  | "internal_error"
  | "network"
  | "bad_response"
  | "not_configured";

export class OwnerEconomicsError extends Error {
  readonly code: OwnerEconomicsErrorCode;
  readonly status?: number;

  constructor(code: OwnerEconomicsErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OwnerEconomicsError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseCountMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const n = asNumber(v);
    if (n !== null) out[k] = n;
  }
  return out;
}

export function parseOwnerEconomicsSnapshot(payload: unknown): OwnerEconomicsSnapshot {
  if (!isRecord(payload) || !isRecord(payload.totals)) {
    throw new OwnerEconomicsError("bad_response", "Economics snapshot invalid");
  }
  const t = payload.totals;
  return {
    generatedAt: asString(payload.generatedAt) ?? "",
    currencyNote: asString(payload.currencyNote) ?? "",
    stripeDashboardHint: asString(payload.stripeDashboardHint) ?? "",
    totals: {
      companies: asNumber(t.companies) ?? 0,
      companiesWithSubscriptionRow: asNumber(t.companiesWithSubscriptionRow) ?? 0,
      companiesWithoutSubscriptionRow:
        asNumber(t.companiesWithoutSubscriptionRow) ?? 0,
      companiesWithStripeSubscriptionId:
        asNumber(t.companiesWithStripeSubscriptionId) ?? 0,
      trialsNotEnded: asNumber(t.trialsNotEnded) ?? 0,
    },
    subscriptionStatusCounts: parseCountMap(payload.subscriptionStatusCounts),
    entitlementStatusCounts: parseCountMap(payload.entitlementStatusCounts),
    billingPhaseCounts: parseCountMap(payload.billingPhaseCounts),
    tierCounts: parseCountMap(payload.tierCounts),
  };
}

type InvokeClient = {
  functions: {
    invoke: (
      name: string,
      options?: { body?: Record<string, unknown> },
    ) => Promise<{ data: unknown; error: { message?: string; context?: Response } | null }>;
  };
};

export async function fetchOwnerEconomicsSnapshot(
  client: InvokeClient | null,
): Promise<OwnerEconomicsSnapshot> {
  if (!client) {
    throw new OwnerEconomicsError("not_configured", "Supabase not configured");
  }
  const { data, error } = await client.functions.invoke("owner-economics-snapshot", {
    body: {},
  });
  if (error) {
    const ctx = error.context;
    if (ctx && typeof (ctx as Response).json === "function") {
      try {
        const errBody = await (ctx as Response).clone().json();
        const status = (ctx as Response).status;
        if (status === 401) {
          throw new OwnerEconomicsError("not_authenticated", "Sign in again", 401);
        }
        if (status === 403) {
          throw new OwnerEconomicsError("forbidden", "Not authorized", 403);
        }
        throw new OwnerEconomicsError(
          "internal_error",
          `Request failed (${status})`,
          status,
        );
      } catch (mapped) {
        if (mapped instanceof OwnerEconomicsError) throw mapped;
      }
    }
    throw new OwnerEconomicsError("network", error.message || "Network error");
  }
  return parseOwnerEconomicsSnapshot(data);
}
