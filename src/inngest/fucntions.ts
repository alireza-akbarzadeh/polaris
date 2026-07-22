import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { inngest } from "./client";

export const blocking = inngest.createFunction(
  {
    id: "demo-blocking",
    triggers: [{ event: "demo/blocking" }],
  },
  async ({ event, step }) => {
    const text = await step.run("generate-text", async () => {
      const response = await generateText({
        model: google("gemini-3.5-flash"),
        prompt: "Write a short story about a cat",
      });
      return response.text;
    });

    return { message: `hello ${event.data.email}`, text };
  },
);
