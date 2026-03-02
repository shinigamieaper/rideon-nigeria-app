import type { ZodError, ZodIssue } from "zod";

export function zodErrorToFieldMap(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  const issues: ZodIssue[] = error.issues || [];
  for (const issue of issues) {
    const path = (issue.path || []).join(".") || "root";
    if (!details[path]) details[path] = issue.message;
  }
  return details;
}
