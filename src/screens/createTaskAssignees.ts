import type { User, UserProjectAssignment } from "@/types/buildtrack";

interface GetAssignableProjectUsersArgs {
  projectId: string;
  assignments: UserProjectAssignment[];
  users: User[];
}

export function getAssignableProjectUsers({
  projectId,
  assignments,
  users,
}: GetAssignableProjectUsersArgs): User[] {
  if (!projectId) {
    return [];
  }

  const activeProjectUserIds = new Set(
    assignments
      .filter(
        (assignment) =>
          assignment.projectId === projectId &&
          assignment.isActive,
      )
      .map((assignment) => assignment.userId),
  );

  if (activeProjectUserIds.size === 0) {
    return [];
  }

  return users.filter((user) => activeProjectUserIds.has(user.id));
}
