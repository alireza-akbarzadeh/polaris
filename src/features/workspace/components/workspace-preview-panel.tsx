"use client";

import { GlobeIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useProjectFiles } from "@/features/workspace/hooks/use-project-files";
import {
  isPreviewableFile,
  isProjectPreviewable,
} from "@/features/workspace/lib/preview-utils";
import { cn } from "@/lib/utils";

type WorkspacePreviewPanelProps = {
  /** Unsaved buffer for the currently open file, merged into the project build. */
  code?: string;
  filePath?: string;
  projectId: string;
};

export function WorkspacePreviewPanel({
  code,
  filePath,
  projectId,
}: WorkspacePreviewPanelProps) {
  const projectFiles = useProjectFiles(projectId);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestIdRef = useRef(0);

  const filePaths = (projectFiles ?? [])
    .filter((file) => file.kind === "file")
    .map((file) => file.path);
  const canPreviewProject = isProjectPreviewable(filePaths);
  const canPreviewFile = filePath ? isPreviewableFile(filePath) : false;
  const canPreview = canPreviewProject || canPreviewFile;

  useEffect(() => {
    if (!canPreview || projectFiles === undefined) {
      setPreviewHtml(null);
      setError(null);
      return;
    }

    const files: Record<string, string> = {};
    for (const file of projectFiles) {
      if (file.kind !== "file") continue;
      files[file.path] = file.content ?? "";
    }

    if (filePath && code !== undefined) {
      files[filePath] = code;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files,
              activePath: filePath,
            }),
          });

          if (!response.ok) {
            throw new Error("Preview request failed");
          }

          const html = await response.text();
          if (requestId !== requestIdRef.current) return;
          setPreviewHtml(html);
        } catch {
          if (requestId !== requestIdRef.current) return;
          setError("Could not render preview");
          setPreviewHtml(null);
        } finally {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canPreview, code, filePath, projectFiles, refreshKey]);

  if (projectFiles === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
        Loading project…
      </div>
    );
  }

  if (!canPreview) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
        Add an <code className="mx-1">index.html</code>,{" "}
        <code className="mx-1">src/main.tsx</code>, or{" "}
        <code className="mx-1">src/app/page.tsx</code> to preview this project.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-ws-bg">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-ws-panel bg-ws-panel px-2">
        <GlobeIcon className="size-3.5 shrink-0 text-ws-text-muted" />
        <div className="min-w-0 flex-1 truncate rounded-sm bg-ws-bg px-2 py-1 font-mono text-[11px] text-ws-text-secondary">
          /projects/{projectId}/preview
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh preview"
          disabled={loading}
          onClick={() => setRefreshKey((value) => value + 1)}
          className="size-7 shrink-0 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
        >
          <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
            {error}
          </div>
        ) : previewHtml ? (
          <iframe
            title="Project preview"
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-same-origin"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-ws-text-muted">
            Building preview…
          </div>
        )}
      </div>
    </div>
  );
}
