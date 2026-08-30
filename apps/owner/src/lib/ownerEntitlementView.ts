export type OwnerEntitlementView = {
  tierSlug: string | null;
  tierDisplayName: string;
  subscriptionStatus: string;
  billingPhase: string;
  hasStripeSubscription: boolean;
  meterLimits: Record<string, number | null>;
  trialEndsAt: string | null;
  statusLabel: string;
  limitsLabel: string;
};

export function formatSeatUsageLine(
  pmUsed: number,
  pmLimit: number,
  workerUsed: number,
  workerLimit: number,
): string {
  return `PM ${pmUsed}/${pmLimit} · Worker ${workerUsed}/${workerLimit}`;
}

export function tasksByStatusToHistogram(
  tasksByStatus: Record<string, number>,
): { bucketUnit: "day"; buckets: { start: string; label: string; count: number }[] } {
  const buckets = Object.entries(tasksByStatus).map(([status, count]) => ({
    start: status,
    label: status.replace(/_/g, " ").slice(0, 6),
    count,
  }));
  return { bucketUnit: "day", buckets };
}
