"use client";

import { GlobeIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { isPreviewableFile } from "@/features/workspace/lib/preview-utils";
import { cn } from "@/lib/utils";

type WorkspacePreviewPanelProps = {
  code: string;
  filePath: string;
  projectId: string;
};

export function WorkspacePreviewPanel({
  code,
  filePath,
  projectId,
}: WorkspacePreviewPanelProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const previewPath = `/projects/${projectId}/files/${filePath}`;
  const canPreview = isPreviewableFile(filePath);

  const loadPreview = useCallback(async () => {
    if (!canPreview) {
      setPreviewHtml(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, filePath }),
      });

      if (!response.ok) {
        throw new Error("Preview request failed");
      }

      setPreviewHtml(await response.text());
    } catch {
      setError("Could not render preview");
      setPreviewHtml(null);
    } finally {
      setLoading(false);
    }
  }, [canPreview, code, filePath]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview, refreshKey]);

  if (!canPreview) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
        Preview is available for HTML, Markdown, and JavaScript/TypeScript files.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-ws-bg">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-ws-panel bg-ws-panel px-2">
        <GlobeIcon className="size-3.5 shrink-0 text-ws-text-muted" />
        <div className="min-w-0 flex-1 truncate rounded-sm bg-ws-bg px-2 py-1 font-mono text-[11px] text-ws-text-secondary">
          {previewPath}
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
            title={`Preview ${filePath}`}
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-same-origin"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-ws-text-muted">
            Loading preview…
          </div>
        )}
      </div>
    </div>
  );
}
