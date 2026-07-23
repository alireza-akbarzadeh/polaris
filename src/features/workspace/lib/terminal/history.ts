/**
 * Ring buffer of past commands with cursor navigation and prefix suggestions.
 * All operations are O(n) over a capped list — cheap for interactive use.
 */
export class CommandHistory {
  private entries: string[] = [];
  private cursor = -1;

  constructor(private readonly maxSize = 200) {}

  get size() {
    return this.entries.length;
  }

  get all(): readonly string[] {
    return this.entries;
  }

  push(command: string) {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Avoid consecutive duplicates
    if (this.entries[this.entries.length - 1] === trimmed) {
      this.cursor = this.entries.length;
      return;
    }

    this.entries.push(trimmed);
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(-this.maxSize);
    }
    this.cursor = this.entries.length;
  }

  /** Move toward older entries. Returns the selected command. */
  up(): string | null {
    if (this.entries.length === 0) return null;
    this.cursor = Math.max(0, this.cursor - 1);
    return this.entries[this.cursor] ?? null;
  }

  /** Move toward newer entries. Empty string means "back to live input". */
  down(): string | null {
    if (this.entries.length === 0) return null;
    this.cursor = Math.min(this.entries.length, this.cursor + 1);
    if (this.cursor >= this.entries.length) return "";
    return this.entries[this.cursor] ?? "";
  }

  resetCursor() {
    this.cursor = this.entries.length;
  }

  /**
   * Newest-first prefix match for fish-style autosuggestions.
   * Returns the full matching entry, or null.
   */
  suggest(prefix: string): string | null {
    if (!prefix) return null;

    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      if (entry.startsWith(prefix) && entry !== prefix) {
        return entry;
      }
    }
    return null;
  }
}
