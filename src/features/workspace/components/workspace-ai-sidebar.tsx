"use client";

import { useChat } from "@ai-sdk/react";
import { useConvex, useMutation } from "convex/react";
import {
  ArrowLeftIcon,
  ListTodoIcon,
  RotateCcwIcon,
  SparklesIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { toast } from "sonner";

import { Shimmer as TextShimmer } from "@/components/ai-elements/shimmer";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProjectAccess } from "@/features/projects/hooks/use-project-access";
import { WorkspaceAiChatInput } from "@/features/workspace/components/workspace-ai-chat-input";
import { WorkspaceAiHistoryPanel } from "@/features/workspace/components/workspace-ai-history-panel";
import { WorkspaceAiPlanCard } from "@/features/workspace/components/workspace-ai-plan-card";
import { WorkspaceAiTaskCard } from "@/features/workspace/components/workspace-ai-task-card";
import { WorkspaceMessageResponse } from "@/features/workspace/components/workspace-message-response";
import { AiCodeActionsProvider } from "@/features/workspace/context/ai-code-actions-context";
import { runCommand } from "@/features/workspace/commands/registry";
import { useEditorTabs } from "@/features/workspace/hooks/use-editor-tabs";
import {
  useChangedFiles,
  useProjectFile,
  useProjectFiles,
} from "@/features/workspace/hooks/use-project-files";
import {
  createAiChatSession,
  deriveSessionSubtitle,
  deriveSessionTitle,
  loadAiChatSessions,
  saveAiChatSessions,
  type AiChatSession,
} from "@/features/workspace/lib/ai-chat-sessions";
import { saveFileContentDraft } from "@/features/workspace/lib/file-content-drafts";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import {
  DEFAULT_AI_CHAT_MODE,
  isAiChatMode,
  type AiChatMode,
} from "@/lib/ai/chat-mode";
import { POLARIS_CHAT_MODEL } from "@/lib/ai/gemini-model";
import {
  WORKSPACE_CONTEXT_LIMITS,
  type WorkspaceChatContext,
} from "@/lib/ai/workspace-context";
import { cn } from "@/lib/utils";

type WorkspaceAiSidebarProps = {
  projectId: string;
  projectName?: string;
};

type PanelView = "history" | "chat";

function buildWelcome(projectName?: string): UIMessage {
  return {
    id: "welcome",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: projectName
          ? `I'm Polaris — ready to help with **${projectName}**. Ask me to explain code, create files, or edit the project directly.`
          : "I'm Polaris — your AI pair for this workspace. Ask about code, or tell me to create and edit files.",
      },
    ],
  };
}

