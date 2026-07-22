"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useProjectFiles } from "@/features/workspace/hooks/use-project-files";
import {
  searchInFiles,
  type SearchMatch,
} from "@/features/workspace/lib/search";
import { cn } from "@/lib/utils";

type WorkspaceSearchPanelProps = {
  projectId: string;
};

export function WorkspaceSearchPanel({ projectId }: WorkspaceSearchPanelProps) {
  const files = useProjectFiles(projectId);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  const matches = useMemo(() => {
    if (!files || !query.trim()) return [];
    return searchInFiles(files, query, { caseSensitive });
  }, [files, query, caseSensitive]);

  const grouped = useMemo(() => groupMatchesByFile(matches), [matches]);

  const onSelectMatch = (match: SearchMatch) => {
    router.push(`/projects/${projectId}/files/${match.path}`);
  };

  if (files === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[#787878]">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-[#1e1f22] p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-[#6f737a]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in project files…"
            className="h-7 border-[#4e5155] bg-[#3c3f41] pl-7 text-[12px] text-[#dfdfdf] placeholder:text-[#6f737a] focus-visible:border-[#3574f0] focus-visible:ring-0"
            autoFocus
          />
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 px-0.5 text-[11px] text-[#9a9a9a]">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="size-3 rounded border-[#5a5d63] accent-[#3574f0]"
          />
          Match case
        </label>
      </div>

      <div className="flex-1 overflow-auto p-1">
        {!query.trim() ? (
          <p className="px-2 py-3 text-[11px] text-[#787878]">
            Type to search across all project files
          </p>
        ) : matches.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-[#787878]">
            No matches found
          </p>
        ) : (
          <div className="space-y-2">
            <p className="px-2 text-[10px] text-[#6f737a]">
              {matches.length} {matches.length === 1 ? "match" : "matches"} in{" "}
              {grouped.size} {grouped.size === 1 ? "file" : "files"}
            </p>
            {Array.from(grouped.entries()).map(([path, fileMatches]) => (
              <div key={path}>
                <Link
                  href={`/projects/${projectId}/files/${path}`}
                  className="block truncate px-2 py-0.5 text-[11px] font-medium text-[#bcbec4] hover:text-[#dfdfdf]"
                >
                  {path}
                </Link>
                <ul className="space-y-0.5">
                  {fileMatches.map((match, i) => (
                    <li key={`${match.line}-${match.column}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onSelectMatch(match)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-sm px-2 py-0.5 text-left text-[11px] hover:bg-[#3c3f41]",
                        )}
                      >
                        <span className="w-6 shrink-0 text-right font-mono text-[#6f737a]">
                          {match.line}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[#9a9a9a]">
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
      <mark className="bg-[#5c4b1f] text-[#dfdfdf]">{hit}</mark>
      {after}
    </>
  );
}
