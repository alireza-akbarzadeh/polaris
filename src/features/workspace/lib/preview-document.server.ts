import "server-only";

import * as esbuild from "esbuild";

import {
  findProjectEntryPath,
  normalizeProjectPath,
} from "@/features/workspace/lib/preview-utils";

export type PreviewFiles = Record<string, string>;

type PreviewBuildInput = {
  files: PreviewFiles;
  /** Currently open file — used for markdown/html fallbacks. */
  activePath?: string;
};

function loaderForPath(filePath: string): esbuild.Loader {
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".ts")) return "ts";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".js")) return "js";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".css")) return "css";
  return "tsx";
}

function htmlShell(body: string, styles = "") {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: #fff; color: #111; }
      body { font-family: system-ui, -apple-system, sans-serif; }
      #root { min-height: 100vh; }
      ${styles}
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function previewErrorHtml(message: string) {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return htmlShell(
    `<main style="padding:1.5rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;white-space:pre-wrap;color:#b91c1c">${escaped}</main>`,
  );
}

function markdownToHtml(markdown: string) {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withBlocks = escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return htmlShell(
    `<main style="max-width:720px;margin:0 auto;padding:2rem;line-height:1.6"><p>${withBlocks}</p></main>`,
  );
}

function dirname(path: string) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function joinPath(base: string, relative: string) {
  const parts = [
    ...(base ? base.split("/") : []),
    ...relative.split("/"),
  ];
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function parsePathAliases(tsconfigRaw: string | undefined): Record<string, string> {
  if (!tsconfigRaw) {
    return { "@/": "src/" };
  }

  try {
    const parsed = JSON.parse(tsconfigRaw) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    const paths = parsed.compilerOptions?.paths ?? {};
    const aliases: Record<string, string> = {};

    for (const [key, values] of Object.entries(paths)) {
      const target = values[0];
      if (!target) continue;
      const aliasKey = key.replace(/\*$/, "");
      const aliasTarget = normalizeProjectPath(target.replace(/\*$/, ""));
      aliases[aliasKey] = aliasTarget.endsWith("/")
        ? aliasTarget
        : `${aliasTarget}/`;
    }

    if (!aliases["@/"]) {
      aliases["@/"] = "src/";
    }

    return aliases;
  } catch {
    return { "@/": "src/" };
  }
}

function tryResolveFile(
  files: Map<string, string>,
  candidate: string,
): string | null {
  const normalized = normalizeProjectPath(candidate);
  if (files.has(normalized)) return normalized;

  const extensions = [
    "",
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    ".json",
    ".css",
    "/index.tsx",
    "/index.ts",
    "/index.jsx",
    "/index.js",
  ];

  for (const extension of extensions) {
    const path = normalizeProjectPath(`${normalized}${extension}`);
    if (files.has(path)) return path;
  }

  return null;
}

function resolveImportPath(
  files: Map<string, string>,
  importer: string,
  request: string,
  aliases: Record<string, string>,
): string | null {
  let rewritten = request;

  for (const [alias, target] of Object.entries(aliases)) {
    if (request === alias.slice(0, -1) || request.startsWith(alias)) {
      rewritten = `${target}${request.slice(alias.length)}`;
      break;
    }
  }

  if (
    !rewritten.startsWith(".") &&
    !rewritten.startsWith("/") &&
    rewritten === request
  ) {
    return null;
  }

  const baseDir = dirname(normalizeProjectPath(importer));
  const absolute = rewritten.startsWith("/")
    ? normalizeProjectPath(rewritten)
    : joinPath(baseDir, rewritten);

  return tryResolveFile(files, absolute);
}

function extractModuleScripts(html: string): string[] {
  const scripts: string[] = [];
  const re =
    /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    scripts.push(normalizeProjectPath(match[1] ?? ""));
  }
  return scripts.filter(Boolean);
}

function stripModuleScripts(html: string) {
  return html.replace(
    /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi,
    "",
  );
}

function createVirtualFsPlugin(
  files: Map<string, string>,
  aliases: Record<string, string>,
): esbuild.Plugin {
  return {
    name: "polaris-virtual-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.namespace === "virtual") {
          const resolved = resolveImportPath(
            files,
            args.importer,
            args.path,
            aliases,
          );
          if (resolved) {
            return { path: resolved, namespace: "virtual" };
          }
          return undefined;
        }

        if (args.kind === "entry-point") {
          const resolved = tryResolveFile(files, args.path);
          if (resolved) {
            return { path: resolved, namespace: "virtual" };
          }
        }

        if (
          args.path.startsWith(".") ||
          args.path.startsWith("/") ||
          args.path.startsWith("@/")
        ) {
          const importer = args.importer || args.resolveDir || "";
          const resolved = resolveImportPath(
            files,
            importer,
            args.path,
            aliases,
          );
          if (resolved) {
            return { path: resolved, namespace: "virtual" };
          }
        }

        return undefined;
      });

      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        const contents = files.get(args.path);
        if (contents === undefined) {
          return {
            errors: [{ text: `File not found in project: ${args.path}` }],
          };
        }

        if (args.path.endsWith(".css")) {
          return {
            contents: `
              const style = document.createElement("style");
              style.setAttribute("data-polaris-preview", ${JSON.stringify(args.path)});
              style.textContent = ${JSON.stringify(contents)};
              document.head.appendChild(style);
            `,
            loader: "js",
            resolveDir: process.cwd(),
          };
        }

        return {
          contents,
          loader: loaderForPath(args.path),
          resolveDir: process.cwd(),
        };
      });
    },
  };
}

