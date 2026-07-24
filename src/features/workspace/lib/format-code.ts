import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";
import htmlPlugin from "prettier/plugins/html";
import markdownPlugin from "prettier/plugins/markdown";
import postcssPlugin from "prettier/plugins/postcss";
import typescriptPlugin from "prettier/plugins/typescript";
import prettier from "prettier/standalone";

const PLUGINS = [
  estreePlugin,
  typescriptPlugin,
  babelPlugin,
  postcssPlugin,
  htmlPlugin,
  markdownPlugin,
];

type PrettierParser =
  | "typescript"
  | "babel"
  | "json"
  | "css"
  | "html"
  | "markdown";

function parserForPath(filePath: string): PrettierParser | null {
  const lower = filePath.toLowerCase();
  if (/\.tsx?$/.test(lower)) return "typescript";
  if (/\.(jsx?|mjs|cjs)$/.test(lower)) return "babel";
  if (/\.jsonc?$/.test(lower)) return "json";
  if (/\.css$/.test(lower)) return "css";
  if (/\.html?$/.test(lower)) return "html";
  if (/\.(md|mdx|markdown)$/.test(lower)) return "markdown";
  return null;
}

export function canFormatPath(filePath: string): boolean {
  return parserForPath(filePath) !== null;
}

export async function formatCode(
  code: string,
  filePath: string,
  tabWidth = 2,
): Promise<string> {
  const parser = parserForPath(filePath);
  if (!parser) {
    throw new Error("Formatting is not supported for this file type");
  }

  return prettier.format(code, {
    parser,
    plugins: PLUGINS,
    tabWidth,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    printWidth: 80,
  });
}
