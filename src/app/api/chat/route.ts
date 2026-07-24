import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";

import {
  DEFAULT_AI_CHAT_MODE,
  isAiChatMode,
} from "@/lib/ai/chat-mode";
import {
  isAllowedPolarisChatModel,
  POLARIS_CHAT_MODEL,
} from "@/lib/ai/gemini-model";
import {
  buildWorkspaceSystemPrompt,
  type WorkspaceChatContext,
} from "@/lib/ai/workspace-context";
import { toolsForChatMode } from "@/lib/ai/workspace-tools";

const workspaceContextSchema = z.object({
  projectName: z.string().optional(),
  activeFilePath: z.string().optional(),
  activeFileContent: z.string().optional(),
  openFiles: z.array(z.string()).optional(),
  fileTree: z.array(z.string()).optional(),
  changedFiles: z.array(z.string()).optional(),
});

const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  model: z.string().optional(),
  mode: z.enum(["plan", "task"]).optional(),
  /** @deprecated prefer workspace.projectName */
  projectName: z.string().optional(),
  /** @deprecated prefer workspace.activeFilePath */
  activeFile: z.string().optional(),
  workspace: workspaceContextSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const body = chatRequestSchema.parse(await request.json());
    const { messages, model } = body;
    const selectedModel =
      model && isAllowedPolarisChatModel(model) ? model : POLARIS_CHAT_MODEL;
    const mode = isAiChatMode(body.mode) ? body.mode : DEFAULT_AI_CHAT_MODE;

    const workspace: WorkspaceChatContext = {
      projectName: body.workspace?.projectName ?? body.projectName,
      activeFilePath: body.workspace?.activeFilePath ?? body.activeFile,
      activeFileContent: body.workspace?.activeFileContent,
      openFiles: body.workspace?.openFiles,
      fileTree: body.workspace?.fileTree,
      changedFiles: body.workspace?.changedFiles,
    };

    const result = streamText({
      model: google(selectedModel),
      system: buildWorkspaceSystemPrompt(workspace, mode),
      messages: await convertToModelMessages(messages),
      tools: toolsForChatMode(mode),
      stopWhen: stepCountIs(mode === "plan" ? 6 : 8),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