async function bundleEntry(
  files: Map<string, string>,
  entryPath: string,
  aliases: Record<string, string>,
) {
  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: "esm",
    jsx: "automatic",
    target: "es2020",
    platform: "browser",
    plugins: [createVirtualFsPlugin(files, aliases)],
    logLevel: "silent",
  });

  return result.outputFiles[0]?.text ?? "";
}

function injectScript(html: string, script: string) {
  const tag = `<script type="module">${script}</script>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${tag}</body>`);
  }
  return `${html}${tag}`;
}

async function buildFromIndexHtml(
  files: Map<string, string>,
  aliases: Record<string, string>,
) {
  const html = files.get("index.html");
  if (!html) {
    throw new Error("index.html not found");
  }

  const scripts = extractModuleScripts(html);
  if (scripts.length === 0) {
    return html.includes("<html") ? html : htmlShell(html);
  }

  const entry =
    scripts.length === 1
      ? scripts[0]!
      : (() => {
          const synthetic = scripts
            .map((path) => `import "./${path}";`)
            .join("\n");
          files.set("__polaris_preview_entry__.js", synthetic);
          return "__polaris_preview_entry__.js";
        })();

  const bundled = await bundleEntry(files, entry, aliases);
  return injectScript(stripModuleScripts(html), bundled);
}

async function buildFromJsEntry(
  files: Map<string, string>,
  entryPath: string,
  aliases: Record<string, string>,
) {
  const bundled = await bundleEntry(files, entryPath, aliases);
  return htmlShell(
    `<div id="root"></div><script type="module">${bundled}</script>`,
  );
}

async function buildNextAppPreview(
  files: Map<string, string>,
  pagePath: string,
  aliases: Record<string, string>,
) {
  const cssCandidates = [
    pagePath.replace(/page\.tsx?$/, "globals.css"),
    pagePath.replace(/page\.jsx?$/, "globals.css"),
    "src/app/globals.css",
    "app/globals.css",
  ];
  const cssPath = cssCandidates.find((path) => files.has(normalizeProjectPath(path)));

  const synthetic = `
    import React from "react";
    import { createRoot } from "react-dom/client";
    import Page from "./${pagePath}";
    ${cssPath ? `import "./${cssPath}";` : ""}

    const mount = document.getElementById("root");
    if (mount) {
      createRoot(mount).render(React.createElement(Page));
    }
  `;

  files.set("__polaris_preview_entry__.tsx", synthetic);
  return buildFromJsEntry(files, "__polaris_preview_entry__.tsx", aliases);
}

async function buildSingleComponentPreview(
  code: string,
  filePath: string,
  files: Map<string, string>,
  aliases: Record<string, string>,
) {
  const normalizedPath = normalizeProjectPath(filePath);
  files.set(normalizedPath, code);

  if (/^export default\s+/m.test(code)) {
    files.set(
      "__polaris_preview_entry__.tsx",
      `
        import React from "react";
        import { createRoot } from "react-dom/client";
        import PreviewComponent from "./${normalizedPath}";

        const mount = document.getElementById("root");
        if (mount) {
          createRoot(mount).render(React.createElement(PreviewComponent));
        }
      `,
    );
  } else {
    files.set(
      "__polaris_preview_entry__.tsx",
      `
        import "./${normalizedPath}";
      `,
    );
  }

  return buildFromJsEntry(files, "__polaris_preview_entry__.tsx", aliases);
}

function isNextPagePath(path: string) {
  return /(^|\/)app\/page\.(t|j)sx$/i.test(path);
}

export async function buildPreviewDocument(input: PreviewBuildInput) {
  const files = new Map<string, string>();
  for (const [path, content] of Object.entries(input.files)) {
    files.set(normalizeProjectPath(path), content);
  }

  const aliases = parsePathAliases(files.get("tsconfig.json"));
  const activePath = input.activePath
    ? normalizeProjectPath(input.activePath)
    : undefined;

  // Prefer full-project entry when available.
  const entry = findProjectEntryPath(files.keys());

  try {
    if (entry === "index.html") {
      return await buildFromIndexHtml(files, aliases);
    }

    if (entry && isNextPagePath(entry)) {
      return await buildNextAppPreview(files, entry, aliases);
    }

    if (entry && /\.(tsx?|jsx?)$/i.test(entry)) {
      return await buildFromJsEntry(files, entry, aliases);
    }

    // Fallbacks for docs / single files when the project has no app entry.
    if (activePath && /\.html?$/i.test(activePath)) {
      const code = files.get(activePath) ?? "";
      return code.includes("<html") ? code : htmlShell(code);
    }

    if (activePath && /\.md$/i.test(activePath)) {
      return markdownToHtml(files.get(activePath) ?? "");
    }

    if (activePath && /\.(tsx?|jsx?)$/i.test(activePath)) {
      return await buildSingleComponentPreview(
        files.get(activePath) ?? "",
        activePath,
        files,
        aliases,
      );
    }

    return htmlShell(
      `<main style="padding:2rem;color:#666">No previewable project entry found. Add an <code>index.html</code>, <code>src/main.tsx</code>, or <code>src/app/page.tsx</code>.</main>`,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "errors" in error &&
      Array.isArray((error as esbuild.BuildFailure).errors)
    ) {
      const details = (error as esbuild.BuildFailure).errors
        .map((item) => item.text)
        .filter(Boolean)
        .join("\n");
      return previewErrorHtml(details || "Preview build failed");
    }

    const message =
      error instanceof Error ? error.message : "Preview build failed";
    return previewErrorHtml(message);
  }
}
