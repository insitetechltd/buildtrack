const mockUserStoreState = {
  updateUser: jest.fn().mockResolvedValue(undefined),
  getUserById: jest.fn(),
  getAllUsers: jest.fn().mockReturnValue([]),
  createUser: jest.fn(),
};

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: {
    getState: () => mockUserStoreState,
  },
}));

jest.mock("@/api/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabase } from "@/api/supabase";
import { useAuthStore } from "@/state/authStore";

describe("auth store runtime normalization", () => {
  const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    } as any);
  });

  it("blocks login for pending users, signs them back out, and surfaces the pending state", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        name: "Pending User",
        email: "pending@example.com",
        role: "worker",
        company_id: "company-1",
        is_pending: true,
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });

    mockedSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1" } as any, session: null as any },
      error: null,
    });
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null } as any);
    mockedSupabase.from.mockReturnValue({ select } as any);

    await expect(
      useAuthStore.getState().login("pending@example.com", "password"),
    ).rejects.toThrow("PENDING_APPROVAL");
    expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("persists systemPermission updates through the legacy role field", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });

    mockedSupabase.from.mockReturnValue({ update } as any);

    useAuthStore.setState({
      user: {
        id: "user-2",
        name: "Member User",
        email: "member@example.com",
        phone: "12345678",
        companyId: "company-1",
        position: "Member",
        role: "worker",
        systemPermission: "member",
        createdAt: "2026-06-20T00:00:00.000Z",
      },
    } as any);

    await useAuthStore.getState().updateUser({
      systemPermission: "admin",
    } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "admin",
      }),
    );
    expect(useAuthStore.getState().user?.systemPermission).toBe("admin");
  });
});
