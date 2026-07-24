"use client";

import {
  AtSignIcon,
  BracesIcon,
  Code2Icon,
  FileTextIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatStatus, SourceDocumentUIPart } from "ai";

import {
  Attachment,
  AttachmentHoverCard,
  AttachmentHoverCardContent,
  AttachmentHoverCardTrigger,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputCommand,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandInput,
  PromptInputCommandItem,
  PromptInputCommandList,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  usePromptInputReferencedSources,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceAiModelPicker } from "@/features/workspace/components/workspace-ai-model-picker";
import { useProjectFiles } from "@/features/workspace/hooks/use-project-files";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

type WorkspaceAiChatInputProps = {
  projectId: string;
  projectName?: string;
  status: ChatStatus;
  disabled?: boolean;
  modelId: string;
  onModelChange: (modelId: string) => void;
  autoModel?: boolean;
  onAutoModelChange?: (auto: boolean) => void;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  onStop?: () => void;
};

function buildMessageWithReferences(
  message: PromptInputMessage,
  referenced: (SourceDocumentUIPart & { id: string })[],
  fileContents: Map<string, string>,
): PromptInputMessage {
  if (referenced.length === 0) return message;

  const context = referenced
    .map((source) => {
      const body = fileContents.get(source.sourceId) ?? "";
      return `\n\n---\nReferenced file: ${source.title ?? source.filename}\n\`\`\`\n${body}\n\`\`\``;
    })
    .join("");

  return {
    ...message,
    text: `${message.text}${context}`.trim(),
  };
}

function ReferencedSourcesBridge({
  referencedRef,
}: {
  referencedRef: React.MutableRefObject<
    (SourceDocumentUIPart & { id: string })[]
  >;
}) {
  const referenced = usePromptInputReferencedSources();

  useEffect(() => {
    referencedRef.current = referenced.sources;
  }, [referenced.sources, referencedRef]);

  return null;
}

