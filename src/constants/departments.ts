/** Merge configured department names with any extra values (e.g. a server still on a renamed/legacy dept). */
export function mergeDepartmentOptions(
  configured: string[],
  ...extra: Array<string | null | undefined>
): string[] {
  const set = new Set<string>(configured.map((name) => name.trim()).filter(Boolean));
  for (const value of extra) {
    const trimmed = value?.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
