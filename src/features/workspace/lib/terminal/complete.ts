import { GIT_SUBCOMMANDS, SHELL_COMMANDS } from "./commands";
import type { CommandHistory } from "./history";

export type CompleteFile = {
  path: string;
  kind: "file" | "folder";
};

export type CompleteContext = {
  cwd: string;
  files: CompleteFile[];
  history: CommandHistory;
};

export type Suggestion = {
  /** Full line after accepting the suggestion */
  line: string;
  /** Ghost suffix to show after the typed prefix (may be empty) */
  ghost: string;
};

function prefixMatch(candidates: readonly string[], token: string): string | null {
  const lower = token.toLowerCase();
  const matches = candidates.filter((c) => c.toLowerCase().startsWith(lower));
  if (matches.length === 0) return null;

  // Prefer exact case-insensitive match, else shortest unique prefix expansion
  const exact = matches.find((c) => c.toLowerCase() === lower);
  if (exact && matches.length === 1) return exact;

  return longestCommonPrefix(matches);
}

function longestCommonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (let i = 1; i < values.length; i++) {
    while (!values[i].toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return values[0];
    }
  }
  return prefix;
}

function normalizeCwd(cwd: string): string {
  return cwd === "/" ? "" : cwd.replace(/^\//, "").replace(/\/$/, "");
}

/** Entries directly under `dir` (project-relative, no leading slash). */
function listEntries(
  files: CompleteFile[],
  dir: string,
): Array<{ name: string; kind: "file" | "folder" }> {
  const prefix = dir ? `${dir}/` : "";
  const seen = new Map<string, "file" | "folder">();

  for (const file of files) {
    if (prefix && !file.path.startsWith(prefix) && file.path !== dir) {
      continue;
    }
    if (!prefix && file.path.includes("/")) {
      const top = file.path.split("/")[0];
      if (top) seen.set(top, "folder");
      continue;
    }

    const remainder = prefix ? file.path.slice(prefix.length) : file.path;
    if (!remainder) continue;

    const slash = remainder.indexOf("/");
    if (slash === -1) {
      seen.set(remainder, file.kind);
    } else {
      seen.set(remainder.slice(0, slash), "folder");
    }
  }

  return [...seen.entries()].map(([name, kind]) => ({ name, kind }));
}

function completePath(
  token: string,
  cwd: string,
  files: CompleteFile[],
): string | null {
  const baseDir = normalizeCwd(cwd);
  const hasSlash = token.includes("/");

  let dir: string;
  let namePrefix: string;

  if (token.startsWith("/")) {
    const trimmed = token.slice(1);
    if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      namePrefix = parts.pop() ?? "";
      dir = parts.join("/");
    } else {
      dir = "";
      namePrefix = trimmed;
    }
  } else if (hasSlash) {
    const parts = token.split("/");
    namePrefix = parts.pop() ?? "";
    const relative = parts.join("/");
    dir = baseDir ? `${baseDir}/${relative}` : relative;
  } else {
    dir = baseDir;
    namePrefix = token;
  }

  const entries = listEntries(files, dir);
  const matches = entries.filter((e) =>
    e.name.toLowerCase().startsWith(namePrefix.toLowerCase()),
  );
  if (matches.length === 0) return null;

  const best =
    matches.length === 1
      ? matches[0]
      : {
          name: longestCommonPrefix(matches.map((m) => m.name)),
          kind: "file" as const,
        };

  if (!best.name || best.name === namePrefix) {
    // Single exact match: append / for folders so Tab can continue
    if (matches.length === 1 && matches[0].kind === "folder") {
      const completed = rebuildPathToken(token, namePrefix, `${matches[0].name}/`);
      return completed === token ? null : completed;
    }
    return null;
  }

  const suffix =
    matches.length === 1 && matches[0].kind === "folder" ? "/" : "";
  return rebuildPathToken(token, namePrefix, `${best.name}${suffix}`);
}

function rebuildPathToken(
  original: string,
  namePrefix: string,
  replacement: string,
): string {
  if (!namePrefix) {
    if (original.endsWith("/")) return `${original}${replacement}`;
    if (original === "/" || original === "") return replacement.startsWith("/")
      ? replacement
      : original.startsWith("/")
        ? `/${replacement}`
        : replacement;
    return original + replacement;
  }
  return original.slice(0, original.length - namePrefix.length) + replacement;
}

/**
 * Tab completion for the current token.
 * Returns a new full line, or null if nothing to complete.
 */
export function completeLine(
  line: string,
  ctx: CompleteContext,
): string | null {
  const parts = line.split(/\s+/);
  const endsWithSpace = /\s$/.test(line);
  const token = endsWithSpace ? "" : (parts[parts.length - 1] ?? "");
  const command = parts[0] ?? "";
  const isFirst = parts.length <= 1 && !endsWithSpace;

  let completed: string | null = null;

  if (isFirst) {
    completed = prefixMatch(SHELL_COMMANDS, token);
  } else if (command === "git" && parts.length === 2 && !endsWithSpace) {
    completed = prefixMatch(GIT_SUBCOMMANDS, token);
  } else if (
    command === "cd" ||
    command === "ls" ||
    command === "cat" ||
    (command === "git" && parts[1] === "init")
  ) {
    completed = completePath(token, ctx.cwd, ctx.files);
  }

  if (!completed || completed === token) return null;

  if (endsWithSpace) {
    return `${line}${completed}`;
  }

  const before = line.slice(0, line.length - token.length);
  return `${before}${completed}`;
}

/**
 * Fish-style inline suggestion while typing.
 * Prefers history matches; falls back to command/path completion.
 */
export function suggestLine(
  line: string,
  ctx: CompleteContext,
): Suggestion | null {
  if (!line) return null;

  const fromHistory = ctx.history.suggest(line);
  if (fromHistory) {
    return { line: fromHistory, ghost: fromHistory.slice(line.length) };
  }

  const completed = completeLine(line, ctx);
  if (!completed || completed === line) return null;

  return { line: completed, ghost: completed.slice(line.length) };
}
