import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { POLARIS_COMPLETION_MODEL } from "@/lib/ai/gemini-model";
import { COMMIT_MESSAGE_PROMPT } from "@/lib/prompt";

const stagedFileSchema = z.object({
  path: z.string(),
  isNew: z.boolean(),
  content: z.string(),
  syncedContent: z.string(),
});

const commitMessageRequestSchema = z.object({
  projectName: z.string().optional(),
  files: z.array(stagedFileSchema).min(1),
});

function formatStagedChanges(
  files: z.infer<typeof stagedFileSchema>[],
): string {
  return files
    .map((file) => {
      const status = file.isNew ? "new file" : "modified";
      const parts = [
        `### ${file.path} (${status})`,
        file.isNew
          ? null
          : file.syncedContent
            ? `<before>\n${file.syncedContent}\n</before>`
            : null,
        file.content
          ? `<after>\n${file.content}\n</after>`
          : "<after>(empty)</after>",
      ];
      return parts.filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function buildPrompt(input: z.infer<typeof commitMessageRequestSchema>) {
  return COMMIT_MESSAGE_PROMPT.replace(
    "{projectName}",
    input.projectName?.trim() || "(unnamed)",
  ).replace("{stagedChanges}", formatStagedChanges(input.files));
}

function stripMessageNoise(text: string): string {
  return text
    .trim()
    .replace(/^```(?:\w+)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = commitMessageRequestSchema.parse(await request.json());
    const { text } = await generateText({
      model: google(POLARIS_COMPLETION_MODEL),
      prompt: buildPrompt(body),
    });

    const message = stripMessageNoise(text);
    if (!message) {
      return NextResponse.json(
        { error: "Empty commit message from model" },
        { status: 502 },
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Commit message request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
