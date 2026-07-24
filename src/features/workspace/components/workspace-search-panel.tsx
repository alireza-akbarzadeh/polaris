"use client";

import { FileIcon } from "@react-symbols/icons/utils";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { HighlightedText } from "@/features/workspace/components/highlighted-text";
import { useProjectFiles } from "@/features/workspace/hooks/use-project-files";
import {
  searchFilesByName,
  searchInFiles,
  type FileNameMatch,
  type SearchMatch,
} from "@/features/workspace/lib/search";
import {
  useWorkspaceStore,
  type SearchPanelMode,
} from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type WorkspaceSearchPanelProps = {
  projectId: string;
};

const SEARCH_TABS: { id: SearchPanelMode; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "file", label: "File" },
];

export function WorkspaceSearchPanel({ projectId }: WorkspaceSearchPanelProps) {
  const files = useProjectFiles(projectId);
  const router = useRouter();
  const mode = useWorkspaceStore((s) => s.searchPanelMode);
  const setSearchPanelMode = useWorkspaceStore((s) => s.setSearchPanelMode);
  const folderScope = useWorkspaceStore((s) => s.searchFolderScope);
  const setSearchFolderScope = useWorkspaceStore((s) => s.setSearchFolderScope);
  const setPendingEditorReveal = useWorkspaceStore(
    (s) => s.setPendingEditorReveal,
  );

  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  useEffect(() => {
    // Reset query when switching into a scoped find-in-folder.
    setQuery("");
  }, [folderScope]);

  const textMatches = useMemo(() => {
    if (mode !== "text" || !files || !query.trim()) return [];
    return searchInFiles(files, query, {
      caseSensitive,
      pathPrefix: folderScope ?? undefined,
    });
  }, [caseSensitive, files, folderScope, mode, query]);

  const fileMatches = useMemo(() => {
    if (mode !== "file" || !files || !query.trim()) return [];
    return searchFilesByName(files, query);
  }, [files, mode, query]);

  const grouped = useMemo(
    () => groupMatchesByFile(textMatches),
    [textMatches],
  );

  const onSelectTextMatch = (match: SearchMatch) => {
    setPendingEditorReveal({
      path: match.path,
      line: match.line,
      column: match.column,
      matchLength: match.matchEnd - match.matchStart,
    });
    router.push(`/projects/${projectId}/files/${match.path}`);
  };

  const onSelectFileMatch = (match: FileNameMatch) => {
    router.push(`/projects/${projectId}/files/${match.path}`);
  };

  if (files === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-ws-text-muted">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-7 shrink-0 items-end gap-px border-b border-ws-border-subtle bg-ws-panel px-1">
        {SEARCH_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSearchPanelMode(tab.id)}
            className={cn(
              "inline-flex h-6 items-center rounded-t-sm px-2.5 text-[11px] font-medium transition-colors",
              mode === tab.id
                ? "bg-ws-bg text-ws-text"
                : "text-ws-text-muted hover:text-ws-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 border-b border-ws-border-subtle p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-ws-text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "file"
                ? "Search files by name…"
                : folderScope
                  ? `Search in ${folderScope}/…`
                  : "Search in project files…"
            }
            className="h-7 border-ws-border bg-ws-hover pl-7 text-[12px] text-ws-text placeholder:text-ws-text-muted focus-visible:border-ws-accent focus-visible:ring-0"
            autoFocus
          />
        </div>

        {mode === "text" && folderScope ? (
          <div className="flex items-center gap-1.5 px-0.5">
            <span className="truncate text-[11px] text-ws-text-muted">
              Directory:{" "}
              <span className="text-ws-text-secondary">{folderScope}</span>
            </span>
            <button
              type="button"
              aria-label="Clear directory scope"
              onClick={() => setSearchFolderScope(null)}
              className="rounded-sm p-0.5 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ) : null}

        {mode === "text" ? (
          <label className="flex cursor-pointer items-center gap-1.5 px-0.5 text-[11px] text-ws-text-muted">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="size-3 rounded border-ws-border-strong accent-ws-accent"
            />
            Match case
          </label>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto p-1">
        {!query.trim() ? (
          <p className="px-2 py-3 text-[11px] text-ws-text-muted">
            {mode === "file"
              ? "Type to find files by name"
              : "Type to search across project file contents"}
          </p>
        ) : mode === "file" ? (
          fileMatches.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-ws-text-muted">
              No files found
            </p>
          ) : (
            <div className="space-y-0.5">
              <p className="px-2 pb-1 text-[10px] text-ws-text-muted">
                {fileMatches.length}{" "}
                {fileMatches.length === 1 ? "file" : "files"}
              </p>
              <ul>
                {fileMatches.map((match) => (
                  <li key={match.path}>
                    <button
                      type="button"
                      onClick={() => onSelectFileMatch(match)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-ws-hover"
                    >
                      <span className="size-3.5 shrink-0 [&_svg]:size-full">
                        <FileIcon fileName={match.name} autoAssign />
                      </span>
                      <span className="min-w-0 flex-1">
                        <HighlightedText
                          text={match.name}
                          query={query}
                          className="block text-[12px] text-ws-text"
                        />
                        <span className="block truncate font-mono text-[10px] text-ws-text-muted">
                          {match.path}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : textMatches.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-ws-text-muted">
            No matches found
          </p>
        ) : (
          <div className="space-y-2">
            <p className="px-2 text-[10px] text-ws-text-muted">
              {textMatches.length}{" "}
              {textMatches.length === 1 ? "match" : "matches"} in {grouped.size}{" "}
              {grouped.size === 1 ? "file" : "files"}
            </p>
            {Array.from(grouped.entries()).map(([path, fileMatchList]) => (
              <div key={path}>
                <Link
                  href={`/projects/${projectId}/files/${path}`}
                  className="block truncate px-2 py-0.5 text-[11px] font-medium text-ws-text-secondary hover:text-ws-text"
                >
                  {path}
                </Link>
                <ul className="space-y-0.5">
                  {fileMatchList.map((match, i) => (
                    <li key={`${match.line}-${match.column}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onSelectTextMatch(match)}
                        className="flex w-full items-start gap-2 rounded-sm px-2 py-0.5 text-left text-[11px] hover:bg-ws-hover"
                      >
                        <span className="w-6 shrink-0 text-right font-mono text-ws-text-muted">
                          {match.line}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-ws-text-muted">
                          {highlightMatch(match)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupMatchesByFile(matches: SearchMatch[]) {
  const map = new Map<string, SearchMatch[]>();
  for (const match of matches) {
    const list = map.get(match.path) ?? [];
    list.push(match);
    map.set(match.path, list);
  }
  return map;
}

function highlightMatch(match: SearchMatch) {
  const before = match.lineText.slice(0, match.matchStart);
  const hit = match.lineText.slice(match.matchStart, match.matchEnd);
  const after = match.lineText.slice(match.matchEnd);

  return (
    <>
      {before}
      <mark className="bg-ws-mark text-ws-text">{hit}</mark>
      {after}
    </>
  );
}
