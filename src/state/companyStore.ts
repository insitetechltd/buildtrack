import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Company, CompanyType } from "../types/buildtrack";

function normalizeBanner(raw: unknown): Company["banner"] | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const banner = raw as Record<string, unknown>;
  return {
    text: typeof banner.text === "string" ? banner.text : "",
    backgroundColor:
      typeof banner.backgroundColor === "string"
        ? banner.backgroundColor
        : typeof banner.background_color === "string"
          ? banner.background_color
          : "#3b82f6",
    textColor:
      typeof banner.textColor === "string"
        ? banner.textColor
        : typeof banner.text_color === "string"
          ? banner.text_color
          : "#ffffff",
    isVisible:
      typeof banner.isVisible === "boolean"
        ? banner.isVisible
        : typeof banner.is_visible === "boolean"
          ? banner.is_visible
          : true,
    imageStoragePath:
      typeof banner.imageStoragePath === "string"
        ? banner.imageStoragePath
        : typeof banner.image_storage_path === "string"
          ? banner.image_storage_path
          : undefined,
    imageUri:
      typeof banner.imageUri === "string"
        ? banner.imageUri
        : typeof banner.image_uri === "string"
          ? banner.image_uri
          : undefined,
  };
}

/** Map a companies row (snake_case or camelCase) into the app Company shape. */
export function normalizeCompany(row: Record<string, unknown> | Company | null | undefined): Company | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  if (!id) {
    return null;
  }

  return {
    id,
    name: typeof r.name === "string" ? r.name : "",
    type: (r.type as CompanyType) || "general_contractor",
    description: typeof r.description === "string" ? r.description : undefined,
    address: typeof r.address === "string" ? r.address : undefined,
    phone: typeof r.phone === "string" ? r.phone : undefined,
    email: typeof r.email === "string" ? r.email : undefined,
    website: typeof r.website === "string" ? r.website : undefined,
    logo: typeof r.logo === "string" ? r.logo : undefined,
    taxId:
      typeof r.taxId === "string"
        ? r.taxId
        : typeof r.tax_id === "string"
          ? r.tax_id
          : undefined,
    licenseNumber:
      typeof r.licenseNumber === "string"
        ? r.licenseNumber
        : typeof r.license_number === "string"
          ? r.license_number
          : undefined,
    insuranceExpiry:
      typeof r.insuranceExpiry === "string"
        ? r.insuranceExpiry
        : typeof r.insurance_expiry === "string"
          ? r.insurance_expiry
          : undefined,
    banner: normalizeBanner(r.banner),
    createdAt:
      typeof r.createdAt === "string"
        ? r.createdAt
        : typeof r.created_at === "string"
          ? r.created_at
          : new Date().toISOString(),
    createdBy:
      typeof r.createdBy === "string"
        ? r.createdBy
        : typeof r.created_by === "string"
          ? r.created_by
          : "",
    isActive:
      typeof r.isActive === "boolean"
        ? r.isActive
        : typeof r.is_active === "boolean"
          ? r.is_active
          : true,
  };
}

function upsertCompanyList(companies: Company[], company: Company): Company[] {
  const index = companies.findIndex((item) => item.id === company.id);
  if (index < 0) {
    return [...companies, company];
  }
  const next = [...companies];
  next[index] = { ...next[index], ...company };
  return next;
}

/** Persistable banner payload — strips ephemeral local image URIs. */
export function toPersistedCompanyBanner(
  banner: Company["banner"] | undefined,
): Company["banner"] | undefined {
  if (!banner) {
    return undefined;
  }
  const imageStoragePath = banner.imageStoragePath?.trim() || undefined;
  const imageUri = banner.imageUri?.trim() || undefined;
  const durableUri =
    imageUri &&
    !/^(file:|content:|data:|asset:|ph:|assets-library:)/i.test(imageUri) &&
    !imageStoragePath
      ? imageUri
      : undefined;

  return {
    text: banner.text || "",
    backgroundColor: banner.backgroundColor,
    textColor: banner.textColor,
    isVisible: banner.isVisible,
    ...(imageStoragePath ? { imageStoragePath } : {}),
    ...(durableUri ? { imageUri: durableUri } : {}),
  };
}

interface CompanyStore {
  companies: Company[];
  company: Company | null;
  companyStats: {
    totalUsers: number;
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
  } | null;
  isLoading: boolean;
  error: string | null;

  // Fetching
  fetchCompanies: () => Promise<void>;
  fetchCompany: (id: string) => Promise<void>;
  fetchCompanyById: (id: string) => Promise<Company | null>;
  ensureCompanyLoaded: (id: string) => Promise<Company | null>;
  fetchCompanyUsers: (companyId: string) => Promise<any[]>;

  // Getters (local state)
  getAllCompanies: () => Company[];
  getCompanyById: (id: string) => Company | undefined;
  getCompaniesByType: (type: CompanyType) => Company[];
  getActiveCompanies: () => Company[];

  // Mutations
  createCompany: (company: Omit<Company, "id" | "createdAt">) => Promise<string>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  // Banner management
  updateCompanyBanner: (companyId: string, banner: Company["banner"]) => Promise<void>;
  getCompanyBanner: (companyId: string) => Company["banner"] | undefined;

