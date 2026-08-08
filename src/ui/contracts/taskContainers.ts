/** Project-scoped area / package containers (S-UX-01N). */

export interface ProjectContainerRecord {
  id: string;
  projectId: string;
  parentId?: string;
  label: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeContainerLabel(label: string | undefined | null): string {
  return String(label || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function isTopLevelContainer(container: ProjectContainerRecord): boolean {
  return !container.parentId;
}

export function listTopLevelContainers(
  containers: ProjectContainerRecord[],
): ProjectContainerRecord[] {
  return containers.filter(isTopLevelContainer);
}

export function listChildContainers(
  containers: ProjectContainerRecord[],
  parentId: string | undefined | null,
): ProjectContainerRecord[] {
  if (!parentId) {
    return [];
  }
  return containers.filter((container) => container.parentId === parentId);
}

/** Progressive disclosure: show organization UI when catalogue has rows or task already assigned. */
export function shouldShowContainerOrganization(args: {
  containerCount: number;
  selectedContainerId?: string | null;
  selectedSubContainerId?: string | null;
  userExpanded?: boolean;
}): boolean {
  if (args.userExpanded) {
    return true;
  }
  if (args.containerCount > 0) {
    return true;
  }
  return Boolean(args.selectedContainerId || args.selectedSubContainerId);
}
