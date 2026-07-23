import type { Terminal } from "@xterm/xterm";

type PromptOptions = {
  projectName: string;
  cwd: string;
  isDark: boolean;
  /** When true, start on a new line (after output). Default false for redraws. */
  newline?: boolean;
};

export function writeShellPrompt(term: Terminal, options: PromptOptions) {
  const { projectName, cwd, isDark, newline = false } = options;
  const nameColor = isDark ? "\x1b[32m" : "\x1b[92m";
  const pathColor = isDark ? "\x1b[34m" : "\x1b[94m";
  const lead = newline ? "\r\n" : "";
  term.write(
    `${lead}${nameColor}${projectName}\x1b[0m:${pathColor}${cwd}\x1b[0m $ `,
  );
}
