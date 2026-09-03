/** Department choices for server create/edit. Swagger types `department` as a required string with no enum. */
export const DEPARTMENT_OPTIONS = [
  'Administration',
  'Communications',
  'Finance',
  'Human Resources',
  'ICT',
  'Infrastructure',
  'Legal',
  'Operations',
  'Planning',
  'Procurement',
] as const;

export function mergeDepartmentOptions(...extra: Array<string | null | undefined>): string[] {
  const set = new Set<string>(DEPARTMENT_OPTIONS);
  for (const value of extra) {
    const trimmed = value?.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
