import { supabaseProjectRefFromUrl } from "../supabaseProjectRef";

describe("supabaseProjectRefFromUrl", () => {
  it("extracts project ref from supabase host", () => {
    expect(
      supabaseProjectRefFromUrl("https://jcnzjigxgkzhjsaekoqz.supabase.co"),
    ).toBe("jcnzjigxgkzhjsaekoqz");
  });

  it("returns null for empty / invalid", () => {
    expect(supabaseProjectRefFromUrl("")).toBeNull();
    expect(supabaseProjectRefFromUrl(undefined)).toBeNull();
    expect(supabaseProjectRefFromUrl("not-a-url")).toBeNull();
  });
});
