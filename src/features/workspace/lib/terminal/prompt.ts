import type { Terminal } from "@xterm/xterm";

type PromptOptions = {
  projectName: string;
  cwd: string;
  /** Active git branch, when known. */
  branch?: string | null;
  /** True when the working tree has local changes. */
  dirty?: boolean;
  isDark: boolean;
  /** When true, start on a new line (after output). Default false for redraws. */
  newline?: boolean;
};

const RESET = "\x1b[0m";
const DIM = "\x1b[90m";

function directoryLabel(projectName: string, cwd: string) {
  if (cwd === "/" || cwd === "") return projectName;
  const segments = cwd.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? projectName;
}

/**
 * Starship-style prompt using ASCII-safe markers so cell widths stay even.
 * Example: `at polaris on main *`
 */
export function writeShellPrompt(term: Terminal, options: PromptOptions) {
  const {
    projectName,
    cwd,
    branch,
    dirty = false,
    isDark,
    newline = false,
  } = options;

  const dirColor = isDark ? "\x1b[94m" : "\x1b[34m";
  const branchColor = isDark ? "\x1b[36m" : "\x1b[36m";
  const dirtyColor = isDark ? "\x1b[33m" : "\x1b[33m";

  const label = directoryLabel(projectName, cwd);
  const lead = newline ? "\r\n" : "";

  let prompt = `${lead}${DIM}at${RESET} ${dirColor}${label}${RESET}`;

  if (branch) {
    prompt += ` ${DIM}on${RESET} ${branchColor}${branch}${RESET}`;
    if (dirty) {
      prompt += ` ${dirtyColor}*${RESET}`;
    }
  }

  term.write(`${prompt} `);
}