function PromptInputAttachmentsPreview() {
  const attachments = usePromptInputAttachments();
  const referenced = usePromptInputReferencedSources();

  if (attachments.files.length === 0 && referenced.sources.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline" className="px-2 pt-2">
      {attachments.files.map((file) => (
        <AttachmentHoverCard key={file.id}>
          <AttachmentHoverCardTrigger>
            <Attachment
              data={file}
              onRemove={() => attachments.remove(file.id)}
            >
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove />
            </Attachment>
          </AttachmentHoverCardTrigger>
          <AttachmentHoverCardContent>
            <AttachmentPreview className="max-h-48 max-w-xs" />
          </AttachmentHoverCardContent>
        </AttachmentHoverCard>
      ))}
      {referenced.sources.map((source) => (
        <Attachment
          key={source.id}
          data={source}
          onRemove={() => referenced.remove(source.id)}
        >
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

function MentionPicker({
  projectId,
  open,
  onClose,
  fileContentsRef,
  query = "",
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  fileContentsRef: React.MutableRefObject<Map<string, string>>;
  query?: string;
}) {
  const files = useProjectFiles(projectId);
  const controller = usePromptInputController();
  const referenced = usePromptInputReferencedSources();

  const fileOptions = useMemo(() => {
    const all = (files ?? [])
      .filter((file) => file.kind === "file")
      .map((file) => ({
        path: file.path,
        name: file.name,
        content: file.content ?? "",
      }));
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (file) =>
        file.path.toLowerCase().includes(q) ||
        file.name.toLowerCase().includes(q),
    );
  }, [files, query]);

  const insertMention = useCallback(
    (path: string, name: string, content: string) => {
      const current = controller.textInput.value;
      const atIndex = current.lastIndexOf("@");
      const prefix = atIndex >= 0 ? current.slice(0, atIndex) : current;
      const suffix = atIndex >= 0 ? "" : current.endsWith(" ") ? "" : " ";
      controller.textInput.setInput(`${prefix}@${name}${suffix}`);

      fileContentsRef.current.set(path, content);
      referenced.add({
        type: "source-document",
        sourceId: path,
        title: name,
        filename: name,
        mediaType: "text/plain",
      });

      onClose();
    },
    [controller.textInput, fileContentsRef, onClose, referenced],
  );

  if (!open) return null;

  const isLoading = files === undefined;

  return (
    <div className="absolute right-2 bottom-full left-2 z-50 mb-1 max-h-56 overflow-hidden rounded-lg border border-ws-border bg-ws-panel shadow-lg">
      <PromptInputCommand>
        <PromptInputCommandInput
          placeholder="Mention a file…"
          value={query}
          onValueChange={() => {}}
        />
        <PromptInputCommandList>
          <PromptInputCommandEmpty>
            {isLoading ? "Loading files…" : "No files found."}
          </PromptInputCommandEmpty>
          <PromptInputCommandGroup heading="Project files">
            {fileOptions.map((file) => (
              <PromptInputCommandItem
                key={file.path}
                value={`${file.path} ${file.name}`}
                onSelect={() => insertMention(file.path, file.name, file.content)}
              >
                <FileTextIcon className="size-3.5 shrink-0 text-ws-accent-soft" />
                <span className="truncate">{file.path}</span>
              </PromptInputCommandItem>
            ))}
          </PromptInputCommandGroup>
        </PromptInputCommandList>
      </PromptInputCommand>
    </div>
  );
}

function PromptInputFields({
  projectId,
  projectName,
  status,
  disabled,
  modelId,
  onModelChange,
  autoModel,
  onAutoModelChange,
  onStop,
  mentionOpen,
  setMentionOpen,
  fileContentsRef,
}: Omit<WorkspaceAiChatInputProps, "onSubmit"> & {
  mentionOpen: boolean;
  setMentionOpen: (open: boolean) => void;
  fileContentsRef: React.MutableRefObject<Map<string, string>>;
}) {
  const controller = usePromptInputController();
  const attachments = usePromptInputAttachments();
  const referenced = usePromptInputReferencedSources();
  const currentFilePath = useWorkspaceStore((s) => s.currentFilePath);
  const files = useProjectFiles(projectId);

  const attachCurrentFile = useCallback(() => {
    if (!currentFilePath) return;
    const file = (files ?? []).find((item) => item.path === currentFilePath);
    if (!file || file.kind !== "file") return;

    fileContentsRef.current.set(file.path, file.content ?? "");
    referenced.add({
      type: "source-document",
      sourceId: file.path,
      title: file.name,
      filename: file.name,
      mediaType: "text/plain",
    });
  }, [currentFilePath, fileContentsRef, files, referenced]);

  const insertCodeFence = useCallback(() => {
    const current = controller.textInput.value;
    const block = current.trim()
      ? `\n\n\`\`\`typescript\n// your code\n\`\`\``
      : "```typescript\n// your code\n```";
    controller.textInput.setInput(`${current}${block}`);
  }, [controller.textInput]);

  const handleTextChange = useCallback(
    (value: string) => {
      controller.textInput.setInput(value);
      // Keep the picker open while typing an @query (letters, digits, / . - _)
      setMentionOpen(/@[\w./-]*$/.test(value) || value.endsWith("@"));
    },
    [controller.textInput, setMentionOpen],
  );

  const isBusy = status === "submitted" || status === "streaming";
  const canSubmit =
    controller.textInput.value.trim().length > 0 ||
    attachments.files.length > 0 ||
    referenced.sources.length > 0;

  const mentionQuery = useMemo(() => {
    const match = controller.textInput.value.match(/@([\w./-]*)$/);
    return match?.[1] ?? "";
  }, [controller.textInput.value]);

  return (
    <>
      <MentionPicker
        projectId={projectId}
        open={mentionOpen}
        onClose={() => setMentionOpen(false)}
        fileContentsRef={fileContentsRef}
        query={mentionQuery}
      />

      <PromptInputHeader>
        <PromptInputAttachmentsPreview />
      </PromptInputHeader>

      <PromptInputBody>
        <PromptInputTextarea
          value={controller.textInput.value}
          onChange={(event) => handleTextChange(event.target.value)}
          placeholder={`Ask about ${projectName ?? "this project"}… (@ file, attach images)`}
          className="min-h-14 text-[13px] text-ws-text placeholder:text-ws-text-muted"
          disabled={disabled || isBusy}
        />
      </PromptInputBody>

      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger
              className="size-7 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
              tooltip="Add attachments"
            />
            <PromptInputActionMenuContent className="border-ws-border bg-ws-panel">
              <PromptInputActionAddAttachments label="Upload files or images" />
              <PromptInputActionMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  attachCurrentFile();
                }}
                disabled={!currentFilePath}
              >
                <AtSignIcon className="mr-2 size-4" />
                Attach current file
              </PromptInputActionMenuItem>
              <PromptInputActionMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  insertCodeFence();
                }}
              >
                <Code2Icon className="mr-2 size-4" />
                Insert code block
              </PromptInputActionMenuItem>
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>

          <PromptInputButton
            type="button"
            className="size-7 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
            tooltip="Mention file"
            onClick={() => {
              const next = controller.textInput.value.endsWith("@")
                ? controller.textInput.value
                : `${controller.textInput.value}${controller.textInput.value && !controller.textInput.value.endsWith(" ") ? " " : ""}@`;
              controller.textInput.setInput(next);
              setMentionOpen(true);
            }}
          >
            <AtSignIcon className="size-3.5" />
          </PromptInputButton>

          <PromptInputButton
            type="button"
            className="size-7 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
            tooltip="Insert code fence"
            onClick={insertCodeFence}
          >
            <BracesIcon className="size-3.5" />
          </PromptInputButton>

          <SpeechInput
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
            onTranscriptionChange={(text) => {
              const current = controller.textInput.value;
              const spacer = current && !current.endsWith(" ") ? " " : "";
              controller.textInput.setInput(`${current}${spacer}${text}`);
            }}
          />

          <WorkspaceAiModelPicker
            value={modelId}
            onChange={onModelChange}
            auto={autoModel}
            onAutoChange={onAutoModelChange}
          />
        </PromptInputTools>

        <PromptInputSubmit
          status={status}
          onStop={onStop}
          className="size-7 rounded-lg bg-ws-accent text-white hover:bg-ws-accent-hover disabled:opacity-40"
          disabled={(!canSubmit && !isBusy) || disabled}
        />
      </PromptInputFooter>
    </>
  );
}

