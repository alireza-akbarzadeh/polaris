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
        body: {
          projectName,
          activeFile,
          model: POLARIS_CHAT_MODEL,
        },
      }),
    [projectName, activeFile],
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
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#1e1f22] px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Back to agents"
          className="size-6 text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-3.5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold tracking-wide text-[#dfdfdf]">
            {session.title}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Reset chat"
          className="size-6 text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
          onClick={resetChat}
        >
          <RotateCcwIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close AI panel"
          className="size-6 text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
          onClick={() => runCommand("toggleAiPanel")}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[#1e1f22] px-3 py-2">
        <Badge
          variant="outline"
          className="h-5 rounded-sm border-[#4e5155] bg-[#1e1f22] px-1.5 text-[10px] font-normal text-[#bcbec4]"
        >
          {projectName ?? "Workspace"}
        </Badge>
        {activeFile ? (
          <Badge
            variant="outline"
            className="h-5 max-w-[140px] truncate rounded-sm border-[#4e5155] bg-[#1e1f22] px-1.5 text-[10px] font-normal text-[#9a9a9a]"
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
              className="text-[#9a9a9a]"
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
                        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#787878]">
                          Polaris
                        </span>
                      </div>
                    ) : null}
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "rounded-xl border border-[#3574f0]/30 bg-[#3574f0]/15 px-3 py-2 text-[13px] text-[#dfdfdf] group-[.is-user]:bg-[#3574f0]/15"
                          : "rounded-xl border border-[#4e5155]/60 bg-[#1e1f22]/80 px-3 py-2 text-[13px] leading-relaxed text-[#bcbec4]"
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
                            className="text-[11px] text-[#9a9a9a]"
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
                    <TextShimmer className="text-[11px] text-[#787878]">
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
        <ConversationScrollButton className="border-[#4e5155] bg-[#3c3f41] text-[#dfdfdf] hover:bg-[#45484c]" />
      </Conversation>

      <div className="shrink-0 space-y-2 border-t border-[#1e1f22] p-3">
        <Suggestions className="gap-1.5 px-0.5">
          {suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion}
              suggestion={suggestion}
              onClick={sendSuggestion}
              className="h-7 rounded-full border-[#4e5155] bg-[#3c3f41] px-3 text-[11px] text-[#dfdfdf] hover:bg-[#45484c] hover:text-white"
            />
          ))}
        </Suggestions>

        <WorkspaceAiChatInput
          projectId={projectId}
          projectName={projectName}
          status={status}
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
    <aside className="flex h-full flex-col border-l border-[#1e1f22] bg-[#2b2d30]">
      {panelView === "history" ? (
        <>
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#1e1f22] px-3">
            <div className="flex size-5 items-center justify-center rounded-sm bg-[#3574f0]/15">
              <SparklesIcon
                className="size-3 text-[#6a9bf5]"
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold tracking-wide text-[#dfdfdf]">
                Polaris Agents
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close AI panel"
              className="size-6 text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
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
