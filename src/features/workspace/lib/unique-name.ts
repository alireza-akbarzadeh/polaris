/** Suggest a unique sibling name like `untitled.ts`, `untitled-2.ts`. */
export function suggestUniqueName(
  existingNames: Iterable<string>,
  base: string,
): string {
  const taken = new Set(existingNames);
  if (!taken.has(base)) {
    return base;
  }

  const dot = base.lastIndexOf(".");
  const hasExt = dot > 0;
  const stem = hasExt ? base.slice(0, dot) : base;
  const ext = hasExt ? base.slice(dot) : "";

  let index = 2;
  while (taken.has(`${stem}-${index}${ext}`)) {
    index += 1;
  }
  return `${stem}-${index}${ext}`;
}

export function siblingNames(
  files: Array<{ name: string; parentId?: string }>,
  parentId?: string,
): string[] {
  const key = parentId ?? "root";
  return files
    .filter((f) => (f.parentId ?? "root") === key)
    .map((f) => f.name);
}
