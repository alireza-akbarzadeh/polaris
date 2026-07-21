import firecrawl from "@/lib/firecrawl";
import { URL_REGEX } from "@/lib/regex";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { inngest } from "./client";

export const blocking = inngest.createFunction(
  {
    id: "demo-blocking",
    triggers: [{ event: "demo/blocking" }],
  },
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string };

    const urls = await step.run("scrape-urls", async () => {
      return prompt.match(URL_REGEX) ?? [];
    });

    const scrapedContent = await step.run("scrape-content", async () => {
      const content = await Promise.all(
        urls
          .filter((url): url is string => typeof url === "string")
          .map(async (url) => {
            const response = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });
            return response.markdown;
          }),
      );
      return content;
    });
    const finalPrompt = `
      You are a helpful assistant that can answer questions and help with tasks.
      You are given a prompt and a list of URLs.
      You need to scrape the content of the URLs and use the content to answer the prompt.
      The prompt is: ${prompt}
      The URLs are: ${urls.join(", ")}
      The scraped content is: ${scrapedContent.join("\n")}
      `;
    const content = await step.run("generate-content", async () => {
      const response = await generateText({
        model: google("gemini-3.5-flash"),
        prompt: finalPrompt,
      });

      return {
        message: `hello ${event.data}`,
        text: response.text,
      };
    });

    return { urls, scrapedContent, content };
  },
);
