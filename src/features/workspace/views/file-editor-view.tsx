"use client";

import { Code2Icon, GlobeIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CodeEditor } from "@/features/workspace/components/code-editor";
import { WorkspacePreviewPanel } from "@/features/workspace/components/workspace-preview-panel";
import {
  useProjectFile,
  useUpdateProjectFileContent,
} from "@/features/workspace/hooks/use-project-files";
import type { Id } from "@/convex/_generated/dataModel";
import { useFileBreadcrumb } from "@/features/workspace/hooks/use-workspace-breadcrumb";
import { isPreviewableFile } from "@/features/workspace/lib/preview-document";
import { cn } from "@/lib/utils";

type EditorPanelTab = "code" | "preview";

type FileEditorViewProps = {
  projectId: string;
  filePath: string;
};

function EditorViewTabs({
  activeTab,
  onChange,
  previewAvailable,
}: {
  activeTab: EditorPanelTab;
  onChange: (tab: EditorPanelTab) => void;
  previewAvailable: boolean;
}) {
  return (
    <div className="flex h-8 shrink-0 items-end gap-px border-b border-[#2b2d30] bg-[#2b2d30] px-1">
      <button
        type="button"
        onClick={() => onChange("code")}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-t-sm px-3 text-[11px] font-medium transition-colors",
          activeTab === "code"
            ? "bg-[#1e1f22] text-[#dfdfdf]"
            : "text-[#9a9a9a] hover:text-[#dfdfdf]",
        )}
      >
        <Code2Icon className="size-3" />
        Code
      </button>
      {previewAvailable ? (
        <button
          type="button"
          onClick={() => onChange("preview")}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-t-sm px-3 text-[11px] font-medium transition-colors",
            activeTab === "preview"
              ? "bg-[#1e1f22] text-[#dfdfdf]"
              : "text-[#9a9a9a] hover:text-[#dfdfdf]",
          )}
        >
          <GlobeIcon className="size-3" />
          Preview
        </button>
      ) : null}
    </div>
  );
}

type FileEditorContentProps = {
  projectId: string;
  filePath: string;
  initialContent: string;
};

function FileEditorContent({
  projectId,
  filePath,
  initialContent,
}: FileEditorContentProps) {
  const [activeTab, setActiveTab] = useState<EditorPanelTab>("code");
  const [content, setContent] = useState(initialContent);
  const updateContent = useUpdateProjectFileContent();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewAvailable = isPreviewableFile(filePath);

  const persistContent = useCallback(
    (nextContent: string) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void updateContent({
          projectId: projectId as Id<"projects">,
          path: filePath,
          content: nextContent,
        });
      }, 500);
    },
    [filePath, projectId, updateContent],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const onContentChange = (nextContent: string) => {
    setContent(nextContent);
    persistContent(nextContent);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorViewTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        previewAvailable={previewAvailable}
      />

      <div className="min-h-0 flex-1">
        {activeTab === "code" ? (
          <CodeEditor
            value={content}
            filePath={filePath}
            onChange={onContentChange}
          />
        ) : (
          <WorkspacePreviewPanel
            code={content}
            filePath={filePath}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}

export function FileEditorView({ projectId, filePath }: FileEditorViewProps) {
  const file = useProjectFile(projectId, filePath);

  useFileBreadcrumb(projectId, filePath);

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-[#9a9a9a]">
        Select a file from the project tree on the left.
      </div>
    );
  }

  if (file === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-[#9a9a9a]">
        Loading file…
      </div>
    );
  }

  if (file === null || file.kind !== "file") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-[13px] text-[#9a9a9a]">
        <p>File not found</p>
        <code className="rounded bg-[#2b2d30] px-2 py-1 font-mono text-[12px] text-[#bcbec4]">
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
    />
  );
}
