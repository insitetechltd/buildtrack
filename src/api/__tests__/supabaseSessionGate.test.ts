import { getSessionScopedSupabase } from "../supabaseSessionGate";

jest.mock("../supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

import { supabase } from "../supabase";

describe("getSessionScopedSupabase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when there is no access token (anon would 42501)", async () => {
    (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await expect(getSessionScopedSupabase()).resolves.toBeNull();
  });

  it("returns the client when a JWT session is present", async () => {
    (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    await expect(getSessionScopedSupabase()).resolves.toBe(supabase);
  });

  it("waitForSessionScopedSupabase resolves once a session appears", async () => {
    const { waitForSessionScopedSupabase } = require("../supabaseSessionGate");
    (supabase!.auth.getSession as jest.Mock)
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({
        data: { session: { access_token: "tok" } },
        error: null,
      });
    await expect(waitForSessionScopedSupabase(1000, 10)).resolves.toBe(supabase);
  });
});
