import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";

type SectionFilter = "my_tasks" | "inbox" | "outbox" | "my_work" | "all";
type StatusFilter =
  | "not_started"
  | "in_progress"
  | "completed"
  | "rejected"
  | "pending"
  | "overdue"
  | "wip"
  | "done"
  | "received"
  | "reviewing"
  | "assigned"
  | "all";
type SortDirection = "asc" | "desc";
type SortUpdater = SortDirection | null | ((prev: SortDirection | null) => SortDirection | null);

interface ProjectFilterState {
  selectedProjectId: string | null;
  sectionFilter: SectionFilter;
  statusFilter: StatusFilter;
  buttonLabel: string | null; // The label from the Dashboard button
  showSelfAssignedOnly: boolean;
  sortByPriority: SortDirection | null;
  sortByDueDate: SortDirection | null;
  
  // Per-user last selected projects
  lastSelectedProjects: Record<string, string>; // userId -> projectId
  
  setSelectedProject: (projectId: string | null, userId?: string) => Promise<void>;
  setSectionFilter: (section: SectionFilter) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setButtonLabel: (label: string | null) => void;
  setShowSelfAssignedOnly: (value: boolean) => void;
  setSortByPriority: (updater: SortUpdater) => void;
  setSortByDueDate: (updater: SortUpdater) => void;
  resetFilters: () => void;
  getLastSelectedProject: (userId: string) => Promise<string | null>;
}

export const useProjectFilterStore = create<ProjectFilterState>()(
  persist(
    (set, get) => ({
      selectedProjectId: null,
      sectionFilter: "all",
      statusFilter: "all",
      buttonLabel: null,
      showSelfAssignedOnly: false,
      sortByPriority: null,
      sortByDueDate: null,
      lastSelectedProjects: {}, // Store last selected project per user
      
      setSelectedProject: async (projectId: string | null, userId?: string) => {
        set({ selectedProjectId: projectId });
        
        // Save as last selected for this user
        if (userId && projectId) {
          // Update local storage (for offline fallback)
          set(state => ({
            lastSelectedProjects: {
              ...state.lastSelectedProjects,
              [userId]: projectId,
            },
          }));
          
          // Sync to database for cross-device support
          if (supabase && userId) {
            try {
              const { error } = await supabase
                .from('users')
                .update({ last_selected_project_id: projectId })
                .eq('id', userId);
              
              if (error) {
                console.warn('⚠️ Failed to sync last selected project to database:', error);
                // Continue - local storage already updated
              } else {
                console.log('✅ Last selected project synced to database');
              }
            } catch (error) {
              console.warn('⚠️ Error syncing last selected project:', error);
              // Continue - local storage already updated
            }
          }
        } else if (userId && projectId === null) {
          // Clear selection - also clear from database
          set(state => ({
            lastSelectedProjects: Object.fromEntries(
              Object.entries(state.lastSelectedProjects).filter(([key]) => key !== userId)
            ),
          }));
          
          if (supabase && userId) {
            try {
              const { error } = await supabase
                .from('users')
                .update({ last_selected_project_id: null })
                .eq('id', userId);
              
              if (error) {
                console.warn('⚠️ Failed to clear last selected project in database:', error);
              }
            } catch (error) {
              console.warn('⚠️ Error clearing last selected project:', error);
            }
          }
        }
      },
      
      setSectionFilter: (section: SectionFilter) => {
        set({ sectionFilter: section });
      },
      
      setStatusFilter: (status: StatusFilter) => {
        set({ statusFilter: status });
      },
      
      setButtonLabel: (label: string | null) => {
        set({ buttonLabel: label });
      },
      
      setShowSelfAssignedOnly: (value: boolean) => {
        set({ showSelfAssignedOnly: value });
      },
      
      setSortByPriority: (updater: SortUpdater) => {
        set(state => ({
          sortByPriority:
            typeof updater === "function"
              ? (updater as (prev: SortDirection | null) => SortDirection | null)(state.sortByPriority)
              : updater,
        }));
      },
      
      setSortByDueDate: (updater: SortUpdater) => {
        set(state => ({
          sortByDueDate:
            typeof updater === "function"
              ? (updater as (prev: SortDirection | null) => SortDirection | null)(state.sortByDueDate)
              : updater,
        }));
      },
      
      resetFilters: () => {
        set({
          sectionFilter: "all",
          statusFilter: "all",
          buttonLabel: null,
          showSelfAssignedOnly: false,
          sortByPriority: null,
          sortByDueDate: null,
        });
      },
      
      getLastSelectedProject: async (userId: string): Promise<string | null> => {
        console.log(`🔍 [getLastSelectedProject] Fetching for user: ${userId}`);
        
        // First try to get from database (most up-to-date, cross-device)
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('last_selected_project_id')
              .eq('id', userId)
              .single();
            
            console.log(`🔍 [getLastSelectedProject] Database query result:`, { data, error });
            
            if (error) {
              console.warn(`⚠️ [getLastSelectedProject] Database query error:`, error);
              // Fall through to local storage fallback
            } else if (data) {
              const dbProjectId = data.last_selected_project_id;
              const localProjectId = get().lastSelectedProjects[userId] || null;
              
              console.log(`🔍 [getLastSelectedProject] Database value: ${dbProjectId || 'null'}, Local value: ${localProjectId || 'null'}`);
              
              if (dbProjectId) {
                // Database has a value - update local cache and return it
                console.log(`✅ [getLastSelectedProject] Using database value: ${dbProjectId}`);
                set(state => ({
                  lastSelectedProjects: {
                    ...state.lastSelectedProjects,
                    [userId]: dbProjectId,
                  },
                }));
                return dbProjectId;
              } else if (localProjectId) {
                // Database is null but local storage has a value
                console.log(`⚠️ [getLastSelectedProject] Database is null, using local storage: ${localProjectId}`);
                return localProjectId;
              } else {
                // Both are null
                console.log(`ℹ️ [getLastSelectedProject] No last selected project found (database: null, local: null)`);
                return null;
              }
            }
          } catch (error) {
            console.warn('⚠️ [getLastSelectedProject] Exception fetching from database:', error);
            // Fall through to local storage fallback
          }
        }
        
        // Fallback to local storage (for offline scenarios)
        const localValue = get().lastSelectedProjects[userId] || null;
        console.log(`📦 [getLastSelectedProject] Using local storage fallback: ${localValue || 'null'}`);
        return localValue;
      },
    }),
    {
      name: "buildtrack-project-filter",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