function WorkspaceAiChatSession({
  projectId,
  projectName,
  session,
  onSessionChange,
  onBack,
}: {
  projectId: string;
  projectName?: string;
  session: AiChatSession;
  onSessionChange: (session: AiChatSession) => void;
  onBack: () => void;
}) {
  const editorTabs = useWorkspaceStore((s) => s.editorTabs);
  const activeEditorTabId = useWorkspaceStore((s) => s.activeEditorTabId);
  const [modelId, setModelId] = useState(POLARIS_CHAT_MODEL);
  const [autoModel, setAutoModel] = useState(false);
  const [mode, setMode] = useState<AiChatMode>(
    isAiChatMode(session.mode) ? session.mode : DEFAULT_AI_CHAT_MODE,
  );
  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const activeFilePath =
    editorTabs.find((tab) => tab.id === activeEditorTabId)?.path ??
    editorTabs.find((tab) => tab.kind === "file")?.path;

  const projectFiles = useProjectFiles(projectId);
  const activeFileDoc = useProjectFile(projectId, activeFilePath ?? "");
  const changedFiles = useChangedFiles(projectId);
  const access = useProjectAccess(projectId);
  const canEdit = access?.canEdit ?? false;

  const workspaceContext = useMemo((): WorkspaceChatContext => {
    const fileTree =
      projectFiles
        ?.filter((file) => file.kind === "file")
        .map((file) => file.path)
        .sort()
        .slice(0, WORKSPACE_CONTEXT_LIMITS.maxFilePaths) ?? [];

    const openFiles = editorTabs
      .filter((tab) => tab.kind === "file" && tab.path)
      .map((tab) => tab.path!)
      .slice(0, WORKSPACE_CONTEXT_LIMITS.maxOpenTabs);

    return {
      projectName,
      activeFilePath,
      activeFileContent:
        activeFileDoc?.kind === "file" ? activeFileDoc.content : undefined,
      openFiles,
      fileTree,
      changedFiles: changedFiles?.map((file) => file.path) ?? [],
    };
  }, [
    projectName,
    activeFilePath,
    activeFileDoc,
    editorTabs,
    projectFiles,
    changedFiles,
  ]);

  const workspaceContextRef = useRef(workspaceContext);
  workspaceContextRef.current = workspaceContext;

  const convex = useConvex();
  const writeFileAtPath = useMutation(api.projectFiles.writeFileAtPath);
  const { openTab } = useEditorTabs(projectId);

  const writeFileRef = useRef(writeFileAtPath);
  writeFileRef.current = writeFileAtPath;
  const openTabRef = useRef(openTab);
  openTabRef.current = openTab;
  const convexRef = useRef(convex);
  convexRef.current = convex;
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  const addToolOutputRef = useRef<
    | ((args: {
        tool: string;
        toolCallId: string;
        output?: unknown;
        state?: "output-error";
        errorText?: string;
      }) => void)
    | null
  >(null);

  type ExecuteToolArgs = {
    toolName: string;
    toolCallId: string;
    input: unknown;
  };

  const executeWorkspaceTool = useCallback(async ({
    toolName,
    toolCallId,
    input,
  }: ExecuteToolArgs) => {
    const add = addToolOutputRef.current;
    if (!add) return;

    const pid = projectIdRef.current as Id<"projects">;

    try {
      if (toolName === "writeFile") {
        const typed = input as { path: string; content: string };
        const result = await writeFileRef.current({
          projectId: pid,
          path: typed.path,
          content: typed.content,
        });
        saveFileContentDraft(pid, result.path, typed.content);
        add({
          tool: "writeFile",
          toolCallId,
          output: result,
        });
        openTabRef.current({ kind: "file", path: result.path });
        toast.success(
          result.created ? `Created ${result.path}` : `Updated ${result.path}`,
        );
        return;
      }

      if (toolName === "readFile") {
        const typed = input as { path: string };
        const file = await convexRef.current.query(api.projectFiles.getByPath, {
          projectId: pid,
          path: typed.path,
        });
        if (!file || file.kind !== "file") {
          add({
            tool: "readFile",
            toolCallId,
            state: "output-error",
            errorText: `File not found: ${typed.path}`,
          });
          return;
        }
        add({
          tool: "readFile",
          toolCallId,
          output: { path: file.path, content: file.content ?? "" },
        });
        return;
      }

      if (toolName === "listFiles") {
        const typed = input as { prefix?: string };
        const files = await convexRef.current.query(
          api.projectFiles.listByProject,
          { projectId: pid },
        );
        const paths = files
          .filter((file) => file.kind === "file")
          .map((file) => file.path)
          .filter((path) =>
            typed.prefix ? path.startsWith(typed.prefix) : true,
          )
          .sort();
        add({
          tool: "listFiles",
          toolCallId,
          output: { paths, count: paths.length },
        });
      }
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Tool execution failed";
      add({
        tool: toolName,
        toolCallId,
        state: "output-error",
        errorText,
      });
      toast.error("Could not apply file change", { description: errorText });
    }
  }, []);

  const initialMessages = useMemo(
    () =>
      session.messages.length > 0
        ? session.messages
        : [buildWelcome(projectName)],
    [session.messages, projectName],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          model: autoModel ? POLARIS_CHAT_MODEL : modelIdRef.current,
          mode: modeRef.current,
          workspace: workspaceContextRef.current,
        }),
      }),
    [autoModel],
  );

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const {
    messages,
    sendMessage,
    status,
    setMessages,
    stop,
    error,
    addToolOutput,
    regenerate,
  } = useChat({
    id: session.id,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic) return;
      await executeWorkspaceTool({
        toolName: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        input: toolCall.input,
      });
    },
  });

  addToolOutputRef.current = addToolOutput as typeof addToolOutputRef.current;

  const retryToolPart = useCallback(
    async (part: ToolUIPart | DynamicToolUIPart) => {
      if (!("toolCallId" in part) || !("input" in part)) return;
      await executeWorkspaceTool({
        toolName: getToolName(part),
        toolCallId: part.toolCallId,
        input: part.input,
      });
    },
    [executeWorkspaceTool],
  );

  const retryLastResponse = useCallback(() => {
    void regenerate();
  }, [regenerate]);

  useEffect(() => {
    const userMessages = messages.filter((message) => message.role === "user");
    const firstUserText = userMessages[0]?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ");

    onSessionChange({
      ...sessionRef.current,
      messages,
      mode,
      title:
        userMessages.length > 0 && firstUserText
          ? deriveSessionTitle(firstUserText)
          : sessionRef.current.title,
      subtitle: deriveSessionSubtitle(messages),
      updatedAt: Date.now(),
    });
  }, [messages, mode, onSessionChange]);

  const handleModeChange = useCallback(
    (next: AiChatMode) => {
      setMode(next);
      onSessionChange({
        ...sessionRef.current,
        mode: next,
        updatedAt: Date.now(),
      });
    },
    [onSessionChange],
  );

  const suggestions = useMemo(() => {
    if (mode === "plan") {
      return [
        activeFilePath
          ? `Plan a refactor for ${activeFilePath}`
          : "Plan the next feature for this project",
        "Outline steps to add tests",
        "What risks should we consider?",
        "Break this into implementation tasks",
      ];
    }
    return [
      activeFilePath ? `Explain ${activeFilePath}` : "Summarize this project",
      "Create a Card component file",
      "What files are in this project?",
      "Suggest refactor",
    ];
  }, [activeFilePath, mode]);

  const resetChat = () => {
    setMessages([buildWelcome(projectName)]);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text && message.files.length === 0) return;

    await sendMessage({
      text: text || "Review the attached files.",
      files: message.files,
    });
  };

  const sendSuggestion = (value: string) => {
    void sendMessage({ text: value });
  };

  const visibleMessages = messages.filter(
    (message) => message.id !== "welcome",
  );
  const showWelcome = visibleMessages.length === 0;

  const applyCodeToFile = useCallback(
    async (path: string, content: string) => {
      const result = await writeFileAtPath({
        projectId: projectId as Id<"projects">,
        path,
        content,
      });
      saveFileContentDraft(projectId, result.path, content);
      openTab({ kind: "file", path: result.path });
      return result;
    },
    [openTab, projectId, writeFileAtPath],
  );

  const codeActions = useMemo(
    () => ({
      projectId,
      canEdit,
      activeFilePath: activeFilePath ?? null,
      applyCodeToFile,
    }),
    [activeFilePath, applyCodeToFile, canEdit, projectId],
  );

  return (
    <AiCodeActionsProvider value={codeActions}>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ws-border-subtle px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Back to agents"
          className="size-6 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-3.5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold tracking-wide text-ws-text">
            {session.title}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Reset chat"
          className="size-6 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
          onClick={resetChat}
        >
          <RotateCcwIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close AI panel"
          className="size-6 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
          onClick={() => runCommand("toggleAiPanel")}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-ws-border-subtle px-3 py-2">
        <Badge
          variant="outline"
          className={cn(
            "h-5 gap-1 rounded-sm border-ws-border px-1.5 text-[10px] font-normal",
            mode === "plan"
              ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-ws-accent/15 text-ws-accent-soft",
          )}
        >
          {mode === "plan" ? (
            <ListTodoIcon className="size-2.5" />
          ) : (
            <WrenchIcon className="size-2.5" />
          )}
          {mode === "plan" ? "Plan mode" : "Task mode"}
        </Badge>
        <Badge
          variant="outline"
          className="h-5 rounded-sm border-ws-border bg-ws-bg px-1.5 text-[10px] font-normal text-ws-text-secondary"
        >
          {projectName ?? "Workspace"}
        </Badge>
        {activeFilePath ? (
          <Badge
            variant="outline"
            className="h-5 max-w-[140px] truncate rounded-sm border-ws-border bg-ws-bg px-1.5 text-[10px] font-normal text-ws-text-muted"
            title={activeFilePath}
          >
            {activeFilePath}
          </Badge>
        ) : null}
        {(workspaceContext.fileTree?.length ?? 0) > 0 ? (
          <Badge
            variant="outline"
            className="h-5 rounded-sm border-ws-border bg-ws-bg px-1.5 text-[10px] font-normal text-ws-text-muted"
          >
            {workspaceContext.fileTree!.length} files in context
          </Badge>
        ) : null}
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 p-3">
          {showWelcome ? (
            <ConversationEmptyState
              title={mode === "plan" ? "Plan with Polaris" : "Ask Polaris"}
              description={
                mode === "plan"
                  ? "Outline steps and risks without editing files"
                  : "Create files, edit code, or run tasks in this project"
              }
              icon={
                <Image
                  src="/logo.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="size-5"
                />
              }
              className="text-ws-text-muted"
            />
          ) : (
            <>
              {messages.map((message, messageIndex) => {
                if (message.id === "welcome" && visibleMessages.length > 0) {
                  return null;
                }

                const isLastAssistant =
                  message.role === "assistant" &&
                  messageIndex === messages.length - 1 &&
                  status === "ready";
                const isStreamingAssistant =
                  message.role === "assistant" &&
                  messageIndex === messages.length - 1 &&
                  (status === "streaming" || status === "submitted");

                return (
                  <Message
                    key={message.id}
                    from={message.role}
                    className="max-w-full"
                  >
                    {message.role === "assistant" ? (
                      <div className="mb-1 flex items-center gap-1.5">
                        <Image
                          src="/logo.svg"
                          alt=""
                          width={14}
                          height={14}
                          className="size-3.5"
                        />
                        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ws-text-muted">
                          Polaris
                        </span>
                        {isLastAssistant ? (
                          <MessageActions className="ml-auto">
                            <MessageAction
                              tooltip="Retry response"
                              label="Retry"
                              className="size-6 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
                              onClick={retryLastResponse}
                            >
                              <RotateCcwIcon className="size-3" />
                            </MessageAction>
                          </MessageActions>
                        ) : null}
                      </div>
                    ) : null}
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "rounded-xl border border-ws-accent/30 bg-ws-accent/15 px-3 py-2 text-[13px] text-ws-text group-[.is-user]:bg-ws-accent/15"
                          : mode === "plan"
                            ? "bg-transparent p-0 text-[13px] leading-relaxed text-ws-text-secondary"
                            : "rounded-xl border border-ws-border/60 bg-ws-bg/80 px-3 py-2 text-[13px] leading-relaxed text-ws-text-secondary"
                      }
                    >
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          if (message.role === "assistant" && mode === "plan") {
                            return (
                              <WorkspaceAiPlanCard
                                key={`${message.id}-${index}`}
                                content={part.text}
                                isStreaming={isStreamingAssistant}
                              />
                            );
                          }
                          return message.role === "assistant" ? (
                            <WorkspaceMessageResponse
                              key={`${message.id}-${index}`}
                            >
                              {part.text}
                            </WorkspaceMessageResponse>
                          ) : (
                            <p key={`${message.id}-${index}`}>{part.text}</p>
                          );
                        }

                        if (part.type === "file") {
                          return (
                            <p
                              key={`${message.id}-${index}`}
                              className="text-[11px] text-ws-text-muted"
                            >
                              Attached: {part.filename ?? "file"}
                            </p>
                          );
                        }

                        if (isToolUIPart(part)) {
                          const name = getToolName(part);
                          return (
                            <WorkspaceAiTaskCard
                              key={`${message.id}-${index}`}
                              name={name}
                              part={part}
                              onRetryAction={
                                part.state === "output-error"
                                  ? () => retryToolPart(part)
                                  : undefined
                              }
                            />
                          );
                        }

                        return null;
                      })}
                    </MessageContent>
                  </Message>
                );
              })}

              {status === "submitted" ? (
                <Message from="assistant" className="max-w-full">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Image
                      src="/logo.svg"
                      alt=""
                      width={14}
                      height={14}
                      className="size-3.5"
                    />
                    <TextShimmer className="text-[11px] text-ws-text-muted">
                      {mode === "plan" ? "Drafting plan…" : "Working on task…"}
                    </TextShimmer>
                  </div>
                </Message>
              ) : null}

              {error ? (
                <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <p className="min-w-0 flex-1 text-[12px] text-red-300">
                    {error.message}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-[11px] text-red-200 hover:bg-red-500/20 hover:text-red-100"
                    onClick={retryLastResponse}
                  >
                    <RotateCcwIcon className="size-3" />
                    Retry
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton className="border-ws-border bg-ws-hover text-ws-text hover:bg-ws-hover-deep" />
      </Conversation>

      <div className="shrink-0 space-y-2 border-t border-ws-border-subtle p-3">
        <Suggestions className="gap-1.5 px-0.5">
          {suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion}
              suggestion={suggestion}
              onClick={sendSuggestion}
              className="h-7 rounded-full border-ws-border bg-ws-hover px-3 text-[11px] text-ws-text hover:bg-ws-hover-deep hover:text-white"
            />
          ))}
        </Suggestions>

        <WorkspaceAiChatInput
          projectId={projectId}
          projectName={projectName}
          status={status}
          mode={mode}
          onModeChange={handleModeChange}
          modelId={modelId}
          onModelChange={setModelId}
          autoModel={autoModel}
          onAutoModelChange={setAutoModel}
          onSubmit={handleSubmit}
          onStop={() => void stop()}
        />
      </div>
    </div>
    </AiCodeActionsProvider>
  );
}

