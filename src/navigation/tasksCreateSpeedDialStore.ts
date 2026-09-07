import { useSyncExternalStore } from "react";

let expanded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getTasksCreateDialExpanded(): boolean {
  return expanded;
}

export function setTasksCreateDialExpanded(next: boolean): void {
  if (expanded === next) {
    return;
  }
  expanded = next;
  emit();
}

export function toggleTasksCreateDialExpanded(): boolean {
  expanded = !expanded;
  emit();
  return expanded;
}

export function subscribeTasksCreateDialExpanded(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTasksCreateDialExpanded(): boolean {
  return useSyncExternalStore(
    subscribeTasksCreateDialExpanded,
    getTasksCreateDialExpanded,
    getTasksCreateDialExpanded,
  );
}
