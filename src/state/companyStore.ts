import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Company, CompanyType } from "../types/buildtrack";


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
  updateCompanyBanner: (companyId: string, banner: Company['banner']) => Promise<void>;
  getCompanyBanner: (companyId: string) => Company['banner'] | undefined;

  // User-company relationships
  getUsersByCompany: (companyId: string, users: any[]) => any[];
  getCompanyStats: (companyId: string, users: any[]) => {
    totalUsers: number;
    usersByRole: Record<string, number>;
    isActive: boolean;
  };
}

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set, get) => ({
      companies: [], // No mock data fallback - Supabase only
      company: null,
      companyStats: null,
      isLoading: false,
      error: null,

      // FETCH from Supabase
      fetchCompanies: async () => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ companies: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('is_active', true)
            .order('name');

          if (error) throw error;

          set({ 
            companies: data || [], 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching companies:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchCompanyById: async (id: string) => {
        if (!supabase) {
          return get().getCompanyById(id) || null;
        }

        try {
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return data;
        } catch (error: any) {
          console.error('Error fetching company:', error);
          return null;
        }
      },

      // Fetch single company (for tests)
      fetchCompany: async (id: string) => {
        const company = await get().fetchCompanyById(id);
        if (company) {
          set({ company });
        }
      },

      // Fetch company users (for tests)
      fetchCompanyUsers: async (companyId: string) => {
        if (!supabase) {
          return [];
        }

        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('company_id', companyId);

          if (error) throw error;
          return data || [];
        } catch (error: any) {
          console.error('Error fetching company users:', error);
          return [];
        }
      },

      // LOCAL getters (work with cached data)
      getAllCompanies: () => {
        return get().companies;
      },

      getCompanyById: (id) => {
        return get().companies.find(company => company.id === id);
      },

      getCompaniesByType: (type) => {
        return get().companies.filter(company => company.type === type);
      },

      getActiveCompanies: () => {
        return get().companies.filter(company => company.isActive);
      },

      // CREATE company in Supabase
      createCompany: async (companyData) => {
        if (!supabase) {
          // Fallback to local creation
          const newCompany: Company = {
            ...companyData,
            id: `comp-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };

          set(state => ({
            companies: [...state.companies, newCompany]
          }));

          return newCompany.id;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('companies')
            .insert({
              ...companyData,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set(state => ({
            companies: [...state.companies, data],
            isLoading: false,
          }));

          return data.id;
        } catch (error: any) {
          console.error('Error creating company:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // UPDATE company in Supabase
      updateCompany: async (id, updates) => {
        if (!supabase) {
          // Fallback to local update
          set(state => ({
            companies: state.companies.map(company =>
              company.id === id
                ? { ...company, ...updates }
                : company
            )
          }));
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('companies')
            .update(updates)
            .eq('id', id);

          if (error) throw error;

          // Update local state
          set(state => ({
            companies: state.companies.map(company =>
              company.id === id 
                ? { ...company, ...updates } 
                : company
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          console.error('Error updating company:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      updateCompanyBanner: async (companyId, banner) => {
        await get().updateCompany(companyId, { banner });
      },

      getCompanyBanner: (companyId) => {
        const company = get().getCompanyById(companyId);
        return company?.banner;
      },

      // DELETE (soft delete)
      deleteCompany: async (id) => {
        await get().updateCompany(id, { isActive: false });
      },

      getUsersByCompany: (companyId, users) => {
        return users.filter(user => user.companyId === companyId);
      },

      getCompanyStats: (companyId, users) => {
        const companyUsers = users.filter(user => user.companyId === companyId);
        const company = get().companies.find(c => c.id === companyId);

        const usersByRole = companyUsers.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

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
        // Only persist companies, not loading/error states
        companies: state.companies,
      }),
    }
  )
);