export function WorkspaceAiSidebar({
  projectId,
  projectName,
}: WorkspaceAiSidebarProps) {
  const [panelView, setPanelView] = useState<PanelView>("chat");
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadAiChatSessions(projectId);
    setSessions(stored);
    if (stored[0]) {
      setActiveSessionId(stored[0].id);
    } else {
      const created = createAiChatSession();
      setSessions([created]);
      setActiveSessionId(created.id);
    }
  }, [projectId]);

  useEffect(() => {
    if (sessions.length > 0) {
      saveAiChatSessions(projectId, sessions);
    }
  }, [projectId, sessions]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const upsertSession = useCallback((updated: AiChatSession) => {
    setSessions((current) => {
      const index = current.findIndex((session) => session.id === updated.id);
      if (index === -1) return [updated, ...current];
      const next = [...current];
      next[index] = updated;
      return next;
    });
  }, []);

  const handleNewAgent = useCallback(() => {
    const created = createAiChatSession();
    setSessions((current) => [created, ...current]);
    setActiveSessionId(created.id);
    setPanelView("chat");
  }, []);

  const requestNewChat = useWorkspaceStore((s) => s.requestNewChat);
  const clearRequestNewChat = useWorkspaceStore((s) => s.clearRequestNewChat);

  useEffect(() => {
    if (!requestNewChat) {
      return;
    }
    handleNewAgent();
    clearRequestNewChat();
  }, [clearRequestNewChat, handleNewAgent, requestNewChat]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleNewAgent();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewAgent]);

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setPanelView("chat");
  };

  return (
    <aside className="flex h-full flex-col border-l border-ws-border-subtle bg-ws-panel">
      {panelView === "history" ? (
        <>
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ws-border-subtle px-3">
            <div className="flex size-5 items-center justify-center rounded-sm bg-ws-accent/15">
              <SparklesIcon
                className="size-3 text-ws-accent-soft"
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold tracking-wide text-ws-text">
                Polaris Agents
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close AI panel"
              className="size-6 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
              onClick={() => runCommand("toggleAiPanel")}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>

          <WorkspaceAiHistoryPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewAgent={handleNewAgent}
          />
        </>
      ) : activeSession ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <WorkspaceAiChatSession
            key={activeSession.id}
            projectId={projectId}
            projectName={projectName}
            session={activeSession}
            onSessionChange={upsertSession}
            onBack={() => setPanelView("history")}
          />
        </div>
      ) : null}
    </aside>
  );
}