function PendingChatAttachBridge({
  projectId,
  fileContentsRef,
}: {
  projectId: string;
  fileContentsRef: React.MutableRefObject<Map<string, string>>;
}) {
  const files = useProjectFiles(projectId);
  const referenced = usePromptInputReferencedSources();
  const pendingChatAttachPaths = useWorkspaceStore(
    (s) => s.pendingChatAttachPaths,
  );
  const requestNewChat = useWorkspaceStore((s) => s.requestNewChat);
  const setPendingChatAttachPaths = useWorkspaceStore(
    (s) => s.setPendingChatAttachPaths,
  );

  useEffect(() => {
    // Wait until a requested new chat session has mounted.
    if (requestNewChat) {
      return;
    }
    if (!pendingChatAttachPaths || pendingChatAttachPaths.length === 0) {
      return;
    }
    if (!files) {
      return;
    }

    for (const path of pendingChatAttachPaths) {
      const file = files.find((item) => item.path === path);
      if (!file || file.kind !== "file") continue;

      fileContentsRef.current.set(file.path, file.content ?? "");
      referenced.add({
        type: "source-document",
        sourceId: file.path,
        title: file.name,
        filename: file.name,
        mediaType: "text/plain",
      });
    }

    setPendingChatAttachPaths(null);
  }, [
    fileContentsRef,
    files,
    pendingChatAttachPaths,
    referenced,
    requestNewChat,
    setPendingChatAttachPaths,
  ]);

  return null;
}

function PromptInputShell({
  onSubmit,
  ...props
}: WorkspaceAiChatInputProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const referencedRef = useRef<(SourceDocumentUIPart & { id: string })[]>([]);
  const fileContentsRef = useRef<Map<string, string>>(new Map());

  const handleSubmit = useCallback(
    (message: PromptInputMessage) =>
      onSubmit(
        buildMessageWithReferences(
          message,
          referencedRef.current,
          fileContentsRef.current,
        ),
      ),
    [onSubmit],
  );

  return (
    <PromptInput
      onSubmit={handleSubmit}
      accept="image/*,text/*,.ts,.tsx,.js,.jsx,.json,.md,.css,.html"
      multiple
      maxFiles={8}
      className="relative rounded-xl border-ws-border bg-ws-bg shadow-none **:data-[slot=input-group]:border-ws-border **:data-[slot=input-group]:bg-ws-bg"
    >
      <ReferencedSourcesBridge referencedRef={referencedRef} />
      <PendingChatAttachBridge
        projectId={props.projectId}
        fileContentsRef={fileContentsRef}
      />
      <PromptInputFields
        {...props}
        mentionOpen={mentionOpen}
        setMentionOpen={setMentionOpen}
        fileContentsRef={fileContentsRef}
      />
    </PromptInput>
  );
}

export function WorkspaceAiChatInput(props: WorkspaceAiChatInputProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <PromptInputProvider>
        <PromptInputShell {...props} />
      </PromptInputProvider>
    </TooltipProvider>
  );
}
