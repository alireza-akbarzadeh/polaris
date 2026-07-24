import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { POLARIS_COMPLETION_MODEL } from "@/lib/ai/gemini-model";
import { normalizeInlineSuggestion } from "@/lib/normalize-inline-suggestion";
import { SUGGESTION_PROMPT } from "@/lib/prompt";

const suggestionRequestSchema = z.object({
  fileName: z.string(),
  code: z.string(),
  currentLine: z.string(),
  previousLines: z.string(),
  textBeforeCursor: z.string(),
  textAfterCursor: z.string(),
  nextLines: z.string(),
  lineNumber: z.number(),
});

function buildPrompt(input: z.infer<typeof suggestionRequestSchema>) {
  return SUGGESTION_PROMPT.replace("{fileName}", input.fileName)
    .replace("{previousLines}", input.previousLines)
    .replace("{lineNumber}", String(input.lineNumber))
    .replace("{currentLine}", input.currentLine)
    .replace("{textBeforeCursor}", input.textBeforeCursor)
    .replace("{textAfterCursor}", input.textAfterCursor)
    .replace("{nextLines}", input.nextLines)
    .replace("{code}", input.code);
}

export async function POST(request: Request) {
  try {
    const body = suggestionRequestSchema.parse(await request.json());
    const { text } = await generateText({
      model: google(POLARIS_COMPLETION_MODEL),
      prompt: buildPrompt(body),
    });

    const suggestion = normalizeInlineSuggestion(text) ?? "";
    return NextResponse.json({ suggestion });
  } catch {
    return NextResponse.json({ suggestion: "" }, { status: 500 });
  }
}
