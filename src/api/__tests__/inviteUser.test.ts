import { copyCompanyInviteLink, inviteCompanyUser } from "../inviteUser";

const mockInvoke = jest.fn();

jest.mock("../supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe("inviteCompanyUser", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns a sign-in link on success", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        userId: "u-1",
        email: "w@example.com",
        signInLink: "taskr://auth/invite?token_hash=abc&type=magiclink",
        seatType: "worker",
      },
      error: null,
    });

    const result = await inviteCompanyUser({
      companyId: "c-1",
      name: "Worker",
      email: "w@example.com",
      seatType: "worker",
    });

    expect(mockInvoke).toHaveBeenCalledWith("invite-user", {
      body: {
        companyId: "c-1",
        name: "Worker",
        email: "w@example.com",
        seatType: "worker",
      },
    });
    expect(result).toEqual({
      success: true,
      userId: "u-1",
      email: "w@example.com",
      signInLink: "taskr://auth/invite?token_hash=abc&type=magiclink",
      seatType: "worker",
    });
  });

  it("surfaces function error payload", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "worker_seat_limit", message: "Worker seat limit reached" },
      error: { message: "Edge Function returned a non-2xx status code" },
    });

    const result = await inviteCompanyUser({
      companyId: "c-1",
      name: "Worker",
      email: "w@example.com",
      seatType: "worker",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Worker seat limit/);
  });

  it("rejects incomplete emails before calling the function", async () => {
    const result = await inviteCompanyUser({
      companyId: "c-1",
      name: "Ben",
      email: "ben@grandly",
      seatType: "worker",
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/full email/i);
  });

  it("surfaces entitlements_missing", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        error: "entitlements_missing",
        message: "Company entitlements are not configured.",
      },
      error: { message: "Edge Function returned a non-2xx status code" },
    });

    const result = await inviteCompanyUser({
      companyId: "c-1",
      name: "Worker",
      email: "w@example.com",
      seatType: "worker",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/entitlements/i);
  });

  it("reads error body from FunctionsHttpError context", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: {
          json: async () => ({ error: "invalid_email" }),
        },
      },
    });

    const result = await inviteCompanyUser({
      companyId: "c-1",
      name: "Ben",
      email: "ben@grandly.com",
      seatType: "worker",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/full email/i);
  });
});

describe("copyCompanyInviteLink", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("requests a fresh link for an existing teammate", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        userId: "u-1",
        email: "w@example.com",
        signInLink: "https://example.supabase.co/functions/v1/invite-open?token_hash=abc",
      },
      error: null,
    });

    const result = await copyCompanyInviteLink({
      companyId: "c-1",
      email: "w@example.com",
    });

    expect(mockInvoke).toHaveBeenCalledWith("invite-user", {
      body: {
        copyLink: true,
        companyId: "c-1",
        email: "w@example.com",
      },
    });
    expect(result.success).toBe(true);
    expect(result.signInLink).toMatch(/invite-open/);
  });

  it("surfaces user_not_found", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "user_not_found" },
      error: { message: "Edge Function returned a non-2xx status code" },
    });

    const result = await copyCompanyInviteLink({
      companyId: "c-1",
      email: "missing@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
