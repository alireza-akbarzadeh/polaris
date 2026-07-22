export type SearchMatch = {
  path: string;
  line: number;
  column: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
};

export function searchInFiles(
  files: Array<{ path: string; kind: string; content?: string }>,
  query: string,
  options?: { caseSensitive?: boolean },
): SearchMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const caseSensitive = options?.caseSensitive ?? false;
  const needle = caseSensitive ? trimmed : trimmed.toLowerCase();
  const matches: SearchMatch[] = [];

  for (const file of files) {
    if (file.kind !== "file" || !file.content) continue;

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const haystack = caseSensitive ? lineText : lineText.toLowerCase();
      let start = 0;

      while (start < haystack.length) {
        const index = haystack.indexOf(needle, start);
        if (index === -1) break;

        matches.push({
          path: file.path,
          line: i + 1,
          column: index + 1,
          lineText,
          matchStart: index,
          matchEnd: index + trimmed.length,
        });

        start = index + (needle.length || 1);
      }
    }
  }

  return matches;
}

export function fuzzyMatchFile(query: string, path: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const target = path.toLowerCase();
  if (target.includes(q)) return true;

  let qi = 0;
  for (let i = 0; i < target.length && qi < q.length; i++) {
    if (target[i] === q[qi]) qi++;
  }
  return qi === q.length;
}
