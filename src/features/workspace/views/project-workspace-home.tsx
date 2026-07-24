"use client";

import {
  KeyboardIcon,
  RadioIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { Manrope } from "next/font/google";
import Image from "next/image";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useProject } from "@/features/projects/hooks/use-projects";
import { runCommand } from "@/features/workspace/commands/registry";
import { useEditorTabs } from "@/features/workspace/hooks/use-editor-tabs";
import { useWorkspaceBreadcrumb } from "@/features/workspace/hooks/use-workspace-breadcrumb";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const WELCOME_BREADCRUMB = [{ label: "Welcome" }] as const;

type ProjectWorkspaceHomeProps = {
  projectId: string;
};

type Feature = {
  icon: typeof UsersIcon;
  title: string;
  description: string;
  accent: string;
};

const FEATURES: Feature[] = [
  {
    icon: RadioIcon,
    title: "Real-time collaboration",
    description:
      "Edit together live. See teammates’ cursors and names as they type—no refresh, no merge conflicts mid-session.",
    accent: "text-ws-accent bg-ws-accent/10",
  },
  {
    icon: UsersIcon,
    title: "Share with roles",
    description:
      "Invite collaborators as editors or viewers. Copy a secure invite link from Settings → Sharing.",
    accent: "text-ws-success bg-ws-success/10",
  },
  {
    icon: SparklesIcon,
    title: "Polaris AI",
    description:
      "Ask for refactors, explanations, and plans beside your code. Toggle the panel anytime with ⌘ L.",
    accent: "text-ws-purple bg-ws-purple/10",
  },
];

type ShortcutAction = {
  id: string;
  label: string;
  keys?: string;
  hint: string;
  onRun: () => void;
};

function ShortcutKeys({ keys }: { keys: string }) {
  const parts = keys.split(" ").filter(Boolean);
  return (
    <KbdGroup>
      {parts.map((part) => (
        <Kbd
          key={`${keys}-${part}`}
          className="bg-ws-hover text-ws-text-secondary border border-ws-border-subtle"
        >
          {part}
        </Kbd>
      ))}
    </KbdGroup>
  );
}

/** Default content for `/projects/[projectId]` and the Welcome editor tab. */
export function ProjectWorkspaceHome({ projectId }: ProjectWorkspaceHomeProps) {
  const project = useProject({ projectId });
  const { openTab } = useEditorTabs(projectId);

  useWorkspaceBreadcrumb([...WELCOME_BREADCRUMB]);

  const shortcuts: ShortcutAction[] = [
    {
      id: "settings",
      label: "Settings",
      keys: "⌘ ,",
      hint: "Command palette — prefs, panels, and more",
      onRun: () => runCommand("openSettings"),
    },
    {
      id: "goto",
      label: "Go to file",
      keys: "⌘ P",
      hint: "Jump anywhere in the project",
      onRun: () => runCommand("openGoToFile"),
    },
    {
      id: "sidebar",
      label: "Toggle sidebar",
      keys: "⌘ B",
      hint: "Show or hide the file tree",
      onRun: () => runCommand("toggleSidebar"),
    },
    {
      id: "terminal",
      label: "Toggle terminal",
      keys: "⌘ J",
      hint: "Open the bottom panel",
      onRun: () => runCommand("toggleTerminal"),
    },
    {
      id: "ai",
      label: "AI panel",
      keys: "⌘ L",
      hint: "Chat with Polaris AI",
      onRun: () => runCommand("toggleAiPanel"),
    },
    {
      id: "shortcuts",
      label: "Keyboard shortcuts",
      hint: "Browse the full keymap",
      onRun: () => openTab({ kind: "shortcuts" }),
    },
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10 md:px-8">
        <header className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-ws-border-subtle bg-ws-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <Image
              src="/logo.svg"
              alt=""
              width={26}
              height={26}
              className="size-6"
            />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ws-text-muted">
              Welcome
            </p>
            <h1
              className={cn(
                display.className,
                "mt-1 truncate text-xl font-semibold tracking-tight text-ws-text",
              )}
            >
              {project?.name ?? "Your workspace"}
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ws-text-muted">
              A collaborative browser IDE—open a file from the tree, invite your
              team, and edit together in real time.
            </p>
          </div>
        </header>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2
              className={cn(
                display.className,
                "text-sm font-semibold tracking-tight text-ws-text",
              )}
            >
              Why Polaris
            </h2>
            <button
              type="button"
              onClick={() => openTab({ kind: "settings" })}
              className="text-[12px] font-medium text-ws-link hover:underline"
            >
              Invite collaborators →
            </button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li
                  key={feature.title}
                  className="rounded-lg border border-ws-border-subtle bg-ws-panel/60 p-4 transition-colors hover:border-ws-border hover:bg-ws-panel"
                >
                  <span
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-md",
                      feature.accent,
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <h3
                    className={cn(
                      display.className,
                      "mt-3 text-[13px] font-semibold tracking-tight text-ws-text",
                    )}
                  >
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ws-text-muted">
                    {feature.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2
            className={cn(
              display.className,
              "mb-3 text-sm font-semibold tracking-tight text-ws-text",
            )}
          >
            Shortcuts
          </h2>
          <ul className="divide-y divide-ws-border-subtle overflow-hidden rounded-lg border border-ws-border-subtle">
            {shortcuts.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.onRun}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-ws-hover/70"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ws-text">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ws-text-muted">
                      {item.hint}
                    </span>
                  </span>
                  {item.keys ? <ShortcutKeys keys={item.keys} /> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap gap-2 pb-4">
          <QuickAction
            icon={Settings2Icon}
            label="Open settings"
            onClick={() => openTab({ kind: "settings" })}
          />
          <QuickAction
            icon={UsersIcon}
            label="Share project"
            onClick={() => openTab({ kind: "settings" })}
          />
          <QuickAction
            icon={SearchIcon}
            label="Go to file"
            onClick={() => runCommand("openGoToFile")}
          />
          <QuickAction
            icon={KeyboardIcon}
            label="Keymap"
            onClick={() => openTab({ kind: "shortcuts" })}
          />
        </section>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Settings2Icon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-ws-border-subtle bg-ws-panel px-3 py-1.5 text-[12px] font-medium text-ws-text-secondary transition-colors hover:border-ws-border hover:bg-ws-hover hover:text-ws-text"
    >
      <Icon className="size-3.5 opacity-70" aria-hidden />
      {label}
    </button>
  );
}
