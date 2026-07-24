/** Free-tier Gemini models for Polaris (Google AI Studio). */

export type PolarisChatModel = {
  id: string;
  name: string;
  tag: string;
  provider: "google";
  badge?: "NEW" | "FREE";
  description?: string;
};

/**
 * Gemini 2.5 is restricted for many new API keys ("no longer available").
 * Prefer Gemini 3.x Free Tier models — verified against Google AI Studio.
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const POLARIS_CHAT_MODELS: PolarisChatModel[] = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    tag: "Fast",
    provider: "google",
    badge: "FREE",
    description: "Fastest free-tier model for chat and tooling",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tag: "Lite",
    provider: "google",
    badge: "FREE",
    description: "Cost-efficient Flash Lite for high-volume tasks",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tag: "Balanced",
    provider: "google",
    badge: "FREE",
    description: "Strong coding quality; may hit capacity limits",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tag: "Latest",
    provider: "google",
    badge: "NEW",
    description: "Newest Flash — speed plus stronger reasoning",
  },
  {
    id: "gemini-flash-lite-latest",
    name: "Gemini Flash Lite",
    tag: "Alias",
    provider: "google",
    description: "Always points at the latest Flash Lite release",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash",
    tag: "Alias",
    provider: "google",
    description: "Always points at the latest Flash release",
  },
];

/** Default for chat, commit messages, and inline suggestions. */
export const POLARIS_CHAT_MODEL = POLARIS_CHAT_MODELS[0]!.id;

export const POLARIS_CHAT_MODEL_LABEL = POLARIS_CHAT_MODELS[0]!.name;

/** Shared model id for non-chat generateText routes. */
export const POLARIS_COMPLETION_MODEL = POLARIS_CHAT_MODEL;

export function getPolarisChatModel(id: string): PolarisChatModel {
  return (
    POLARIS_CHAT_MODELS.find((model) => model.id === id) ??
    POLARIS_CHAT_MODELS[0]!
  );
}

export function isAllowedPolarisChatModel(id: string): boolean {
  return POLARIS_CHAT_MODELS.some((model) => model.id === id);
}
