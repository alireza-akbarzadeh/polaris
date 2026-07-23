import type { Doc } from "@/convex/_generated/dataModel";

export type ShellProject = {
  name: string;
  source?: "blank" | "github" | "template";
  templateId?: "empty" | "simple" | "nextjs" | "react" | "tanstack";
  githubRepoUrl?: string;
  githubBranch?: string;
  lastCommitSha?: string;
  syncedAt?: number;
};

export type ShellFile = Pick<
  Doc<"projectFiles">,
  "path" | "name" | "kind" | "content"
>;

export type ShellContext = {
  project: ShellProject;
  files: ShellFile[];
  changedPaths: Set<string>;
  cwd: string;
};

export type ShellHandlers = {
  onGitInit?: (repoName: string) => Promise<string>;
  onOpenGitInitDialog?: () => void;
  onGitPull?: () => Promise<string>;
  onGitCommitPush?: (message: string) => Promise<string>;
  onGitBranchList?: () => Promise<string>;
  onGitCheckout?: (branch: string) => Promise<string>;
  onGitCreateBranch?: (name: string) => Promise<string>;
  onGitLog?: (limit?: number) => Promise<string>;
};

export type ShellResult = {
  output: string;
  exitCode: number;
  cwd?: string;
};

const HELP_TEXT = `Polaris terminal is a simulated shell (not a real OS terminal).
Node, pnpm, npm, and other system binaries are not available yet.

Shortcuts:
  Tab                        Autocomplete command / path
  → (right arrow)            Accept dim history suggestion
  ↑ / ↓                      Browse command history
  Ctrl+L                     Clear screen
  Ctrl+U                     Clear line
  Ctrl+W                     Delete last word

Available commands:
  help                      Show this help message
  clear                     Clear the terminal
  pwd                       Print working directory
  ls [path]                 List files and folders
  cat <file>                Print file contents
  cd <path>                 Change directory
  echo <text>               Print text

Git (backed by GitHub API):
  git status                Show working tree status
  git init [name]           Open init dialog, or create repo with <name>
  git pull                  Pull latest files from GitHub
  git commit -m "message"   Commit local changes and push to GitHub
  git push -m "message"     Alias for commit + push
  git branch                List branches
  git checkout <branch>     Switch branch
  git checkout -b <name>    Create and switch to a new branch
  git switch <branch>       Switch branch
  git switch -c <name>      Create and switch to a new branch
  git log [-n <count>]      Show recent commits`;

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
    if (
      prefix &&
      !relativePath.startsWith(`${prefix}/`) &&
      relativePath !== prefix
    ) {
      continue;
    }

    const remainder = prefix
      ? relativePath.slice(prefix.length + 1)
      : relativePath;
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
    return normalized === "/"
      ? "(empty project)"
      : `ls: ${targetPath}: No such directory`;
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
  const lines = [
    `On branch ${branch}`,
    `Repository: ${context.project.githubRepoUrl}`,
  ];

  if (context.changedPaths.size === 0) {
    lines.push("", "nothing to commit, working tree clean");
    return lines.join("\n");
  }

  lines.push("", "Changes not staged for commit:");
  for (const path of [...context.changedPaths].sort()) {
    lines.push(`  modified: ${path}`);
  }
  lines.push(
    "",
    'Use `git commit -m "your message"` to commit and push these changes.',
  );

  return lines.join("\n");
}

function requireLinkedRepo(context: ShellContext): string | null {
  if (!context.project.githubRepoUrl || context.project.source !== "github") {
    return "fatal: not a linked GitHub repository. Run `git init` or clone from GitHub first.";
  }
  return null;
}

/** Parse `git commit -m "msg"` / `git commit -m msg` from remaining args. */
function parseCommitMessage(args: string[]): string | null {
  const mIndex = args.findIndex((arg) => arg === "-m" || arg === "-am");
  if (mIndex === -1) {
    return null;
  }

  const rest = args.slice(mIndex + 1);
  if (rest.length === 0) {
    return null;
  }

  const joined = rest.join(" ").trim();
  if (
    (joined.startsWith('"') && joined.endsWith('"')) ||
    (joined.startsWith("'") && joined.endsWith("'"))
  ) {
    return joined.slice(1, -1).trim();
  }

  return joined;
}

function parseLogLimit(args: string[]): number | undefined {
  const nIndex = args.findIndex((arg) => arg === "-n" || arg === "--max-count");
  if (nIndex !== -1) {
    const value = Number(args[nIndex + 1]);
    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
  }

  const short = args.find((arg) => /^-\d+$/.test(arg));
  if (short) {
    return Math.abs(Number(short));
  }

  return undefined;
}

