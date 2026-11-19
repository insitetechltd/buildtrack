/**
 * User-facing task status. The stored value `in_progress` is shown as Active.
 * Other statuses keep their existing wording.
 */
export function formatVisibleTaskStatus(
  status: string | null | undefined,
  casing: "title" | "plain" = "title",
): string {
  const raw = String(status ?? "").trim();
  if (!raw) {
    return casing === "title" ? "New" : "";
  }
  const key = raw.toLowerCase().replace(/\s+/g, "_");
  if (key === "in_progress") {
    return "Active";
  }
  const spaced = raw.replace(/_/g, " ");
  if (casing === "plain") {
    return spaced;
  }
  return spaced.replace(/\b\w/g, (character) => character.toUpperCase());
}
