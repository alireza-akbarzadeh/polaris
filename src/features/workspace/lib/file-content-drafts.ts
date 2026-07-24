/** Local draft buffer so editor content survives refresh before Convex autosave. */

const STORAGE_PREFIX = "polaris-file-draft:";

export type FileContentDraft = {
  content: string;
  updatedAt: number;
};

function storageKey(projectId: string, path: string) {
  return `${STORAGE_PREFIX}${projectId}:${path}`;
}

export function loadFileContentDraft(
  projectId: string,
  path: string,
): FileContentDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey(projectId, path));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FileContentDraft;
    if (
      typeof parsed?.content !== "string" ||
      typeof parsed?.updatedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveFileContentDraft(
  projectId: string,
  path: string,
  content: string,
) {
  if (typeof window === "undefined") return;

  const draft: FileContentDraft = {
    content,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(storageKey(projectId, path), JSON.stringify(draft));
  } catch {
    // Quota / private mode — Convex autosave remains the durable path.
  }
}

export function clearFileContentDraft(projectId: string, path: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(projectId, path));
  } catch {
    // ignore
  }
}

/**
 * Prefer a local draft when it is newer than the server copy, or when the
 * server is empty and the draft still has text (lost autosave on refresh).
 */
export function resolveSeedContent(
  serverContent: string,
  serverUpdatedAt: number | undefined,
  draft: FileContentDraft | null,
): string {
  if (!draft) return serverContent;

  if (draft.content === serverContent) {
    return serverContent;
  }

  if (
    serverUpdatedAt === undefined ||
    draft.updatedAt >= serverUpdatedAt ||
    (!serverContent && draft.content)
  ) {
    return draft.content;
  }

  return serverContent;
}
