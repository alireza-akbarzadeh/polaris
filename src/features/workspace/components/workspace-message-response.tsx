"use client";

import { cjk } from "@streamdown/cjk";
import { createCodePlugin } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { memo, type ComponentProps } from "react";
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockDownloadButton,
  Streamdown,
  type CustomRendererProps,
} from "streamdown";

import {
  ApplyCodeToFileButton,
  parsePathFromMeta,
} from "@/features/workspace/components/apply-code-to-file-button";
import { cn } from "@/lib/utils";

const lightCodePlugin = createCodePlugin({
  themes: ["github-light", "github-light"],
});

const CODE_LANGUAGES = [
  "",
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "js",
  "ts",
  "json",
  "css",
  "html",
  "markdown",
  "md",
  "mdx",
  "python",
  "py",
  "rust",
  "go",
  "bash",
  "shell",
  "sh",
  "zsh",
  "sql",
  "yaml",
  "yml",
  "toml",
  "xml",
  "svg",
  "text",
  "plaintext",
  "txt",
  "diff",
  "dockerfile",
  "graphql",
  "vue",
  "svelte",
  "scss",
  "less",
];

function ApplyAwareCodeBlock({
  code,
  language,
  isIncomplete,
  meta,
}: CustomRendererProps) {
  const path = parsePathFromMeta(meta);

  return (
    <CodeBlock code={code} language={language} isIncomplete={isIncomplete}>
      {path ? (
        <span
          className="mr-1 max-w-35 truncate font-mono text-[10px] text-[#656d76]"
          title={path}
        >
          {path}
        </span>
      ) : null}
      <CodeBlockCopyButton />
      <CodeBlockDownloadButton />
      <ApplyCodeToFileButton code={code} language={language} meta={meta} />
    </CodeBlock>
  );
}

const streamdownPlugins = {
  cjk,
  code: lightCodePlugin,
  math,
  mermaid,
  renderers: [
    {
      language: CODE_LANGUAGES,
      component: ApplyAwareCodeBlock,
    },
  ],
};

export type WorkspaceMessageResponseProps = ComponentProps<typeof Streamdown>;

export const WorkspaceMessageResponse = memo(
  ({ className, shikiTheme, ...props }: WorkspaceMessageResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      plugins={streamdownPlugins}
      shikiTheme={shikiTheme ?? ["github-light", "github-light"]}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating,
);

WorkspaceMessageResponse.displayName = "WorkspaceMessageResponse";
