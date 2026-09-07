import { useSyncExternalStore } from "react";

let expanded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getReportTriageDialExpanded(): boolean {
  return expanded;
}

export function setReportTriageDialExpanded(next: boolean): void {
  if (expanded === next) {
    return;
  }
  expanded = next;
  emit();
}

export function toggleReportTriageDialExpanded(): boolean {
  expanded = !expanded;
  emit();
  return expanded;
}

export function subscribeReportTriageDialExpanded(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReportTriageDialExpanded(): boolean {
  return useSyncExternalStore(
    subscribeReportTriageDialExpanded,
    getReportTriageDialExpanded,
    getReportTriageDialExpanded,
  );
}
