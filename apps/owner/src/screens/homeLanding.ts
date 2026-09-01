import type { OwnerEconomicsSnapshot } from "../lib/fetchOwnerEconomicsSnapshot";
import type { OwnerKpiSnapshot } from "../lib/fetchOwnerKpiSnapshot";
import type {
  OwnerEconomicsStripeSnapshot,
  OwnerMonitoringOpsSnapshot,
  OpsProviderStatus,
} from "../lib/fetchOwnerOpsRead";

export type PulseLevel = "ok" | "watch" | "act" | "unknown";

export type HomeAlert = {
  severity: "p0" | "p1";
  message: string;
  destination: "monitoring" | "economics";
};

function providerName(row: OpsProviderStatus): string {
  return row.name.trim().toLowerCase();
}

/** Core runtime path only — not Stripe/GitHub status pages. */
export function supabaseProvider(
  ops: OwnerMonitoringOpsSnapshot | null,
): OpsProviderStatus | null {
  if (!ops) return null;
  return ops.providers.find((row) => providerName(row) === "supabase") ?? null;
}

export function billingDrift(stripe: OwnerEconomicsStripeSnapshot | null): number {
  if (!stripe?.stripeConfigured) return 0;
  const rec = stripe.reconcile;
  return rec.dbOnly + rec.stripeOnly + rec.statusMismatch;
}

export function deriveHomeAlert(input: {
  ops: OwnerMonitoringOpsSnapshot | null;
  stripe: OwnerEconomicsStripeSnapshot | null;
}): HomeAlert | null {
  const supabase = supabaseProvider(input.ops);
  if (supabase?.state === "unavailable") {
    const label = supabase.name.trim() || "Supabase";
    const titled = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      severity: "p0",
      message: `${titled} unavailable — investigate`,
      destination: "monitoring",
    };
  }

  const drift = billingDrift(input.stripe);
  if (input.stripe?.stripeConfigured && drift > 0) {
    return {
      severity: "p1",
      message: `${drift} subscription${drift === 1 ? "" : "s"} need review`,
      destination: "economics",
    };
  }

  return null;
}

export function derivePulseLevel(input: {
  ops: OwnerMonitoringOpsSnapshot | null;
  alert: HomeAlert | null;
}): PulseLevel {
  if (input.alert?.severity === "p0") return "act";
  if (input.alert?.severity === "p1") return "watch";
  if (!input.ops || input.ops.providers.length === 0) return "unknown";
  const supabase = supabaseProvider(input.ops);
  if (!supabase) return "unknown";
  if (supabase.state === "unavailable") return "act";
  if (supabase.state === "degraded") return "watch";
  if (supabase.state === "operational") return "ok";
  return "unknown";
}

export type MonitoringDotTone = "green" | "amber" | "red";

export function monitoringDotTone(
  state: OpsProviderStatus["state"] | undefined,
): MonitoringDotTone {
  if (state === "unavailable") return "red";
  if (state === "operational") return "green";
  return "amber";
}

export function homeUpdatedLine(
  pulse: PulseLevel,
  iso: string | null | undefined,
  now = Date.now(),
): string {
  if (pulse === "unknown") return "Health unknown — pull to retry";
  return formatUpdatedAgo(iso, now);
}

export function onHomeAlertPress(
  alert: HomeAlert,
  nav: { onOpenMonitoring: () => void; onOpenEconomics: () => void },
): void {
  if (alert.destination === "economics") nav.onOpenEconomics();
  else nav.onOpenMonitoring();
}

export function pulseBadgeLabel(level: PulseLevel): string {
  if (level === "act") return "ACT NOW";
  if (level === "watch") return "WATCH";
  if (level === "unknown") return "UNKNOWN";
  return "OK";
}

export function formatMoneyLabel(
  stripe: OwnerEconomicsStripeSnapshot | null,
): { value: string; caption: string; stripeHint: string } {
  if (!stripe || !stripe.stripeConfigured) {
    return {
      value: "—",
      caption: "est. / mo",
      stripeHint: "Stripe not configured",
    };
  }
  if (stripe.mrrCents == null || stripe.listIncomplete) {
    return {
      value: "withheld",
      caption: "est. / mo",
      stripeHint: "Stripe live",
    };
  }
  const currency = (stripe.currency ?? "HKD").toUpperCase();
  const amount = Math.round(stripe.mrrCents / 100).toLocaleString("en-HK");
  return {
    value: `${currency} ${amount}`,
    caption: "est. / mo",
    stripeHint: "Stripe live",
  };
}

export function trialCount(
  stripe: OwnerEconomicsStripeSnapshot | null,
  economics: OwnerEconomicsSnapshot | null,
): number {
  if (stripe?.stripeConfigured) return stripe.trialCount;
  return economics?.totals.trialsNotEnded ?? 0;
}

export function formatUpdatedAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Updated —";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Updated —";
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}

export function latestGeneratedAt(times: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = 0;
  for (const iso of times) {
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (Number.isFinite(ms) && ms >= bestMs) {
      best = iso;
      bestMs = ms;
    }
  }
  return best;
}

export function withoutSubRowCaption(count: number): string | null {
  if (count <= 0) return null;
  return `${count} without sub row`;
}

export function taskSparklineCounts(kpi: OwnerKpiSnapshot | null): number[] {
  const buckets = kpi?.histograms?.tasks?.buckets;
  if (!buckets || buckets.length === 0) return [];
  return buckets.map((bucket) => bucket.count);
}
