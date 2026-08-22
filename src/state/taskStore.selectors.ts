import { createQueryMeta } from "../api/supabase";
import { useTaskStore } from "./taskStore.supabase";

type TaskStoreState = ReturnType<typeof useTaskStore.getState>;

export const selectTaskIdsByProject = (projectId: string) => (state: TaskStoreState) =>
  state.taskIdsByProject[projectId] || [];

export const selectTopLevelTaskIdsByProject =
  (projectId: string) => (state: TaskStoreState) =>
    state.topLevelTaskIdsByProject[projectId] || [];

export const selectChildTaskIds = (parentTaskId: string) => (state: TaskStoreState) =>
  state.childTaskIdsByParent[parentTaskId] || [];

export const selectTaskPreview = (taskId: string) => (state: TaskStoreState) =>
  state.taskPreviewById[taskId] || null;

export const selectTaskEntity = (taskId: string) => (state: TaskStoreState) =>
  state.tasksById[taskId] || null;

export const selectTaskIdsByUser = (userId: string) => (state: TaskStoreState) =>
  state.taskIdsByUser[userId] || [];

export const selectTaskIdsAssignedByUser = (userId: string) => (state: TaskStoreState) =>
  state.taskIdsAssignedByUser[userId] || [];

export const selectTaskQueryMeta = (resourceKey: string) => (state: TaskStoreState) =>
  state.taskQueryMeta[resourceKey] || createQueryMeta(resourceKey);

export const useTaskIdsByProject = (projectId: string) =>
  useTaskStore(selectTaskIdsByProject(projectId));

export const useTopLevelTaskIdsByProject = (projectId: string) =>
  useTaskStore(selectTopLevelTaskIdsByProject(projectId));

export const useChildTaskIds = (parentTaskId: string) =>
  useTaskStore(selectChildTaskIds(parentTaskId));

export const useTaskPreview = (taskId: string) =>
  useTaskStore(selectTaskPreview(taskId));

export const useTaskEntity = (taskId: string) =>
  useTaskStore(selectTaskEntity(taskId));

export const useTaskIdsByUser = (userId: string) =>
  useTaskStore(selectTaskIdsByUser(userId));

export const useTaskIdsAssignedByUser = (userId: string) =>
  useTaskStore(selectTaskIdsAssignedByUser(userId));

export const useTaskQueryMeta = (resourceKey: string) =>
  useTaskStore(selectTaskQueryMeta(resourceKey));
