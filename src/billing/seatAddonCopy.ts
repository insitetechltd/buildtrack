/**
 * Customer-facing copy for Extra Worker / Extra PM add-ons (M-BILL-01).
 * Keep wording aligned with CompanyPlanScreen — no "pack" language.
 */

export type SeatAddonKind = "worker" | "pm";

export const SEAT_ADDON_FALLBACK_PRICE = {
  worker: "HK$20",
  pm: "HK$100",
} as const;

export type StripeAddonConfirmation = {
  subscriptionStatus: string;
  subscriptionId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  amountDueCents: number | null;
  amountPaidCents: number | null;
  currency: string | null;
  paid: boolean;
  hostedInvoiceUrl: string | null;
  workerAddonQty: number;
  pmAddonQty: number;
  deferredDecrease: boolean;
  effectiveAt: string | null;
};

export const SEAT_ADDON_COPY = {
  sectionTitle: "Extra people",
  sectionSubtitle: "Each add is 1 person. Billed monthly — confirm before we charge.",
  worker: {
    rowLabel: "Extra worker",
    /** Primary subscribe CTA — definitive charge path (not a vague stepper). */
    subscribeButton: "Subscribe +1 Worker",
    /** @deprecated Prefer subscribeButton */
    addButton: "Subscribe +1 Worker",
    removeButton: "Remove Worker",
    roleWord: "Worker",
  },
  pm: {
    rowLabel: "Extra PM",
    subscribeButton: "Subscribe +1 PM",
    /** @deprecated Prefer subscribeButton */
    addButton: "Subscribe +1 PM",
    removeButton: "Remove PM",
    roleWord: "PM",
  },
  updating: "Updating seats…",
  successPendingSync:
    "Stripe confirmed the change. Seat limits will finish updating shortly.",
  successAdd: (kind: SeatAddonKind, priceLabel: string) =>
    `Stripe confirmed: added 1 ${kind === "worker" ? "Worker" : "PM"} (${seatAddonPriceLine(priceLabel)}).`,
  successRemove: (kind: SeatAddonKind) =>
    `Stripe confirmed: remove 1 ${kind === "worker" ? "Worker" : "PM"} scheduled. Limit updates at end of billing cycle.`,
} as const;

/**
 * Strip catalog `/mo`, `/month`, `per month`, `each` so we never double-suffix.
 * Returns a bare money token like `HK$20`.
 */
export function normalizeSeatAddonUnitPrice(priceLabel: string): string {
  let s = String(priceLabel ?? "").trim();
  if (!s) return s;

  // Order matters: longer phrases before short `/mo`.
  s = s.replace(/\s*\/\s*month\b/gi, "");
  s = s.replace(/\s*\/\s*mo\b/gi, "");
  s = s.replace(/\s+per\s+month\b/gi, "");
  s = s.replace(/\s+each\b/gi, "");
  s = s.replace(/[,\s]+$/g, "").replace(/\s+/g, " ").trim();
  return s || String(priceLabel).trim();
}

/** Canonical customer price: `HK$20 / month` (never `HK$20/mo / month each`). */
export function seatAddonPriceLine(priceLabel: string): string {
  const unit = normalizeSeatAddonUnitPrice(priceLabel);
  return `${unit} / month`;
}

export function seatAddonQtyLine(qty: number): string {
  const n = Math.max(0, Math.floor(qty));
  return n === 1 ? "1 on plan" : `${n} on plan`;
}

/** Compact a11y / legacy one-liner: `Extra worker · HK$20 / month`. */
export function seatAddonRowLine(args: {
  kind: SeatAddonKind;
  priceLabel: string;
}): string {
  return `${SEAT_ADDON_COPY[args.kind].rowLabel} · ${seatAddonPriceLine(args.priceLabel)}`;
}

