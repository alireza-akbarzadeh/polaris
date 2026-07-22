import "server-only";

import * as esbuild from "esbuild";

function loaderForPath(filePath: string): esbuild.Loader {
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".ts")) return "ts";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".js")) return "js";
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

async function reactPreviewHtml(code: string, filePath: string) {
  const normalized = code.replace(/^export default\s+/m, "const PreviewComponent = ");

  const entry = `
    import React from "react";
    import { createRoot } from "react-dom/client";

    ${normalized}

    const mount = document.getElementById("root");
    if (mount && typeof PreviewComponent !== "undefined") {
      createRoot(mount).render(React.createElement(PreviewComponent));
    } else if (mount) {
      mount.innerHTML = "<p style='padding:1rem;color:#666'>No default export found to preview.</p>";
    }
  `;

  const result = await esbuild.build({
    stdin: {
      contents: entry,
      loader: loaderForPath(filePath),
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: "esm",
    jsx: "automatic",
    target: "es2020",
  });

  const script = result.outputFiles[0]?.text ?? "";

  return htmlShell(
    `<div id="root"></div><script type="module">${script}</script>`,
    "main { margin: 0; }",
  );
}

export async function buildPreviewDocument(code: string, filePath: string) {
  if (/\.html?$/i.test(filePath)) {
    return code.includes("<html") ? code : htmlShell(code);
  }

  if (/\.md$/i.test(filePath)) {
    return markdownToHtml(code);
  }

  if (/\.(tsx?|jsx?)$/i.test(filePath)) {
    return reactPreviewHtml(code, filePath);
  }

  return htmlShell(
    `<main style="padding:2rem;color:#666">Preview is not available for this file type.</main>`,
  );
}
