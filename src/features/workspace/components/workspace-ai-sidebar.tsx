"use client";

import { RotateCcwIcon, SparklesIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { nanoid } from "nanoid";
import { useMemo, useState } from "react";
import type { UIMessage } from "ai";

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
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { runCommand } from "@/features/workspace/commands/registry";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

type WorkspaceAiSidebarProps = {
  projectId: string;
  projectName?: string;
};

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

export function WorkspaceAiSidebar({
  projectId,
  projectName,
}: WorkspaceAiSidebarProps) {
  const breadcrumb = useWorkspaceStore((s) => s.breadcrumb);
  const activeFile = breadcrumb.at(-1)?.label;

  const suggestions = useMemo(
    () => [
      activeFile ? `Explain ${activeFile}` : "Summarize this project",
      "Find bugs in selection",
      "Suggest refactor",
      "Write tests",
    ],
    [activeFile],
  );

  const [messages, setMessages] = useState<UIMessage[]>(() => [
    buildWelcome(projectName),
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const resetChat = () => {
    setMessages([buildWelcome(projectName)]);
    setInput("");
    setIsThinking(false);
  };

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const userMessage: UIMessage = {
      id: nanoid(),
      role: "user",
      parts: [{ type: "text", text: trimmed }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    await new Promise((resolve) => setTimeout(resolve, 700));

    const context = [
      projectName ? `Project: ${projectName}` : null,
      activeFile ? `File: ${activeFile}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const assistantMessage: UIMessage = {
      id: nanoid(),
      role: "assistant",
      parts: [
        {
          type: "text",
          text: context
            ? `Working in **${context}**.\n\nI received: “${trimmed}”. Agent streaming will connect here — for now I can help you plan the change, outline files to touch, and draft code snippets.`
            : `I received: “${trimmed}”. Agent streaming will connect here soon.`,
        },
      ],
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsThinking(false);
  };

  const onSubmit = (message: PromptInputMessage) => {
    void sendText(message.text);
  };

  return (
    <aside className="flex h-full flex-col border-l border-[#1e1f22] bg-[#2b2d30]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#1e1f22] px-3">
        <div className="flex size-5 items-center justify-center rounded-sm bg-[#3574f0]/15">
          <SparklesIcon className="size-3 text-[#6a9bf5]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold tracking-wide text-[#dfdfdf]">
            Polaris AI
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
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Ask Polaris"
              description="Get help with code, refactors, and project planning"
              icon={
                <Image src="/logo.svg" alt="" width={20} height={20} className="size-5" />
              }
              className="text-[#9a9a9a]"
            />
          ) : (
            <>
              {messages.map((message) => (
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
                      ) : null,
                    )}
                  </MessageContent>
                </Message>
              ))}

              {isThinking ? (
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
              onClick={(value) => void sendText(value)}
              className="h-7 rounded-full border-[#4e5155] bg-[#3c3f41] px-3 text-[11px] text-[#dfdfdf] hover:bg-[#45484c] hover:text-white"
            />
          ))}
        </Suggestions>

        <PromptInput
          onSubmit={onSubmit}
          className="rounded-xl border-[#4e5155] bg-[#1e1f22] shadow-none **:data-[slot=input-group]:border-[#4e5155] **:data-[slot=input-group]:bg-[#1e1f22]"
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Ask about ${projectName ?? "this project"}…`}
              className="min-h-12 text-[13px] text-[#dfdfdf] placeholder:text-[#787878]"
              disabled={isThinking}
            />
          </PromptInputBody>
          <PromptInputFooter className="px-2 pb-2">
            <span className="truncate pl-1 text-[10px] text-[#787878]">
              {projectId.slice(0, 8)}…
            </span>
            <PromptInputSubmit
              className="size-7 rounded-lg bg-[#3574f0] text-white hover:bg-[#2d66d8] disabled:opacity-40"
              disabled={!input.trim() || isThinking}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </aside>
  );
}
