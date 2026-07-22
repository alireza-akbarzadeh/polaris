"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowLeftIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { Shimmer as TextShimmer } from "@/components/ai-elements/shimmer";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceAiChatInput } from "@/features/workspace/components/workspace-ai-chat-input";
import { WorkspaceAiHistoryPanel } from "@/features/workspace/components/workspace-ai-history-panel";
import { runCommand } from "@/features/workspace/commands/registry";
import {
  createAiChatSession,
  deriveSessionSubtitle,
  deriveSessionTitle,
  loadAiChatSessions,
  saveAiChatSessions,
  type AiChatSession,
} from "@/features/workspace/lib/ai-chat-sessions";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { POLARIS_CHAT_MODEL } from "@/lib/ai/gemini-model";

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
          ? `I'm Polaris — ready to help with **${projectName}**. Ask me to explain code, plan a change, or draft an edit.`
          : "I'm Polaris — your AI pair for this workspace. Ask about code, architecture, or next steps.",
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
  const breadcrumb = useWorkspaceStore((s) => s.breadcrumb);
  const activeFile = breadcrumb.at(-1)?.label;
  const [modelId, setModelId] = useState(POLARIS_CHAT_MODEL);
  const [autoModel, setAutoModel] = useState(false);
  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;

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
          projectName,
          activeFile,
          model: autoModel ? POLARIS_CHAT_MODEL : modelIdRef.current,
        }),
      }),
    [projectName, activeFile, autoModel],
  );

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const { messages, sendMessage, status, setMessages, stop, error } = useChat({
    id: session.id,
    messages: initialMessages,
    transport,
  });

  useEffect(() => {
    const userMessages = messages.filter((message) => message.role === "user");
    const firstUserText = userMessages[0]?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ");

    onSessionChange({
      ...sessionRef.current,
      messages,
      title:
        userMessages.length > 0 && firstUserText
          ? deriveSessionTitle(firstUserText)
          : sessionRef.current.title,
      subtitle: deriveSessionSubtitle(messages),
      updatedAt: Date.now(),
    });
  }, [messages, onSessionChange]);

  const suggestions = useMemo(
    () => [
      activeFile ? `Explain ${activeFile}` : "Summarize this project",
      "Find bugs in selection",
      "Suggest refactor",
      "Write tests",
    ],
    [activeFile],
  );

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

  const visibleMessages = messages.filter((message) => message.id !== "welcome");
  const showWelcome = visibleMessages.length === 0;

  return (
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
          className="h-5 rounded-sm border-ws-border bg-ws-bg px-1.5 text-[10px] font-normal text-ws-text-secondary"
        >
          {projectName ?? "Workspace"}
        </Badge>
        {activeFile ? (
          <Badge
            variant="outline"
            className="h-5 max-w-[140px] truncate rounded-sm border-ws-border bg-ws-bg px-1.5 text-[10px] font-normal text-ws-text-muted"
          >
            {activeFile}
          </Badge>
        ) : null}
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 p-3">
          {showWelcome ? (
            <ConversationEmptyState
              title="Ask Polaris"
              description="Get help with code, refactors, and project planning"
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
              {messages.map((message) => {
                if (message.id === "welcome" && visibleMessages.length > 0) {
                  return null;
                }

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
                      </div>
                    ) : null}
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "rounded-xl border border-ws-accent/30 bg-ws-accent/15 px-3 py-2 text-[13px] text-ws-text group-[.is-user]:bg-ws-accent/15"
                          : "rounded-xl border border-ws-border/60 bg-ws-bg/80 px-3 py-2 text-[13px] leading-relaxed text-ws-text-secondary"
                      }
                    >
                      {message.parts.map((part, index) =>
                        part.type === "text" ? (
                          message.role === "assistant" ? (
                            <MessageResponse key={`${message.id}-${index}`}>
                              {part.text}
                            </MessageResponse>
                          ) : (
                            <p key={`${message.id}-${index}`}>{part.text}</p>
                          )
                        ) : part.type === "file" ? (
                          <p
                            key={`${message.id}-${index}`}
                            className="text-[11px] text-ws-text-muted"
                          >
                            Attached: {part.filename ?? "file"}
                          </p>
                        ) : null,
                      )}
                    </MessageContent>
                  </Message>
                );
              })}

              {status === "submitted" || status === "streaming" ? (
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
                      Thinking…
                    </TextShimmer>
                  </div>
                </Message>
              ) : null}

              {error ? (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                  {error.message}
                </p>
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
          modelId={modelId}
          onModelChange={setModelId}
          autoModel={autoModel}
          onAutoModelChange={setAutoModel}
          onSubmit={handleSubmit}
          onStop={() => void stop()}
        />
      </div>
    </div>
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
