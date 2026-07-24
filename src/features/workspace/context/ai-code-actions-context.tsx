"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

export type ApplyCodeToFileFn = (
  path: string,
  content: string,
) => Promise<{ created: boolean; path: string }>;

type AiCodeActionsContextValue = {
  projectId: string;
  canEdit: boolean;
  activeFilePath: string | null;
  applyCodeToFile: ApplyCodeToFileFn;
};

const AiCodeActionsContext = createContext<AiCodeActionsContextValue | null>(
  null,
);

export function AiCodeActionsProvider({
  value,
  children,
}: {
  value: AiCodeActionsContextValue;
  children: ReactNode;
}) {
  return (
    <AiCodeActionsContext.Provider value={value}>
      {children}
    </AiCodeActionsContext.Provider>
  );
}

export function useAiCodeActions() {
  return useContext(AiCodeActionsContext);
}
