import {
  buildAddSeatConfirm,
  buildRemoveSeatConfirm,
  buildStripeConfirmedAlert,
  normalizeSeatAddonUnitPrice,
  SEAT_ADDON_COPY,
  SEAT_ADDON_FALLBACK_PRICE,
  seatAddonPriceLine,
  seatAddonQtyLine,
  seatAddonRowLine,
} from "../seatAddonCopy";

describe("seatAddonCopy", () => {
  describe("normalizeSeatAddonUnitPrice / seatAddonPriceLine", () => {
    it("turns catalog HK$20/mo into HK$20 / month without duplication", () => {
      expect(normalizeSeatAddonUnitPrice("HK$20/mo")).toBe("HK$20");
      expect(seatAddonPriceLine("HK$20/mo")).toBe("HK$20 / month");
      expect(seatAddonPriceLine("HK$100/mo")).toBe("HK$100 / month");
    });

    it("accepts bare fallback prices and already-clean labels", () => {
      expect(seatAddonPriceLine(SEAT_ADDON_FALLBACK_PRICE.worker)).toBe(
        "HK$20 / month",
      );
      expect(seatAddonPriceLine(SEAT_ADDON_FALLBACK_PRICE.pm)).toBe(
        "HK$100 / month",
      );
      expect(seatAddonPriceLine("HK$20 / month")).toBe("HK$20 / month");
      expect(seatAddonPriceLine("HK$20 / month each")).toBe("HK$20 / month");
      expect(seatAddonPriceLine("HK$20 per month")).toBe("HK$20 / month");
    });

    it("never produces /mo / month duplication", () => {
      const samples = [
        "HK$20/mo",
        "HK$20/mo / month each",
        "HK$100/mo",
        "HK$20",
        "HK$20 / month",
      ];
      for (const sample of samples) {
        const line = seatAddonPriceLine(sample);
        expect(line).not.toMatch(/\/mo/i);
        expect(line).not.toMatch(/\/\s*month\s*\/\s*month/i);
        expect(line).not.toMatch(/month each/i);
        expect(line).toMatch(/\/ month$/);
      }
    });
  });

  it("uses Extra people anatomy labels without pack language", () => {
    expect(SEAT_ADDON_COPY.sectionTitle).toBe("Extra people");
    expect(SEAT_ADDON_COPY.worker.rowLabel).toBe("Extra worker");
    expect(SEAT_ADDON_COPY.pm.rowLabel).toBe("Extra PM");
    expect(seatAddonRowLine({ kind: "worker", priceLabel: "HK$20/mo" })).toBe(
      "Extra worker · HK$20 / month",
    );
    expect(seatAddonRowLine({ kind: "pm", priceLabel: "HK$100/mo" })).toBe(
      "Extra PM · HK$100 / month",
    );
    expect(seatAddonQtyLine(0)).toBe("0 on plan");
    expect(seatAddonQtyLine(1)).toBe("1 on plan");
    expect(seatAddonQtyLine(3)).toBe("3 on plan");
    expect(SEAT_ADDON_COPY.worker.subscribeButton).toBe("View seats on website");
    expect(SEAT_ADDON_COPY.worker.removeButton).toBe("Manage seats on website");
    expect(SEAT_ADDON_COPY.pm.subscribeButton).toBe("View seats on website");
    expect(SEAT_ADDON_COPY.pm.removeButton).toBe("Manage seats on website");
    expect(SEAT_ADDON_COPY.sectionSubtitle).not.toMatch(/pack/i);
  });

  it("add confirm routes seat changes to the website", () => {
    const worker = buildAddSeatConfirm({
      kind: "worker",
      priceLabel: "HK$20/mo",
    });
    expect(worker.title).toBe("Manage seats on the website?");
    expect(worker.message).toContain("Worker");
    expect(worker.message).toContain("HK$20 per month");
    expect(worker.message).not.toMatch(/HK\$20\/mo per month/);
    expect(worker.message).toMatch(/billing page/i);
    expect(worker.confirmLabel).toBe("Open billing page");
  });

  it("remove confirm routes seat changes to the website", () => {
    const worker = buildRemoveSeatConfirm({ kind: "worker" });
    expect(worker.title).toBe("Manage seats on the website?");
    expect(worker.message).toMatch(/billing page/i);
    expect(worker.confirmLabel).toBe("Open billing page");

    const pm = buildRemoveSeatConfirm({ kind: "pm" });
    expect(pm.title).toBe("Manage seats on the website?");
    expect(pm.confirmLabel).toBe("Open billing page");
  });

  it("success banners state Stripe confirmed with clean price lines", () => {
    expect(SEAT_ADDON_COPY.successAdd("worker", "HK$20/mo")).toMatch(
      /Stripe confirmed/i,
    );
    expect(SEAT_ADDON_COPY.successAdd("worker", "HK$20/mo")).toBe(
      "Stripe confirmed: added 1 Worker (HK$20 / month).",
    );
    expect(SEAT_ADDON_COPY.successAdd("pm", "HK$100")).toBe(
      "Stripe confirmed: added 1 PM (HK$100 / month).",
    );
    expect(SEAT_ADDON_COPY.successRemove("worker")).toMatch(/Stripe confirmed/i);
    expect(SEAT_ADDON_COPY.successPendingSync).toMatch(/Stripe confirmed/i);
    expect(SEAT_ADDON_COPY.successPendingSync).not.toMatch(/pull to refresh/i);
  });

  it("builds Stripe confirmation alert with invoice details", () => {
    const alert = buildStripeConfirmedAlert({
      kind: "worker",
      isAdd: true,
      priceLabel: "HK$20/mo",
      confirmation: {
        subscriptionStatus: "trialing",
        subscriptionId: "sub_1234567890abcdef",
        invoiceId: "in_1234567890abcdef",
        invoiceNumber: "INV-0042",
        invoiceStatus: "paid",
        amountDueCents: 0,
        amountPaidCents: 0,
        currency: "hkd",
        paid: true,
        hostedInvoiceUrl: null,
        workerAddonQty: 1,
        pmAddonQty: 0,
        deferredDecrease: false,
        effectiveAt: null,
      },
    });
    expect(alert.title).toBe("Stripe confirmed");
    expect(alert.message).toContain("Stripe confirmed this transaction");
    expect(alert.message).toContain("Added 1 Worker at HK$20 / month");
    expect(alert.message).not.toMatch(/\/mo/i);
    expect(alert.message).toContain("trialing");
    expect(alert.message).toContain("INV-0042");
    expect(alert.message).toMatch(/HK\$0\.00/);
  });
});
