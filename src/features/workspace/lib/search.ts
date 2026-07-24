import type { FileTreeNode } from "@/features/workspace/lib/file-tree";

export type SearchMatch = {
  path: string;
  line: number;
  column: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
};

export type FileNameMatch = {
  path: string;
  name: string;
  /** Character indices in `name` that matched the query. */
  indices: number[];
};

export function searchInFiles(
  files: Array<{ path: string; kind: string; content?: string }>,
  query: string,
  options?: { caseSensitive?: boolean; pathPrefix?: string },
): SearchMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const caseSensitive = options?.caseSensitive ?? false;
  const needle = caseSensitive ? trimmed : trimmed.toLowerCase();
  const pathPrefix = options?.pathPrefix?.replace(/\/$/, "") ?? "";
  const matches: SearchMatch[] = [];

  for (const file of files) {
    if (file.kind !== "file" || !file.content) continue;
    if (
      pathPrefix &&
      file.path !== pathPrefix &&
      !file.path.startsWith(`${pathPrefix}/`)
    ) {
      continue;
    }

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

/**
 * JetBrains-style fuzzy match: prefer contiguous substring, else subsequence.
 * Returns matched character indices in `text`, or null if no match.
 */
export function getFuzzyMatchIndices(
  query: string,
  text: string,
): number[] | null {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const target = text.toLowerCase();
  const contiguous = target.indexOf(q);
  if (contiguous !== -1) {
    return Array.from({ length: q.length }, (_, i) => contiguous + i);
  }

  const indices: number[] = [];
  let qi = 0;
  for (let i = 0; i < target.length && qi < q.length; i++) {
    if (target[i] === q[qi]) {
      indices.push(i);
      qi++;
    }
  }
  return qi === q.length ? indices : null;
}

export function fuzzyMatchFile(query: string, path: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const name = path.split("/").pop() ?? path;
  return (
    getFuzzyMatchIndices(q, name) !== null ||
    getFuzzyMatchIndices(q, path) !== null
  );
}

export function searchFilesByName(
  files: Array<{ path: string; kind: string; name?: string }>,
  query: string,
): FileNameMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matches: FileNameMatch[] = [];
  for (const file of files) {
    if (file.kind !== "file") continue;
    const name = file.name ?? file.path.split("/").pop() ?? file.path;
    const nameIndices = getFuzzyMatchIndices(trimmed, name);
    if (nameIndices) {
      matches.push({ path: file.path, name, indices: nameIndices });
      continue;
    }
    const pathIndices = getFuzzyMatchIndices(trimmed, file.path);
    if (pathIndices) {
      matches.push({ path: file.path, name, indices: [] });
    }
  }

  return matches.sort((a, b) => {
    const aScore = a.indices.length > 0 ? 0 : 1;
    const bScore = b.indices.length > 0 ? 0 : 1;
    if (aScore !== bScore) return aScore - bScore;
    return a.path.localeCompare(b.path);
  });
}

/** Keep folders that contain matches (or match themselves) and matching files. */
export function filterFileTree(
  nodes: FileTreeNode[],
  query: string,
): FileTreeNode[] {
  const trimmed = query.trim();
  if (!trimmed) return nodes;

  const result: FileTreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "folder") {
      const children = filterFileTree(node.children ?? [], trimmed);
      const selfMatch = getFuzzyMatchIndices(trimmed, node.name) !== null;
      if (selfMatch || children.length > 0) {
        result.push({ ...node, children });
      }
    } else if (fuzzyMatchFile(trimmed, node.path)) {
      result.push(node);
    }
  }
  return result;
}

export function collectFolderIdsFromTree(
  nodes: FileTreeNode[],
): FileTreeNode["id"][] {
  const ids: FileTreeNode["id"][] = [];
  for (const node of nodes) {
    if (node.kind === "folder") {
      ids.push(node.id);
      if (node.children?.length) {
        ids.push(...collectFolderIdsFromTree(node.children));
      }
    }
  }
  return ids;
}
