"use client";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type ITheme } from "@xterm/xterm";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { useInitializeGitRepo } from "@/features/github/hooks/use-initialize-git-repo";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { useProject } from "@/features/projects/hooks/use-projects";
import {
  useChangedFiles,
  useProjectFiles,
} from "@/features/workspace/hooks/use-project-files";
import {
  runShellCommand,
  type ShellContext,
} from "@/features/workspace/lib/workspace-shell";

import "@xterm/xterm/css/xterm.css";

type WorkspaceTerminalProps = {
  projectId: string;
};

const TERMINAL_THEME_DARK: ITheme = {
  background: "#1e1f22",
  foreground: "#bcbec4",
  cursor: "#bcbec4",
  selectionBackground: "#3c3f41",
  black: "#1e1f22",
  red: "#ff6b68",
  green: "#6aab73",
  yellow: "#bbb529",
  blue: "#589df6",
  magenta: "#c77dbb",
  cyan: "#299999",
  white: "#bcbec4",
  brightBlack: "#6f737a",
  brightRed: "#ff6b68",
  brightGreen: "#6aab73",
  brightYellow: "#bbb529",
  brightBlue: "#589df6",
  brightMagenta: "#c77dbb",
  brightCyan: "#299999",
  brightWhite: "#dfdfdf",
};

const TERMINAL_THEME_LIGHT: ITheme = {
  background: "#ffffff",
  foreground: "#2b2d30",
  cursor: "#2b2d30",
  selectionBackground: "#dfe1e5",
  black: "#2b2d30",
  red: "#db3b3b",
  green: "#548a3d",
  yellow: "#9a7b0a",
  blue: "#2470c0",
  magenta: "#9b59b6",
  cyan: "#1a7a7a",
  white: "#5a5d63",
  brightBlack: "#6c707e",
  brightRed: "#db3b3b",
  brightGreen: "#548a3d",
  brightYellow: "#9a7b0a",
  brightBlue: "#2470c0",
  brightMagenta: "#9b59b6",
  brightCyan: "#1a7a7a",
  brightWhite: "#2b2d30",
};

export function WorkspaceTerminal({ projectId }: WorkspaceTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputRef = useRef("");
  const cwdRef = useRef("/");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = !mounted || (resolvedTheme ?? "dark") === "dark";
  const terminalTheme = isDark ? TERMINAL_THEME_DARK : TERMINAL_THEME_LIGHT;

  const project = useProject({ projectId });
  const files = useProjectFiles(projectId);
  const changedFiles = useChangedFiles(projectId);
  const { initialize } = useInitializeGitRepo(projectId);
  const openGitInitDialog = useWorkspaceStore((s) => s.openGitInitDialog);
  const terminalCwdRequest = useWorkspaceStore((s) => s.terminalCwdRequest);
  const clearTerminalCwdRequest = useWorkspaceStore(
    (s) => s.clearTerminalCwdRequest,
  );

  const projectRef = useRef(project);
  const filesRef = useRef(files);
  const changedFilesRef = useRef(changedFiles);

  projectRef.current = project;
  filesRef.current = files;
  changedFilesRef.current = changedFiles;

  const writePrompt = useCallback((term: Terminal) => {
    const projectName = projectRef.current?.name ?? "project";
    term.write(`\r\n\x1b[32m${projectName}\x1b[0m:\x1b[34m${cwdRef.current}\x1b[0m $ `);
  }, []);

  useEffect(() => {
    if (!terminalCwdRequest) {
      return;
    }

    cwdRef.current = terminalCwdRequest;
    const term = terminalRef.current;
    if (term) {
      term.writeln(`\r\nChanged directory to ${terminalCwdRequest}`);
      writePrompt(term);
    }
    clearTerminalCwdRequest();
  }, [clearTerminalCwdRequest, terminalCwdRequest, writePrompt]);

  const getContext = useCallback((): ShellContext | null => {
    const currentProject = projectRef.current;
    const currentFiles = filesRef.current;
    const currentChanged = changedFilesRef.current;

    if (!currentProject || currentFiles === undefined) {
      return null;
    }

    return {
      project: currentProject,
      files: currentFiles,
      changedPaths: new Set(currentChanged?.map((file) => file.path) ?? []),
      cwd: cwdRef.current,
    };
  }, []);

  const executeCommand = useCallback(
    async (term: Terminal, command: string) => {
      const context = getContext();
      if (!context) {
        term.writeln("\r\nProject is still loading…");
        writePrompt(term);
        return;
      }

      if (command.trim()) {
        historyRef.current = [...historyRef.current, command].slice(-100);
        historyIndexRef.current = historyRef.current.length;
      }

      const result = await runShellCommand(command, context, {
        onOpenGitInitDialog: openGitInitDialog,
        onGitInit: async (repoName) => {
          term.writeln("\r\nInitializing GitHub repository…");
          const initResult = await initialize({ repoName });
          return [
            `Initialized empty Git repository in ${initResult.repoUrl}`,
            `Pushed ${initResult.filesPushed} file${initResult.filesPushed === 1 ? "" : "s"} (${initResult.commitSha.slice(0, 7)})`,
          ].join("\r\n");
        },
      });

      if (result.cwd) {
        cwdRef.current = result.cwd;
      }

      if (result.output === "__CLEAR__") {
        term.clear();
      } else if (result.output) {
        term.writeln(`\r\n${result.output.replace(/\n/g, "\r\n")}`);
      }

      writePrompt(term);
    },
    [getContext, initialize, openGitInitDialog, writePrompt],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || terminalRef.current) {
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "Consolas, 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.2,
      theme: TERMINAL_THEME_DARK,
      scrollback: 2000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln("Polaris workspace terminal");
    term.writeln("Type 'help' for available commands.");
    writePrompt(term);

    term.onData((data) => {
      const printable = !data.match(/[\x00-\x1f\x7f]/);

      if (data === "\r") {
        const command = inputRef.current;
        inputRef.current = "";
        void executeCommand(term, command);
        return;
      }

      if (data === "\x7f") {
        if (inputRef.current.length > 0) {
          inputRef.current = inputRef.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }

      if (data === "\x03") {
        inputRef.current = "";
        term.writeln("^C");
        writePrompt(term);
        return;
      }

      if (data === "\x1b[A") {
        if (historyRef.current.length === 0) {
          return;
        }
        historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
        const entry = historyRef.current[historyIndexRef.current] ?? "";
        term.write("\r\x1b[K");
        writePrompt(term);
        inputRef.current = entry;
        term.write(entry);
        return;
      }

      if (data === "\x1b[B") {
        if (historyRef.current.length === 0) {
          return;
        }
        historyIndexRef.current = Math.min(
          historyRef.current.length,
          historyIndexRef.current + 1,
        );
        const entry =
          historyIndexRef.current >= historyRef.current.length
            ? ""
            : historyRef.current[historyIndexRef.current];
        term.write("\r\x1b[K");
        writePrompt(term);
        inputRef.current = entry;
        term.write(entry);
        return;
      }

      if (printable) {
        inputRef.current += data;
        term.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [executeCommand, writePrompt]);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term) {
      return;
    }
    term.options.theme = terminalTheme;
  }, [terminalTheme]);

  return (
    <div className="flex h-full flex-col border-t border-ws-border-subtle bg-ws-bg">
      <div className="flex h-7 shrink-0 items-center border-b border-ws-border-subtle px-3">
        <p className="text-[11px] font-semibold tracking-wide text-ws-text">
          Terminal
        </p>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 p-1" />
    </div>
  );
}
