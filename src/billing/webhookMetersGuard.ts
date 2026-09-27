/**
 * Contract for stripe-webhook meter merge (M-BILL-01 polish).
 * Edge `buildMetersSnapshotFromPrice` must match these guards — keep in sync with
 * `supabase/functions/stripe-webhook/index.ts`.
 */

export type MeterMap = Record<string, number | null>;

type RpcError = { message?: string } | null;

/**
 * Interpret admin.rpc('build_entitlements_snapshot_from_price') result.
 * Must destructure { data, error } — awaiting rpc and reading .meters on the
 * whole response yields {} and wipes seat caps on subscription.updated.
 */
export function metersFromEntitlementsRpcResult(
  rpc: { data: unknown; error: RpcError },
  planPriceId: string,
): MeterMap {
  if (rpc.error) {
    throw new Error(
      `build_entitlements_snapshot_from_price failed for ${planPriceId}: ${
        rpc.error.message || "unknown"
      }`,
    );
  }
  return (rpc.data as { meters?: MeterMap } | null)?.meters ?? {};
}

/** Refuse empty merged meters when a base plan price resolved. */
export function assertMergedMetersNonEmpty(
  mergedMeters: MeterMap,
  subscriptionId: string,
  lockedPlanPriceId: string,
): void {
  if (Object.keys(mergedMeters).length === 0) {
    throw new Error(
      `subscription ${subscriptionId} merged meters empty (base=${lockedPlanPriceId})`,
    );
  }
}
