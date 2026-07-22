import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

import { POLARIS_CHAT_MODEL } from "@/lib/ai/gemini-model";

const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  projectName: z.string().optional(),
  activeFile: z.string().optional(),
  model: z.string().optional(),
});

function buildSystemPrompt({
  projectName,
  activeFile,
}: {
  projectName?: string;
  activeFile?: string;
}) {
  const context = [
    projectName ? `Project: ${projectName}` : null,
    activeFile ? `Active file: ${activeFile}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "You are Polaris, an expert AI pair programmer embedded in a web IDE.",
    "Help users understand code, plan changes, debug issues, and draft edits.",
    "Be concise and practical. Use markdown for code blocks and structure.",
    context ? `\nWorkspace context:\n${context}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = chatRequestSchema.parse(await request.json());
    const { messages, projectName, activeFile, model } = body;

    const result = streamText({
      model: google(model ?? POLARIS_CHAT_MODEL),
      system: buildSystemPrompt({ projectName, activeFile }),
      messages: await convertToModelMessages(messages),
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
