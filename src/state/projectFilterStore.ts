import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";

export type SectionFilter = "my_tasks" | "inbox" | "outbox" | "my_work" | "all";
export type StatusFilter =
  | "new"
  | "accepted"
  | "not_started"
  | "in_progress"
  | "completed"
  | "submitted_for_review"
  | "approved"
  | "rejected"
  | "declined"
  | "cancelled"
  | "rejected"
  | "pending"
  | "overdue"
  | "wip"
  | "done"
  | "received"
  | "reviewing"
  | "assigned"
  | "received-overdue"
  | "reviewing-overdue"
  | "wip-overdue"
  | "assigned-overdue"
  | "all";
type SortDirection = "asc" | "desc";
type SortUpdater = SortDirection | null | ((prev: SortDirection | null) => SortDirection | null);

interface ProjectFilterState {
  selectedProjectId: string | null;
  workspaceReady: boolean;
  workspaceReadyUserId: string | null;
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
  clearSectionFilter: () => void;
  setStatusFilter: (status: StatusFilter) => void;
  clearStatusFilter: () => void;
  setButtonLabel: (label: string | null) => void;
  setShowSelfAssignedOnly: (value: boolean) => void;
  setSortByPriority: (updater: SortUpdater) => void;
  setSortByDueDate: (updater: SortUpdater) => void;
  resetFilters: () => void;
  getLastSelectedProject: (userId: string) => Promise<string | null>;
  initializeWorkspaceProject: (userId: string) => Promise<void>;
}

export const useProjectFilterStore = create<ProjectFilterState>()(
  persist(
    (set, get) => {
      let workspaceBootstrapRequestId = 0;

      return ({
      selectedProjectId: null,
      workspaceReady: false,
      workspaceReadyUserId: null,
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

      clearSectionFilter: () => {
        set({ sectionFilter: "all" });
      },
      
      setStatusFilter: (status: StatusFilter) => {
        set({ statusFilter: status });
      },

      clearStatusFilter: () => {
        set({ statusFilter: "all" });
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
              } else {
                // Database is authoritative when it returns a null value for this user
                set(state => ({
                  lastSelectedProjects: Object.fromEntries(
                    Object.entries(state.lastSelectedProjects).filter(([key]) => key !== userId)
                  ),
                }));
                console.log(
                  `ℹ️ [getLastSelectedProject] No last selected project found in database for user ${userId}; clearing local fallback if present.`,
                );
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

      initializeWorkspaceProject: async (userId: string) => {
        const requestId = ++workspaceBootstrapRequestId;
        set({ workspaceReady: false, workspaceReadyUserId: null });

        try {
          const restoredProjectId = await get().getLastSelectedProject(userId);

          if (requestId !== workspaceBootstrapRequestId) {
            return;
          }

          set({
            selectedProjectId: restoredProjectId ?? null,
            workspaceReady: true,
            workspaceReadyUserId: userId,
          });
        } catch (error) {
          console.warn("⚠️ [initializeWorkspaceProject] Failed to restore workspace project:", error);

          if (requestId !== workspaceBootstrapRequestId) {
            return;
          }

          set({
            selectedProjectId: null,
            workspaceReady: true,
            workspaceReadyUserId: userId,
          });
        }
      },
    })},
    {
      name: "buildtrack-project-filter",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedProjectId: state.selectedProjectId,
        sectionFilter: state.sectionFilter,
        statusFilter: state.statusFilter,
        buttonLabel: state.buttonLabel,
        showSelfAssignedOnly: state.showSelfAssignedOnly,
        sortByPriority: state.sortByPriority,
        sortByDueDate: state.sortByDueDate,
        lastSelectedProjects: state.lastSelectedProjects,
      }),
    }
  )
);
