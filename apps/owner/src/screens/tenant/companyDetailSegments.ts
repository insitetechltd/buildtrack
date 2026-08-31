export type CompanyDetailSegment = "overview" | "projects" | "users" | "tasks";

export const COMPANY_DETAIL_SEGMENTS: readonly CompanyDetailSegment[] = [
  "overview",
  "projects",
  "users",
  "tasks",
] as const;

export function parseCompanyDetailSegment(value: unknown): CompanyDetailSegment {
  if (value === "projects" || value === "users" || value === "tasks") {
    return value;
  }
  return "overview";
}
