/** True when the login was deleted; name may still exist for jobsite audit. */
export function userAccountIsDeleted(
  user:
    | {
        deletedAt?: string | null;
        deleted_at?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!user) {
    return false;
  }
  return Boolean(user.deletedAt || user.deleted_at);
}
