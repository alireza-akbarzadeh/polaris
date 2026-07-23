import type { EditorTab, EditorTabKind } from "@/features/workspace/store/workspace-store";

export type EditorTabInput =
  | { kind: "welcome" }
  | { kind: "settings" }
  | { kind: "shortcuts" }
  | { kind: "new-project" }
  | { kind: "file"; path: string };

const SPECIAL_TITLES: Record<Exclude<EditorTabKind, "file">, string> = {
  welcome: "Welcome",
  settings: "Settings",
  shortcuts: "Shortcuts",
  "new-project": "New Project",
};

export function editorTabId(input: EditorTabInput): string {
  if (input.kind === "file") return `file:${input.path}`;
  return input.kind;
}

export function editorTabTitle(input: EditorTabInput): string {
  if (input.kind === "file") {
    const name = input.path.split("/").filter(Boolean).pop();
    return name || input.path || "Untitled";
  }
  return SPECIAL_TITLES[input.kind];
}

export function createEditorTab(input: EditorTabInput): EditorTab {
  return {
    id: editorTabId(input),
    kind: input.kind,
    title: editorTabTitle(input),
    ...(input.kind === "file" ? { path: input.path } : {}),
  };
}

export function editorTabHref(projectId: string, tab: EditorTab): string {
  switch (tab.kind) {
    case "welcome":
      return `/projects/${projectId}`;
    case "settings":
      return `/projects/${projectId}/settings`;
    case "shortcuts":
      return `/projects/${projectId}/shortcuts`;
    case "new-project":
      return `/projects/${projectId}/new`;
    case "file":
      return `/projects/${projectId}/files/${tab.path ?? ""}`;
  }
}

/** Parse the active workspace route into an editor tab, or null if unrelated. */
export function editorTabFromPathname(
  projectId: string,
  pathname: string,
): EditorTab | null {
  const base = `/projects/${projectId}`;
  if (pathname === base || pathname === `${base}/`) {
    return createEditorTab({ kind: "welcome" });
  }
  if (pathname === `${base}/settings`) {
    return createEditorTab({ kind: "settings" });
  }
  if (pathname === `${base}/shortcuts`) {
    return createEditorTab({ kind: "shortcuts" });
  }
  if (pathname === `${base}/new`) {
    return createEditorTab({ kind: "new-project" });
  }
  const filesPrefix = `${base}/files/`;
  if (pathname.startsWith(filesPrefix)) {
    const path = decodeURIComponent(pathname.slice(filesPrefix.length));
    if (!path) return createEditorTab({ kind: "welcome" });
    return createEditorTab({ kind: "file", path });
  }
  if (pathname === `${base}/files`) {
    return createEditorTab({ kind: "welcome" });
  }
  return null;
}
