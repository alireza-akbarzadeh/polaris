"use client";

import { CheckIcon, FilePlus2Icon, Loader2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useAiCodeActions } from "@/features/workspace/context/ai-code-actions-context";
import { cn } from "@/lib/utils";

const EXT_BY_LANGUAGE: Record<string, string> = {
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  javascript: "js",
  js: "js",
  jsx: "jsx",
  json: "json",
  css: "css",
  html: "html",
  markdown: "md",
  md: "md",
  mdx: "mdx",
  python: "py",
  py: "py",
  rust: "rs",
  go: "go",
  bash: "sh",
  shell: "sh",
  sh: "sh",
  sql: "sql",
  yaml: "yml",
  yml: "yml",
  toml: "toml",
  xml: "xml",
  svg: "svg",
  text: "txt",
  plaintext: "txt",
};

/** Parse a file path from fence meta like `title="src/App.tsx"` or a bare path. */
export function parsePathFromMeta(meta?: string): string | null {
  if (!meta?.trim()) return null;

  const titled =
    meta.match(/(?:title|file|path|filename)\s*=\s*["']([^"']+)["']/i) ??
    meta.match(/(?:title|file|path|filename)\s*=\s*([^\s{]+)/i);
  if (titled?.[1]) {
    return titled[1].replace(/^\.\//, "").trim() || null;
  }

  const bare = meta.match(
    /(?:^|\s)((?:[\w.-]+\/)+[\w.-]+\.[\w]+)(?:\s|$)/,
  );
  if (bare?.[1]) {
    return bare[1].replace(/^\.\//, "").trim() || null;
  }

  return null;
}

function suggestPath(
  language: string,
  activeFilePath: string | null,
  metaPath: string | null,
): string {
  if (metaPath) return metaPath;
  if (activeFilePath) return activeFilePath;
  const ext = EXT_BY_LANGUAGE[language.toLowerCase()] ?? "txt";
  return `src/untitled.${ext}`;
}

export function ApplyCodeToFileButton({
  code,
  language,
  meta,
  className,
}: {
  code: string;
  language: string;
  meta?: string;
  className?: string;
}) {
  const actions = useAiCodeActions();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  const onApply = useCallback(async () => {
    if (!actions || actions.canEdit === false) {
      toast.error("You do not have edit access to this project");
      return;
    }
    if (!code.trim()) {
      toast.error("Code block is empty");
      return;
    }

    const metaPath = parsePathFromMeta(meta);
    const suggested = suggestPath(language, actions.activeFilePath, metaPath);
    const entered = window.prompt(
      metaPath
        ? "Apply this code to file (create if missing):"
        : "Enter a file path to create or update:",
      suggested,
    );
    if (entered == null) return;

    const path = entered.trim().replace(/^\.\//, "");
    if (!path || path.endsWith("/")) {
      toast.error("Enter a valid file path");
      return;
    }

    setState("saving");
    try {
      const result = await actions.applyCodeToFile(path, code);
      setState("done");
      toast.success(
        result.created ? `Created ${result.path}` : `Updated ${result.path}`,
      );
      window.setTimeout(() => setState("idle"), 1600);
    } catch (error) {
      setState("idle");
      toast.error("Could not apply to file", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [actions, code, language, meta]);

  if (!actions) return null;

  return (
    <button
      type="button"
      data-streamdown="code-block-apply-button"
      aria-label="Apply to file"
      title="Apply to file"
      disabled={state === "saving" || !actions.canEdit}
      onClick={() => void onApply()}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40",
        className,
      )}
    >
      {state === "saving" ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : state === "done" ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <FilePlus2Icon className="size-3.5" />
      )}
    </button>
  );
}