  // User-company relationships
  getUsersByCompany: (companyId: string, users: any[]) => any[];
  getCompanyStats: (
    companyId: string,
    users: any[],
  ) => {
    totalUsers: number;
    usersByRole: Record<string, number>;
    isActive: boolean;
  };
}

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set, get) => ({
      companies: [],
      company: null,
      companyStats: null,
      isLoading: false,
      error: null,

      fetchCompanies: async () => {
        if (!supabase) {
          console.error("Supabase not configured, no data available");
          set({ companies: [], isLoading: false, error: "Supabase not configured" });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("companies")
            .select("*")
            .eq("is_active", true)
            .order("name");

          if (error) throw error;

          const companies = (data || [])
            .map((row) => normalizeCompany(row as Record<string, unknown>))
            .filter((row): row is Company => Boolean(row));

          set({
            companies,
            isLoading: false,
          });
        } catch (error: any) {
          console.error("Error fetching companies:", error);
          set({
            error: error.message,
            isLoading: false,
            companies: [],
          });
        }
      },

      fetchCompanyById: async (id) => {
        if (!supabase) {
          return get().getCompanyById(id) || null;
        }

        try {
          const { data, error } = await supabase
            .from("companies")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;
          const company = normalizeCompany(data as Record<string, unknown>);
          if (company) {
            set((state) => ({
              companies: upsertCompanyList(state.companies, company),
              company,
            }));
          }
          return company;
        } catch (error: any) {
          console.error("Error fetching company:", error);
          return null;
        }
      },

      ensureCompanyLoaded: async (id) => {
        if (!id) {
          return null;
        }
        const existing = get().getCompanyById(id);
        if (existing?.banner !== undefined || existing?.name) {
          // Still refresh in background so banner edits propagate to other seats
          void get().fetchCompanyById(id);
          return existing;
        }
        return get().fetchCompanyById(id);
      },

      fetchCompany: async (id) => {
        await get().fetchCompanyById(id);
      },

      fetchCompanyUsers: async (companyId) => {
        if (!supabase) {
          return [];
        }

        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("company_id", companyId);

          if (error) throw error;
          return data || [];
        } catch (error: any) {
          console.error("Error fetching company users:", error);
          return [];
        }
      },

      getAllCompanies: () => {
        return get().companies;
      },

      getCompanyById: (id) => {
        return get().companies.find((company) => company.id === id);
      },

      getCompaniesByType: (type) => {
        return get().companies.filter((company) => company.type === type);
      },

      getActiveCompanies: () => {
        return get().companies.filter((company) => company.isActive);
      },

      createCompany: async (companyData) => {
        if (!supabase) {
          const newCompany: Company = {
            ...companyData,
            id: `comp-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            companies: [...state.companies, newCompany],
          }));

          return newCompany.id;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("companies")
            .insert({
              ...companyData,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;

          const company = normalizeCompany(data as Record<string, unknown>) || (data as Company);
          set((state) => ({
            companies: upsertCompanyList(state.companies, company),
            isLoading: false,
          }));

          return company.id;
        } catch (error: any) {
          console.error("Error creating company:", error);
          set({
            error: error.message,
            isLoading: false,
          });
          throw error;
        }
      },

      updateCompany: async (id, updates) => {
        if (!supabase) {
          set((state) => ({
            companies: state.companies.map((company) =>
              company.id === id ? { ...company, ...updates } : company,
            ),
          }));
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const dbUpdates: Record<string, unknown> = { ...updates };
          if ("isActive" in updates) {
            dbUpdates.is_active = updates.isActive;
            delete dbUpdates.isActive;
          }
          if ("createdAt" in updates) {
            dbUpdates.created_at = updates.createdAt;
            delete dbUpdates.createdAt;
          }
          if ("createdBy" in updates) {
            dbUpdates.created_by = updates.createdBy;
            delete dbUpdates.createdBy;
          }
          if ("banner" in updates) {
            dbUpdates.banner = toPersistedCompanyBanner(updates.banner);
          }

          const { error } = await supabase.from("companies").update(dbUpdates).eq("id", id);

          if (error) throw error;

          set((state) => ({
            companies: state.companies.map((company) =>
              company.id === id
                ? {
                    ...company,
                    ...updates,
                    ...(updates.banner !== undefined
                      ? { banner: toPersistedCompanyBanner(updates.banner) }
                      : {}),
                  }
                : company,
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          console.error("Error updating company:", error);
          set({
            error: error.message,
            isLoading: false,
          });
          throw error;
        }
      },

      updateCompanyBanner: async (companyId, banner) => {
        await get().updateCompany(companyId, { banner: toPersistedCompanyBanner(banner) });
      },

      getCompanyBanner: (companyId) => {
        const company = get().getCompanyById(companyId);
        return company?.banner;
      },

      deleteCompany: async (id) => {
        await get().updateCompany(id, { isActive: false });
      },

      getUsersByCompany: (companyId, users) => {
        return users.filter((user) => user.companyId === companyId);
      },

      getCompanyStats: (companyId, users) => {
        const companyUsers = users.filter((user) => user.companyId === companyId);
        const company = get().companies.find((c) => c.id === companyId);

        const usersByRole = companyUsers.reduce(
          (acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        return {
          totalUsers: companyUsers.length,
          usersByRole,
          isActive: company?.isActive || false,
        };
      },
    }),
    {
      name: "buildtrack-companies",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        companies: state.companies,
      }),
    },
  ),
);
