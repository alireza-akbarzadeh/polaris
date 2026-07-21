import { sentryMiddleware } from "@inngest/middleware-sentry";
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "polaris",
  middleware: [sentryMiddleware()]
});
