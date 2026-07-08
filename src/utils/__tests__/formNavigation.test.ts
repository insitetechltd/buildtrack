import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
} from "../formNavigation";

describe("formNavigation", () => {
  it("creates a registry from the provided field order", () => {
    const fields = [
      { fieldId: "title", isFocusable: true },
      { fieldId: "description", isFocusable: true },
      { fieldId: "submit", isFocusable: true },
    ];

    expect(createFormNavigationRegistry(fields)).toEqual({ fields });
  });

  it("skips non-focusable fields when moving forward and backward", () => {
    const registry = createFormNavigationRegistry([
      { fieldId: "title", isFocusable: true },
      { fieldId: "description", isFocusable: true },
      { fieldId: "billingStatus", isFocusable: false },
      { fieldId: "submit", isFocusable: true },
    ]);

    expect(getNextFocusableFieldId(registry, "title")).toBe("description");
    expect(getNextFocusableFieldId(registry, "description")).toBe("submit");
    expect(getPreviousFocusableFieldId(registry, "submit")).toBe("description");
  });
});
