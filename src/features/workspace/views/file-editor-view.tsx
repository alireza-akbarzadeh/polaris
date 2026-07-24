"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  Code2Icon,
  CopyIcon,
  DownloadIcon,
  GlobeIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  OpenIn,
  OpenInChatGPT,
  OpenInClaude,
  OpenInContent,
  OpenInTrigger,
} from "@/components/ai-elements/open-in-chat";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CollaborativeCodeEditor } from "@/features/workspace/components/collaborative-code-editor";
import { WorkspacePreviewPanel } from "@/features/workspace/components/workspace-preview-panel";
import { useProjectAccess } from "@/features/projects/hooks/use-project-access";
import {
  useProjectFile,
  useProjectFiles,
} from "@/features/workspace/hooks/use-project-files";
import {
  isPreviewableFile,
  isProjectPreviewable,
} from "@/features/workspace/lib/preview-utils";
import {
  loadFileContentDraft,
  resolveSeedContent,
} from "@/features/workspace/lib/file-content-drafts";
import { filePathToBreadcrumb } from "@/features/workspace/lib/sample-files";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type EditorPanelTab = "code" | "preview";

type FileEditorViewProps = {
  projectId: string;
  filePath: string;
  /** When false, skip breadcrumb / current-file chrome updates (split pane). */
  syncWorkspaceChrome?: boolean;
};

function fileNameFromPath(filePath: string) {
  return filePath.split("/").pop() || "page.txt";
}

function buildPagePrompt(filePath: string, content: string) {
  return [
    `I'm working on this page/file: \`${filePath}\`.`,
    "",
    "Here is the full page content:",
    "",
    "```",
    content,
    "```",
    "",
    "Please help me understand and improve this page.",
  ].join("\n");
}

function EditorPageActions({
  filePath,
  content,
}: {
  filePath: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileName = fileNameFromPath(filePath);
  const openInQuery = useMemo(
    () => buildPagePrompt(filePath, content),
    [content, filePath],
  );

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const copyPage = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const downloadPage = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mb-px flex items-center gap-0.5 self-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={copied ? "Copied" : "Copy page"}
              onClick={() => void copyPage()}
              className={cn(
                "size-6 rounded-sm text-ws-text-muted hover:bg-ws-hover hover:text-ws-text",
                copied && "text-emerald-400 hover:text-emerald-400",
              )}
            >
              {copied ? (
                <CheckIcon className="size-3.5" strokeWidth={2} />
              ) : (
                <CopyIcon className="size-3.5" strokeWidth={1.75} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={6}
            className="border border-ws-border-strong bg-ws-hover px-2.5 py-1.5 text-ws-text"
          >
            <span className="text-xs">{copied ? "Copied!" : "Copy page"}</span>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Download page"
              onClick={downloadPage}
              className="size-6 rounded-sm text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
            >
              <DownloadIcon className="size-3.5" strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={6}
            className="border border-ws-border-strong bg-ws-hover px-2.5 py-1.5 text-ws-text"
          >
            <span className="text-xs">Download page</span>
          </TooltipContent>
        </Tooltip>

        <OpenIn query={openInQuery}>
          <Tooltip>
            <TooltipTrigger asChild>
              <OpenInTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Open in"
                  className="h-6 gap-1 rounded-sm px-1.5 text-[11px] text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
                >
                  <ExternalLinkIcon className="size-3.5" strokeWidth={1.75} />
                  Open in
                  <ChevronDownIcon className="size-3 opacity-70" />
                </Button>
              </OpenInTrigger>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={6}
              className="border border-ws-border-strong bg-ws-hover px-2.5 py-1.5 text-ws-text"
            >
              <span className="text-xs">Open page in ChatGPT or Claude</span>
            </TooltipContent>
          </Tooltip>
          <OpenInContent
            align="end"
            className="w-52 border-ws-border bg-ws-panel text-ws-text"
          >
            <OpenInChatGPT className="gap-2 text-[12px] focus:bg-ws-hover focus:text-ws-text" />
            <OpenInClaude className="gap-2 text-[12px] focus:bg-ws-hover focus:text-ws-text" />
          </OpenInContent>
        </OpenIn>
      </div>
    </TooltipProvider>
  );
}

function EditorViewTabs({
  activeTab,
  onChange,
  previewAvailable,
  filePath,
  content,
  readOnly,
}: {
  activeTab: EditorPanelTab;
  onChange: (tab: EditorPanelTab) => void;
  previewAvailable: boolean;
  filePath: string;
  content: string;
  readOnly: boolean;
}) {
  return (
    <div className="flex h-8 shrink-0 items-end justify-between gap-2 border-b border-ws-panel bg-ws-panel px-1">
      <div className="flex items-end gap-px">
        <button
          type="button"
          onClick={() => onChange("code")}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-t-sm px-3 text-[11px] font-medium transition-colors",
            activeTab === "code"
              ? "bg-ws-bg text-ws-text"
              : "text-ws-text-muted hover:text-ws-text",
          )}
        >
          <Code2Icon className="size-3" />
          Code
          {readOnly ? (
            <span className="rounded bg-ws-hover px-1 py-px text-[9px] uppercase tracking-wide text-ws-text-muted">
              View
            </span>
          ) : null}
        </button>
        {previewAvailable ? (
          <button
            type="button"
            onClick={() => onChange("preview")}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-t-sm px-3 text-[11px] font-medium transition-colors",
              activeTab === "preview"
                ? "bg-ws-bg text-ws-text"
                : "text-ws-text-muted hover:text-ws-text",
            )}
          >
            <GlobeIcon className="size-3" />
            Preview
          </button>
        ) : null}
      </div>

      <EditorPageActions filePath={filePath} content={content} />
    </div>
  );
}

