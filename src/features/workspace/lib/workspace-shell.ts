import type { Doc } from "@/convex/_generated/dataModel";

export type ShellProject = {
  name: string;
  source?: "blank" | "github";
  githubRepoUrl?: string;
  githubBranch?: string;
  lastCommitSha?: string;
  syncedAt?: number;
};

export type ShellFile = Pick<Doc<"projectFiles">, "path" | "name" | "kind" | "content">;

export type ShellContext = {
  project: ShellProject;
  files: ShellFile[];
  changedPaths: Set<string>;
  cwd: string;
};

export type ShellHandlers = {
  onGitInit?: (repoName: string) => Promise<string>;
  onOpenGitInitDialog?: () => void;
};

export type ShellResult = {
  output: string;
  exitCode: number;
  cwd?: string;
};

const HELP_TEXT = `Polaris terminal is a simulated shell (not a real OS terminal).
Node, pnpm, npm, and other system binaries are not available yet.

Available commands:
  help                 Show this help message
  clear                Clear the terminal
  pwd                  Print working directory
  ls [path]            List files and folders
  cat <file>           Print file contents
  cd <path>            Change directory
  git status           Show repository status
  git init [name]      Open init dialog, or create repo with <name>
  echo <text>          Print text`;

function normalizePath(path: string, cwd: string): string {
  const base = path.startsWith("/") ? path : `${cwd}/${path}`;
  const parts = base.split("/").filter(Boolean);
  const stack: string[] = [];

  for (const part of parts) {
    if (part === ".") {
      continue;
    }
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return stack.length === 0 ? "/" : `/${stack.join("/")}`;
}

function listDirectory(context: ShellContext, targetPath: string): string {
  const normalized = normalizePath(targetPath, context.cwd);
  const prefix =
    normalized === "/"
      ? ""
      : normalized.startsWith("/")
        ? normalized.slice(1)
        : normalized;

  const entries = new Map<string, "file" | "folder">();

  for (const file of context.files) {
    const relativePath = file.path;
    if (prefix && !relativePath.startsWith(`${prefix}/`) && relativePath !== prefix) {
      continue;
    }

    const remainder = prefix ? relativePath.slice(prefix.length + 1) : relativePath;
    const segment = remainder.split("/")[0];
    if (!segment) {
      continue;
    }

    const isDirectChild = !remainder.includes("/");
    if (isDirectChild) {
      entries.set(segment, file.kind);
      continue;
    }

    entries.set(segment, "folder");
  }

  if (entries.size === 0) {
    return normalized === "/" ? "(empty project)" : `ls: ${targetPath}: No such directory`;
  }

  return [...entries.entries()]
    .sort(([aName, aKind], [bName, bKind]) => {
      if (aKind !== bKind) {
        return aKind === "folder" ? -1 : 1;
      }
      return aName.localeCompare(bName);
    })
    .map(([name, kind]) => (kind === "folder" ? `${name}/` : name))
    .join("\n");
}

function readFile(context: ShellContext, targetPath: string): string {
  const normalized = normalizePath(targetPath, context.cwd);
  const path = normalized === "/" ? "" : normalized.slice(1);
  const file = context.files.find(
    (entry) => entry.kind === "file" && entry.path === path,
  );

  if (!file) {
    return `cat: ${targetPath}: No such file`;
  }

  return file.content ?? "";
}

function gitStatus(context: ShellContext): string {
  if (!context.project.githubRepoUrl) {
    return [
      "On branch (not initialized)",
      "",
      "This project is not linked to a GitHub repository.",
      "Run `git init` to create one.",
    ].join("\n");
  }

  const branch = context.project.githubBranch ?? "main";
  const lines = [`On branch ${branch}`, `Repository: ${context.project.githubRepoUrl}`];

  if (context.changedPaths.size === 0) {
    lines.push("", "nothing to commit, working tree clean");
    return lines.join("\n");
  }

  lines.push("", "Changes not staged for commit:");
  for (const path of [...context.changedPaths].sort()) {
    lines.push(`  modified: ${path}`);
  }

  return lines.join("\n");
}

export async function runShellCommand(
  input: string,
  context: ShellContext,
  handlers: ShellHandlers = {},
): Promise<ShellResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { output: "", exitCode: 0, cwd: context.cwd };
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  switch (command) {
    case "help":
      return { output: HELP_TEXT, exitCode: 0, cwd: context.cwd };
    case "clear":
      return { output: "__CLEAR__", exitCode: 0, cwd: context.cwd };
    case "pwd":
      return { output: context.cwd, exitCode: 0, cwd: context.cwd };
    case "ls":
      return {
        output: listDirectory(context, args[0] ?? "."),
        exitCode: 0,
        cwd: context.cwd,
      };
    case "cat": {
      if (!args[0]) {
        return { output: "cat: missing file operand", exitCode: 1, cwd: context.cwd };
      }
      const output = readFile(context, args[0]);
      return {
        output,
        exitCode: output.startsWith("cat:") ? 1 : 0,
        cwd: context.cwd,
      };
    }
    case "cd": {
      if (!args[0]) {
        return { output: context.cwd, exitCode: 0, cwd: "/" };
      }
      const next = normalizePath(args[0], context.cwd);
      if (next !== "/" && !context.files.some((file) => file.path.startsWith(next.slice(1)))) {
        return {
          output: `cd: ${args[0]}: No such directory`,
          exitCode: 1,
          cwd: context.cwd,
        };
      }
      return { output: "", exitCode: 0, cwd: next };
    }
    case "echo":
      return { output: args.join(" "), exitCode: 0, cwd: context.cwd };
    case "git": {
      if (args[0] === "status") {
        return { output: gitStatus(context), exitCode: 0, cwd: context.cwd };
      }

      if (args[0] === "init") {
        if (context.project.githubRepoUrl) {
          return {
            output: "fatal: repository already initialized",
            exitCode: 1,
            cwd: context.cwd,
          };
        }

        if (!args[1]) {
          handlers.onOpenGitInitDialog?.();
          return {
            output: handlers.onOpenGitInitDialog
              ? "Opening repository initialization dialog…"
              : "fatal: repository name required. Use `git init <name>`.",
            exitCode: handlers.onOpenGitInitDialog ? 0 : 1,
            cwd: context.cwd,
          };
        }

        const repoName = args[1];
        if (!handlers.onGitInit) {
          return {
            output: "git init is unavailable in this session",
            exitCode: 1,
            cwd: context.cwd,
          };
        }

        try {
          const result = await handlers.onGitInit(repoName);
          return { output: result, exitCode: 0, cwd: context.cwd };
        } catch (error) {
          return {
            output:
              error instanceof Error
                ? `error: ${error.message}`
                : "error: failed to initialize repository",
            exitCode: 1,
            cwd: context.cwd,
          };
        }
      }

      return {
        output: `git: '${args[0] ?? ""}' is not supported. Try 'git status' or 'git init'.`,
        exitCode: 1,
        cwd: context.cwd,
      };
    }
    default:
      return {
        output: `${command}: command not found. Type 'help' for available commands.`,
        exitCode: 127,
        cwd: context.cwd,
      };
  }
}
