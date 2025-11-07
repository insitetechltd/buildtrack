import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FailedUpload {
  id: string;
  taskId: string;
  fileName: string;
  fileUri: string;
  fileType: string;
  error: string;
  timestamp: string;
  retryCount: number;
  entityType: 'task-update' | 'task' | 'project';
  entityId: string;
  companyId: string;
  userId: string;
}

interface UploadFailureState {
  failedUploads: FailedUpload[];
  
  // Add a failed upload
  addFailure: (failure: Omit<FailedUpload, 'id' | 'timestamp' | 'retryCount'>) => void;
  
  // Remove a failed upload (after successful retry or user dismissal)
  dismissFailure: (failureId: string) => void;
  
  // Clear all failed uploads for a specific task
  clearFailuresForTask: (taskId: string) => void;
  
  // Get all failed uploads for a specific task
  getFailuresForTask: (taskId: string) => FailedUpload[];
  
  // Increment retry count for a failed upload
  incrementRetryCount: (failureId: string) => void;
  
  // Clear all failed uploads (for testing/cleanup)
  clearAllFailures: () => void;
}

export const useUploadFailureStore = create<UploadFailureState>()(
  persist(
    (set, get) => ({
      failedUploads: [],
      
      addFailure: (failure) => {
        const newFailure: FailedUpload = {
          ...failure,
          id: `failure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        };
        
        console.log(`❌ [Upload Failure] Added failure record:`, {
          fileName: newFailure.fileName,
          error: newFailure.error,
          taskId: newFailure.taskId,
        });
        
        set(state => ({
          failedUploads: [...state.failedUploads, newFailure],
        }));
      },
      
      dismissFailure: (failureId) => {
        console.log(`🗑️ [Upload Failure] Dismissing failure: ${failureId}`);
        set(state => ({
          failedUploads: state.failedUploads.filter(f => f.id !== failureId),
        }));
      },
      
      clearFailuresForTask: (taskId) => {
        console.log(`🧹 [Upload Failure] Clearing all failures for task: ${taskId}`);
        set(state => ({
          failedUploads: state.failedUploads.filter(f => f.taskId !== taskId),
        }));
      },
      
      getFailuresForTask: (taskId) => {
        return get().failedUploads.filter(f => f.taskId === taskId);
      },
      
      incrementRetryCount: (failureId) => {
        set(state => ({
          failedUploads: state.failedUploads.map(f =>
            f.id === failureId
              ? { ...f, retryCount: f.retryCount + 1 }
              : f
          ),
        }));
      },
      
      clearAllFailures: () => {
        console.log(`🧹 [Upload Failure] Clearing all failed uploads`);
        set({ failedUploads: [] });
      },
    }),
    {
      name: "buildtrack-upload-failures",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

