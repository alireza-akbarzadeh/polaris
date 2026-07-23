"use client";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useTheme } from "next-themes";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { useTerminalShell } from "@/features/workspace/hooks/use-terminal-shell";
import type { CompleteContext } from "@/features/workspace/lib/terminal/complete";
import { CommandHistory } from "@/features/workspace/lib/terminal/history";
import { TerminalLineEditor } from "@/features/workspace/lib/terminal/line-editor";
import { writeShellPrompt } from "@/features/workspace/lib/terminal/prompt";
import {
  TERMINAL_THEME_DARK,
  TERMINAL_THEME_LIGHT,
} from "@/features/workspace/lib/terminal/themes";
import { runShellCommand } from "@/features/workspace/lib/workspace-shell";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

import "@xterm/xterm/css/xterm.css";

type WorkspaceTerminalProps = {
  projectId: string;
};

export function WorkspaceTerminal({ projectId }: WorkspaceTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const cwdRef = useRef("/");
  const historyRef = useRef(new CommandHistory());
  const editorRef = useRef<TerminalLineEditor | null>(null);

  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false,
  );
  const isDark = !mounted || (resolvedTheme ?? "dark") === "dark";
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const { projectName, getContext, createHandlers, filesRef } =
    useTerminalShell(projectId);
  const projectNameRef = useRef(projectName);
  projectNameRef.current = projectName;

  const terminalCwdRequest = useWorkspaceStore((s) => s.terminalCwdRequest);
  const clearTerminalCwdRequest = useWorkspaceStore(
    (s) => s.clearTerminalCwdRequest,
  );

  // Stable refs so the xterm session is created once
  const getContextRef = useRef(getContext);
  const createHandlersRef = useRef(createHandlers);
  getContextRef.current = getContext;
  createHandlersRef.current = createHandlers;

  useEffect(() => {
    if (!terminalCwdRequest) return;

    cwdRef.current = terminalCwdRequest;
    const term = terminalRef.current;
    if (term) {
      term.writeln(`\r\nChanged directory to ${terminalCwdRequest}`);
      writeShellPrompt(term, {
        projectName: projectNameRef.current,
        cwd: cwdRef.current,
        isDark: isDarkRef.current,
        newline: true,
      });
    }
    clearTerminalCwdRequest();
  }, [clearTerminalCwdRequest, terminalCwdRequest]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "Dank Mono, Consolas, 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.35,
      theme: isDarkRef.current ? TERMINAL_THEME_DARK : TERMINAL_THEME_LIGHT,
      scrollback: 2000,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();
    terminalRef.current = term;

    const writePrompt = (t: Terminal, newline = false) => {
      writeShellPrompt(t, {
        projectName: projectNameRef.current,
        cwd: cwdRef.current,
        isDark: isDarkRef.current,
        newline,
      });
    };

    const getCompleteContext = (): CompleteContext => ({
      cwd: cwdRef.current,
      files: filesRef.current ?? [],
      history: historyRef.current,
    });

    const execute = async (command: string) => {
      const context = getContextRef.current(cwdRef.current);
      if (!context) {
        term.writeln("\r\nProject is still loading…");
        writePrompt(term, true);
        return;
      }

      if (command.trim()) {
        historyRef.current.push(command);
      }

      const handlers = createHandlersRef.current((line) => {
        term.writeln(`\r\n${line}`);
      });

      const result = await runShellCommand(command, context, handlers);

      if (result.cwd) {
        cwdRef.current = result.cwd;
      }

      if (result.output === "__CLEAR__") {
        term.clear();
        writePrompt(term, false);
        return;
      }

      if (result.output) {
        term.writeln(`\r\n${result.output.replace(/\n/g, "\r\n")}`);
      }

      writePrompt(term, true);
    };

    const editor = new TerminalLineEditor(
      term,
      historyRef.current,
      writePrompt,
      getCompleteContext,
      execute,
    );
    editorRef.current = editor;

    term.writeln("Polaris workspace terminal (simulated shell)");
    term.writeln(
      "Type 'help' for commands. Tab completes · → accepts suggestion · ↑↓ history",
    );
    writePrompt(term, true);

    const dataDisposable = term.onData((data) => editor.handleData(data));
    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(container);

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      editorRef.current = null;
    };
    // Mount once — live data is read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.options.theme = isDark ? TERMINAL_THEME_DARK : TERMINAL_THEME_LIGHT;
  }, [isDark]);

  return (
    <div className="flex h-full flex-col border-t border-ws-border-subtle bg-ws-panel">
      <div className="flex h-7 shrink-0 items-center border-b border-ws-border-subtle bg-ws-panel px-3">
        <p className="text-[11px] font-semibold tracking-wide text-ws-text">
          Terminal
        </p>
        <p className="ml-2 text-[10px] text-ws-text-muted">
          Tab · → suggest · ↑↓ history
        </p>
      </div>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-hidden bg-ws-panel p-2 [&_.xterm]:h-full [&_.xterm-viewport]:!bg-transparent [&_.xterm-screen]:h-full"
      />
    </div>
  );
}
