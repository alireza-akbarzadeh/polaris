import type { Terminal } from "@xterm/xterm";

import { completeLine, suggestLine, type CompleteContext } from "./complete";
import type { CommandHistory } from "./history";

const DIM = "\x1b[90m";
const RESET = "\x1b[0m";
const CLEAR_LINE = "\r\x1b[K";

export type PromptWriter = (term: Terminal, newline?: boolean) => void;

/**
 * Owns the current input line, ghost suggestion, and key handling.
 * Hot-path state stays off React so typing stays cheap.
 */
export class TerminalLineEditor {
  private buffer = "";
  private ghost = "";
  private suggestion: string | null = null;
  private busy = false;

  constructor(
    private readonly term: Terminal,
    private readonly history: CommandHistory,
    private readonly writePrompt: PromptWriter,
    private readonly getCompleteContext: () => CompleteContext,
    private readonly onSubmit: (command: string) => void | Promise<void>,
  ) {}

  get value() {
    return this.buffer;
  }

  setBusy(busy: boolean) {
    this.busy = busy;
  }

  handleData(data: string) {
    if (this.busy) return;

    if (data === "\r") {
      void this.submit();
      return;
    }

    if (data === "\x7f") {
      if (this.buffer.length === 0) return;
      this.buffer = this.buffer.slice(0, -1);
      this.history.resetCursor();
      this.refreshSuggestion();
      this.redraw();
      return;
    }

    if (data === "\x03") {
      this.term.write("^C");
      this.buffer = "";
      this.clearSuggestion();
      this.history.resetCursor();
      this.writePrompt(this.term, true);
      return;
    }

    if (data === "\x0c") {
      this.term.clear();
      this.writePrompt(this.term, false);
      this.redraw();
      return;
    }

    if (data === "\x15") {
      this.buffer = "";
      this.history.resetCursor();
      this.refreshSuggestion();
      this.redraw();
      return;
    }

    if (data === "\x17") {
      this.buffer = this.buffer.replace(/\s*\S+$/, "");
      this.history.resetCursor();
      this.refreshSuggestion();
      this.redraw();
      return;
    }

    if (data === "\t") {
      this.acceptOrComplete();
      return;
    }

    // Right arrow accepts ghost text
    if (data === "\x1b[C" && this.suggestion) {
      this.buffer = this.suggestion;
      this.clearSuggestion();
      this.redraw();
      return;
    }

    if (data === "\x1b[A") {
      const entry = this.history.up();
      if (entry === null) return;
      this.buffer = entry;
      this.clearSuggestion();
      this.redraw();
      return;
    }

    if (data === "\x1b[B") {
      const entry = this.history.down();
      if (entry === null) return;
      this.buffer = entry;
      this.clearSuggestion();
      this.redraw();
      return;
    }

    if (!/[\x00-\x1f\x7f]/.test(data)) {
      this.buffer += data;
      this.history.resetCursor();
      this.refreshSuggestion();
      this.redraw();
    }
  }

  private async submit() {
    const command = this.buffer;
    this.buffer = "";
    this.clearSuggestion();
    this.busy = true;

    // Drop ghost text and keep the typed command on its own line.
    this.term.write(CLEAR_LINE);
    this.writePrompt(this.term, false);
    this.term.write(`${command}\r\n`);

    try {
      await this.onSubmit(command);
    } finally {
      this.busy = false;
    }
  }

  private acceptOrComplete() {
    if (this.suggestion) {
      this.buffer = this.suggestion;
      this.clearSuggestion();
      this.redraw();
      return;
    }

    const next = completeLine(this.buffer, this.getCompleteContext());
    if (!next) return;
    this.buffer = next;
    this.refreshSuggestion();
    this.redraw();
  }

  private refreshSuggestion() {
    const result = suggestLine(this.buffer, this.getCompleteContext());
    this.suggestion = result?.line ?? null;
    this.ghost = result?.ghost ?? "";
  }

  private clearSuggestion() {
    this.suggestion = null;
    this.ghost = "";
  }

  private redraw() {
    this.term.write(CLEAR_LINE);
    this.writePrompt(this.term, false);
    this.term.write(this.buffer);
    if (this.ghost) {
      this.term.write(`${DIM}${this.ghost}${RESET}`);
      this.term.write("\b".repeat(this.ghost.length));
    }
  }
}
