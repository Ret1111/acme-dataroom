/**
 * Given names already taken in a folder, return `desired` untouched if free,
 * otherwise "name (1).pdf", "name (2).pdf", ... keeping the extension.
 */
export function resolveUniqueName(taken: Set<string>, desired: string): string {
  if (!taken.has(desired)) return desired;

  const dot = desired.lastIndexOf('.');
  const base = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : '';

  for (let i = 1; ; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function sanitizeName(name: string): string {
  return name.trim().replace(/[/\\]/g, '-').slice(0, 255);
}
