import {
  assertSupabaseReachable,
  isExpectedAnonAccessDenial,
} from "../databaseConfigStore";

describe("databaseConfigStore reachability", () => {
  it("treats anon permission denied on companies as expected (post 02a RLS)", () => {
    expect(
      isExpectedAnonAccessDenial({
        code: "42501",
        message: "permission denied for table companies",
      }),
    ).toBe(true);
    expect(
      isExpectedAnonAccessDenial({
        message: "new row violates row-level security policy",
      }),
    ).toBe(true);
    expect(
      isExpectedAnonAccessDenial({
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
      }),
    ).toBe(false);
  });

  it("assertSupabaseReachable succeeds when auth.getSession works", async () => {
    const client = {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      },
      from: jest.fn(),
    };

    await expect(
      assertSupabaseReachable(client as any, "production"),
    ).resolves.toBeUndefined();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("assertSupabaseReachable accepts companies permission denied fallback", async () => {
    const client = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: null },
          error: { message: "auth route unavailable" },
        })),
      },
      from: jest.fn(() => ({
        select: () => ({
          limit: async () => ({
            data: null,
            error: {
              code: "42501",
              message: "permission denied for table companies",
            },
          }),
        }),
      })),
    };

    await expect(
      assertSupabaseReachable(client as any, "production"),
    ).resolves.toBeUndefined();
  });

  it("assertSupabaseReachable throws on real connectivity failure", async () => {
    const client = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: null },
          error: { message: "Network request failed" },
        })),
      },
      from: jest.fn(() => ({
        select: () => ({
          limit: async () => ({
            data: null,
            error: { message: "Network request failed" },
          }),
        }),
      })),
    };

    await expect(assertSupabaseReachable(client as any, "production")).rejects.toThrow(
      /Failed to connect to production/,
    );
  });
});
