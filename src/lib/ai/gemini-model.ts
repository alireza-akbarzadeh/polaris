/** Free-tier Gemini models for Polaris chat (education / testing). */

export type PolarisChatModel = {
  id: string;
  name: string;
  tag: string;
  provider: "google";
  badge?: "NEW" | "FREE";
  description?: string;
};

export const POLARIS_CHAT_MODELS: PolarisChatModel[] = [
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    tag: "Fast",
    provider: "google",
    badge: "FREE",
    description: "Cheapest free-tier Flash for testing",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    tag: "Balanced",
    provider: "google",
    badge: "FREE",
    description: "Good quality at flash speed",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash",
    tag: "Latest",
    provider: "google",
    badge: "NEW",
    description: "Always points at the latest Flash release",
  },
  {
    id: "gemini-flash-lite-latest",
    name: "Gemini Flash Lite",
    tag: "Lite",
    provider: "google",
    description: "Latest lite Flash alias",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    tag: "High",
    provider: "google",
    description: "Higher quality; may hit free-tier limits sooner",
  },
];

export const POLARIS_CHAT_MODEL = POLARIS_CHAT_MODELS[0]!.id;

export const POLARIS_CHAT_MODEL_LABEL = POLARIS_CHAT_MODELS[0]!.name;

export function getPolarisChatModel(id: string): PolarisChatModel {
  return (
    POLARIS_CHAT_MODELS.find((model) => model.id === id) ??
    POLARIS_CHAT_MODELS[0]!
  );
}

export function isAllowedPolarisChatModel(id: string): boolean {
  return POLARIS_CHAT_MODELS.some((model) => model.id === id);
}
