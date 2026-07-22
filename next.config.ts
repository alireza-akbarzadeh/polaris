import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["esbuild"],
};

export default withSentryConfig(nextConfig, {
  org: "devtools-pk",
  project: "polarity",

  // Source map upload auth token (set SENTRY_AUTH_TOKEN for production builds)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client source files for better stack traces
  widenClientFileUpload: true,

  // Proxy events through the app to reduce ad-blocker drops
  tunnelRoute: "/monitoring",

  // Suppress non-CI build output
  silent: !process.env.CI,
});
