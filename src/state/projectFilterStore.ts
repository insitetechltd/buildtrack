import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProjectFilterState {
  selectedProjectId: string | null;
  sectionFilter: "my_tasks" | "inbox" | "outbox" | "all" | null;
  statusFilter: "not_started" | "in_progress" | "completed" | "rejected" | "pending" | "overdue" | "wip" | "done" | "received" | "reviewing" | "assigned" | null;
  
  // Per-user last selected projects
  lastSelectedProjects: Record<string, string>; // userId -> projectId
  
  setSelectedProject: (projectId: string | null, userId?: string) => void;
  setSectionFilter: (section: "my_tasks" | "inbox" | "outbox" | "all") => void;
  setStatusFilter: (status: "not_started" | "in_progress" | "completed" | "rejected" | "pending" | "overdue" | "wip" | "done" | "received" | "reviewing" | "assigned") => void;
  clearSectionFilter: () => void;
  clearStatusFilter: () => void;
  getLastSelectedProject: (userId: string) => string | null;
}

export const useProjectFilterStore = create<ProjectFilterState>()(
  persist(
    (set, get) => ({
      selectedProjectId: null,
      sectionFilter: null,
      statusFilter: null,
      lastSelectedProjects: {}, // Store last selected project per user
      
      setSelectedProject: (projectId: string | null, userId?: string) => {
        set({ selectedProjectId: projectId });
        
        // Save as last selected for this user
        if (userId && projectId) {
          set(state => ({
            lastSelectedProjects: {
              ...state.lastSelectedProjects,
              [userId]: projectId,
            },
          }));
        }
      },
      
      setSectionFilter: (section: "my_tasks" | "inbox" | "outbox" | "all" | null) => {
        set({ sectionFilter: section });
      },
      
      setStatusFilter: (status: "not_started" | "in_progress" | "completed" | "rejected" | "pending" | "overdue" | "wip" | "done" | "received" | "reviewing" | "assigned" | null) => {
        set({ statusFilter: status });
      },
      
      clearSectionFilter: () => {
        set({ sectionFilter: null });
      },
      
      clearStatusFilter: () => {
        set({ statusFilter: null });
      },
      
      getLastSelectedProject: (userId: string) => {
        return get().lastSelectedProjects[userId] || null;
      },
    }),
    {
      name: "buildtrack-project-filter",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
