import { inngest } from "@/inngest/client";
import { blocking } from "@/inngest/fucntions";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [blocking],
});
