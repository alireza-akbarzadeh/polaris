/** Local draft buffer so editor content survives refresh before Convex autosave. */

const STORAGE_PREFIX = "polaris-file-draft:";

/** Session memory — survives tab remounts even if localStorage draft was cleared. */
const memoryDrafts = new Map<string, FileContentDraft>();

export type FileContentDraft = {
  content: string;
  updatedAt: number;
};

function storageKey(projectId: string, path: string) {
  return `${STORAGE_PREFIX}${projectId}:${path}`;
}

function memoryKey(projectId: string, path: string) {
  return `${projectId}:${path}`;
}

export function loadFileContentDraft(
  projectId: string,
  path: string,
): FileContentDraft | null {
  const mem = memoryDrafts.get(memoryKey(projectId, path));
  if (typeof window === "undefined") return mem ?? null;

  try {
    const raw = localStorage.getItem(storageKey(projectId, path));
    if (!raw) return mem ?? null;
    const parsed = JSON.parse(raw) as FileContentDraft;
    if (
      typeof parsed?.content !== "string" ||
      typeof parsed?.updatedAt !== "number"
    ) {
      return mem ?? null;
    }
    // Prefer whichever draft is newer.
    if (mem && mem.updatedAt > parsed.updatedAt) return mem;
    memoryDrafts.set(memoryKey(projectId, path), parsed);
    return parsed;
  } catch {
    return mem ?? null;
  }
}

export function saveFileContentDraft(
  projectId: string,
  path: string,
  content: string,
) {
  // Never let an empty pulse erase a known non-empty draft.
  const existing = loadFileContentDraft(projectId, path);
  if (!content && existing?.content) {
    return;
  }

  const draft: FileContentDraft = {
    content,
    updatedAt: Date.now(),
  };
  memoryDrafts.set(memoryKey(projectId, path), draft);

  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(storageKey(projectId, path), JSON.stringify(draft));
  } catch {
    // Quota / private mode — memory + Convex autosave remain the durable path.
  }
}

export function clearFileContentDraft(
  projectId: string,
  path: string,
  options?: { keepMemory?: boolean },
) {
  if (!options?.keepMemory) {
    memoryDrafts.delete(memoryKey(projectId, path));
  }
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
 * Never prefer an empty draft over non-empty server content (AI writes).
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

  // Empty Liveblocks pulse must not beat a real Convex/AI write.
  if (!draft.content && serverContent) {
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

/**
 * True when Liveblocks came back empty/stale and we should push known content
 * into the Y.Doc instead of treating the empty room as authoritative.
 */
export function shouldReseedLiveblocks(
  ytextContent: string,
  seed: string,
): boolean {
  if (!seed) return false;
  if (!ytextContent) return true;
  return false;
}

/**
 * Whether an external Convex write (AI tool, another client) should replace
 * the current Liveblocks buffer.
 */
export function shouldApplyExternalContent(args: {
  ytextContent: string;
  serverContent: string;
  serverUpdatedAt: number | undefined;
  draft: FileContentDraft | null;
}): boolean {
  const { ytextContent, serverContent, serverUpdatedAt, draft } = args;
  if (!serverContent) return false;
  if (serverContent === ytextContent) return false;

  // Empty Liveblocks room with real server content — always apply.
  if (!ytextContent) return true;

  // Fresh AI/tool draft matching server — force into the open editor.
  if (draft && draft.content === serverContent) {
    return true;
  }

  // Local edits newer than this server snapshot win.
  if (
    draft &&
    draft.content !== serverContent &&
    serverUpdatedAt !== undefined &&
    draft.updatedAt > serverUpdatedAt
  ) {
    return false;
  }

  return true;
}