async function runHandler(
  run: (() => Promise<string>) | undefined,
  unavailable: string,
): Promise<ShellResult> {
  if (!run) {
    return { output: unavailable, exitCode: 1 };
  }

  try {
    const output = await run();
    return { output, exitCode: 0 };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "ActionCancelledError" || error.message === "Cancelled")
    ) {
      return { output: "Aborted.", exitCode: 130 };
    }
    return {
      output:
        error instanceof Error
          ? `error: ${error.message}`
          : "error: command failed",
      exitCode: 1,
    };
  }
}

async function handleGitCommand(
  args: string[],
  context: ShellContext,
  handlers: ShellHandlers,
): Promise<ShellResult> {
  const sub = args[0];

  if (!sub || sub === "status") {
    return { output: gitStatus(context), exitCode: 0, cwd: context.cwd };
  }

  if (sub === "init") {
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

    const result = await runHandler(
      handlers.onGitInit
        ? () => handlers.onGitInit!(args[1])
        : undefined,
      "git init is unavailable in this session",
    );
    return { ...result, cwd: context.cwd };
  }

  if (sub === "pull") {
    const linked = requireLinkedRepo(context);
    if (linked) {
      return { output: linked, exitCode: 1, cwd: context.cwd };
    }
    const result = await runHandler(
      handlers.onGitPull,
      "git pull is unavailable in this session",
    );
    return { ...result, cwd: context.cwd };
  }

  if (sub === "commit" || sub === "push") {
    const linked = requireLinkedRepo(context);
    if (linked) {
      return { output: linked, exitCode: 1, cwd: context.cwd };
    }

    const message = parseCommitMessage(args.slice(1));
    if (!message) {
      return {
        output:
          sub === "push"
            ? 'usage: git push -m "commit message"\n(Polaris combines commit + push)'
            : 'usage: git commit -m "commit message"',
        exitCode: 1,
        cwd: context.cwd,
      };
    }

    if (context.changedPaths.size === 0) {
      return {
        output: "nothing to commit, working tree clean",
        exitCode: 0,
        cwd: context.cwd,
      };
    }

    const result = await runHandler(
      handlers.onGitCommitPush
        ? () => handlers.onGitCommitPush!(message)
        : undefined,
      "git commit/push is unavailable in this session",
    );
    return { ...result, cwd: context.cwd };
  }

  if (sub === "branch") {
    const linked = requireLinkedRepo(context);
    if (linked) {
      return { output: linked, exitCode: 1, cwd: context.cwd };
    }
    const result = await runHandler(
      handlers.onGitBranchList,
      "git branch is unavailable in this session",
    );
    return { ...result, cwd: context.cwd };
  }

  if (sub === "checkout" || sub === "switch") {
    const linked = requireLinkedRepo(context);
    if (linked) {
      return { output: linked, exitCode: 1, cwd: context.cwd };
    }

    const createFlag = args.includes("-b") || args.includes("-c");
    const name = args.find(
      (arg, index) =>
        index > 0 && arg !== "-b" && arg !== "-c" && !arg.startsWith("-"),
    );

    if (!name) {
      return {
        output:
          sub === "switch"
            ? "usage: git switch <branch> | git switch -c <name>"
            : "usage: git checkout <branch> | git checkout -b <name>",
        exitCode: 1,
        cwd: context.cwd,
      };
    }

    if (createFlag) {
      const result = await runHandler(
        handlers.onGitCreateBranch
          ? () => handlers.onGitCreateBranch!(name)
          : undefined,
        "git checkout -b is unavailable in this session",
      );
      return { ...result, cwd: context.cwd };
    }

    const result = await runHandler(
      handlers.onGitCheckout
        ? () => handlers.onGitCheckout!(name)
        : undefined,
      "git checkout is unavailable in this session",
    );
    return { ...result, cwd: context.cwd };
  }

  if (sub === "log") {
    const linked = requireLinkedRepo(context);
    if (linked) {
      return { output: linked, exitCode: 1, cwd: context.cwd };
    }
    const limit = parseLogLimit(args.slice(1));
    const result = await runHandler(
      handlers.onGitLog ? () => handlers.onGitLog!(limit) : undefined,
      "git log is unavailable in this session",
    );
    return { ...result, cwd: context.cwd };
  }

  return {
    output: `git: '${sub}' is not supported. Type 'help' for available git commands.`,
    exitCode: 1,
    cwd: context.cwd,
  };
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
        return {
          output: "cat: missing file operand",
          exitCode: 1,
          cwd: context.cwd,
        };
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
      if (
        next !== "/" &&
        !context.files.some((file) => file.path.startsWith(next.slice(1)))
      ) {
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
    case "git":
      return handleGitCommand(args, context, handlers);
    default:
      return {
        output: `${command}: command not found. Type 'help' for available commands.`,
        exitCode: 127,
        cwd: context.cwd,
      };
  }
}