type FileEditorContentProps = {
  projectId: string;
  filePath: string;
  initialContent: string;
  serverUpdatedAt?: number;
  readOnly: boolean;
};

function FileEditorContent({
  projectId,
  filePath,
  initialContent,
  serverUpdatedAt,
  readOnly,
}: FileEditorContentProps) {
  const [activeTab, setActiveTab] = useState<EditorPanelTab>("code");
  const draft = loadFileContentDraft(projectId, filePath);
  const seedContent = resolveSeedContent(
    initialContent,
    serverUpdatedAt,
    draft,
  );
  const [content, setContent] = useState(seedContent);
  const projectFiles = useProjectFiles(projectId);
  const projectPaths = (projectFiles ?? [])
    .filter((file) => file.kind === "file")
    .map((file) => file.path);
  const previewAvailable =
    isProjectPreviewable(projectPaths) || isPreviewableFile(filePath);

  // Keep local preview/chrome in sync with Convex/AI writes and drafts.
  useEffect(() => {
    if (!seedContent) return;
    if (seedContent === content) return;
    // Empty UI with real content, or AI draft matching seed — adopt it.
    if (!content || draft?.content === seedContent) {
      setContent(seedContent);
    }
  }, [content, draft?.content, seedContent]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorViewTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        previewAvailable={previewAvailable}
        filePath={filePath}
        content={content}
        readOnly={readOnly}
      />

      <div className="relative min-h-0 flex-1">
        {/* Keep the Liveblocks editor mounted so Code ↔ Preview does not
            reconnect an empty Y.Doc and wipe in-flight edits. */}
        <div
          className={cn(
            "absolute inset-0",
            activeTab !== "code" && "invisible pointer-events-none",
          )}
          aria-hidden={activeTab !== "code"}
        >
          <CollaborativeCodeEditor
            projectId={projectId}
            filePath={filePath}
            initialContent={seedContent}
            serverUpdatedAt={serverUpdatedAt}
            readOnly={readOnly}
            onContentChange={setContent}
          />
        </div>
        {activeTab === "preview" ? (
          <div className="absolute inset-0">
            <WorkspacePreviewPanel
              code={content}
              filePath={filePath}
              projectId={projectId}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FileEditorView({
  projectId,
  filePath,
  syncWorkspaceChrome = true,
}: FileEditorViewProps) {
  const file = useProjectFile(projectId, filePath);
  const access = useProjectAccess(projectId);
  const setCurrentFilePath = useWorkspaceStore((s) => s.setCurrentFilePath);
  const setBreadcrumb = useWorkspaceStore((s) => s.setBreadcrumb);
  const readOnly = access ? !access.canEdit : false;

  useEffect(() => {
    if (!syncWorkspaceChrome || !filePath) return;
    setBreadcrumb(filePathToBreadcrumb(projectId, filePath));
  }, [filePath, projectId, setBreadcrumb, syncWorkspaceChrome]);

  useEffect(() => {
    if (!syncWorkspaceChrome) return;
    setCurrentFilePath(filePath || null);
    return () => setCurrentFilePath(null);
  }, [filePath, setCurrentFilePath, syncWorkspaceChrome]);

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
        Select a file from the project tree on the left.
      </div>
    );
  }

  if (file === undefined || access === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
        Loading file…
      </div>
    );
  }

  if (file === null || file.kind !== "file") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-[13px] text-ws-text-muted">
        <p>File not found</p>
        <code className="rounded bg-ws-panel px-2 py-1 font-mono text-[12px] text-ws-text-secondary">
          {filePath}
        </code>
      </div>
    );
  }

  return (
    <FileEditorContent
      key={filePath}
      projectId={projectId}
      filePath={filePath}
      initialContent={file.content ?? ""}
      serverUpdatedAt={file.updatedAt}
      readOnly={readOnly}
    />
  );
}
