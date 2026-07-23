/** Top-level commands available in the simulated shell. */
export const SHELL_COMMANDS = [
  "help",
  "clear",
  "pwd",
  "ls",
  "cat",
  "cd",
  "echo",
  "git",
] as const;

/** Git subcommands supported by the Polaris shell. */
export const GIT_SUBCOMMANDS = [
  "status",
  "init",
  "pull",
  "commit",
  "push",
  "branch",
  "checkout",
  "switch",
  "log",
] as const;

export type ShellCommand = (typeof SHELL_COMMANDS)[number];