export function buildAddSeatConfirm(args: {
  kind: SeatAddonKind;
  priceLabel: string;
}): { title: string; message: string; confirmLabel: string } {
  const role = SEAT_ADDON_COPY[args.kind].roleWord;
  const unit = normalizeSeatAddonUnitPrice(args.priceLabel);
  return {
    title: `Subscribe +1 ${role}?`,
    message:
      `This adds 1 ${role} to your company plan bill at ${unit} per month ` +
      `(prorated for the rest of this billing cycle).`,
    confirmLabel: "Subscribe",
  };
}

export function buildRemoveSeatConfirm(args: {
  kind: SeatAddonKind;
}): { title: string; message: string; confirmLabel: string } {
  const role = SEAT_ADDON_COPY[args.kind].roleWord;
  return {
    title: `Remove 1 ${role}?`,
    message:
      `No pro-rata or partial refund for this cycle. ` +
      `Your ${role} limit and monthly bill recalculate at the end of this billing cycle.`,
    confirmLabel: "Confirm",
  };
}

function formatStripeMoney(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (cents == null || !Number.isFinite(cents)) {
    return null;
  }
  const code = (currency || "HKD").toUpperCase();
  const amount = (Math.abs(cents) / 100).toFixed(2);
  if (code === "HKD") {
    return `HK$${amount}`;
  }
  return `${code} ${amount}`;
}

function shortStripeId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/**
 * Modal copy after Stripe accepts an add-on change.
 * Prefer invoice/status from the edge confirmation payload.
 */
export function buildStripeConfirmedAlert(args: {
  kind: SeatAddonKind;
  isAdd: boolean;
  priceLabel: string;
  confirmation?: StripeAddonConfirmation | null;
}): { title: string; message: string } {
  const role = SEAT_ADDON_COPY[args.kind].roleWord;
  const conf = args.confirmation;

  if (args.isAdd) {
    const lines = [
      `Stripe confirmed this transaction.`,
      `Added 1 ${role} at ${seatAddonPriceLine(args.priceLabel)}.`,
    ];
    if (conf?.subscriptionStatus) {
      lines.push(`Subscription: ${conf.subscriptionStatus}.`);
    }
    const invoiceRef = conf?.invoiceNumber || shortStripeId(conf?.invoiceId);
    if (invoiceRef) {
      lines.push(`Invoice: ${invoiceRef}${conf?.invoiceStatus ? ` (${conf.invoiceStatus})` : ""}.`);
    }
    const paidAmount = formatStripeMoney(
      conf?.amountPaidCents ?? conf?.amountDueCents,
      conf?.currency,
    );
    if (paidAmount != null) {
      if (conf?.paid || conf?.amountDueCents === 0 || conf?.amountPaidCents === 0) {
        lines.push(
          conf?.subscriptionStatus === "trialing" &&
            (conf.amountDueCents === 0 || conf.amountPaidCents === 0)
            ? `Charge now: ${paidAmount} (no charge during trial / $0 proration).`
            : `Charge: ${paidAmount}${conf?.paid ? " · paid" : ""}.`,
        );
      } else if (conf?.amountDueCents && conf.amountDueCents > 0) {
        lines.push(`Amount due: ${paidAmount}.`);
      }
    } else if (conf?.subscriptionStatus === "trialing") {
      lines.push(`No charge during trial; seats are active now.`);
    }
    return {
      title: "Stripe confirmed",
      message: lines.join("\n"),
    };
  }

  const lines = [
    `Stripe confirmed this change.`,
    `Remove 1 ${role} is scheduled — no refund this cycle.`,
  ];
  if (conf?.effectiveAt) {
    const when = new Date(conf.effectiveAt);
    if (!Number.isNaN(when.getTime())) {
      lines.push(`Takes effect: ${when.toLocaleDateString()}.`);
    }
  } else {
    lines.push(`Limit and bill update at the end of this billing cycle.`);
  }
  if (conf?.subscriptionStatus) {
    lines.push(`Subscription: ${conf.subscriptionStatus}.`);
  }
  return {
    title: "Stripe confirmed",
    message: lines.join("\n"),
  };
}
