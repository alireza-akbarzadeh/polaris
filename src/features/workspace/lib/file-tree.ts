import type { Doc, Id } from "@/convex/_generated/dataModel";

export type FileTreeNode = {
  id: Id<"projectFiles">;
  name: string;
  path: string;
  kind: "file" | "folder";
  children?: FileTreeNode[];
};

function sortNodes(nodes: Doc<"projectFiles">[]) {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function buildFileTree(files: Doc<"projectFiles">[]): FileTreeNode[] {
  const byParent = new Map<string, Doc<"projectFiles">[]>();

  for (const file of files) {
    const key = file.parentId ?? "root";
    const siblings = byParent.get(key) ?? [];
    siblings.push(file);
    byParent.set(key, siblings);
  }

  function walk(parentKey: string): FileTreeNode[] {
    return sortNodes(byParent.get(parentKey) ?? []).map((file) => ({
      id: file._id,
      name: file.name,
      path: file.path,
      kind: file.kind,
      children: file.kind === "folder" ? walk(file._id) : undefined,
    }));
  }

  return walk("root");
}
