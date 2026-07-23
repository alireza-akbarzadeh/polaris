"use client";

import {
  ArrowLeftIcon,
  KeyboardIcon,
  Settings2Icon,
} from "lucide-react";
import { Manrope } from "next/font/google";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppUserButton } from "@/features/billing/components/app-user-button";
import { EditorSettingsPanel } from "@/features/settings/components/editor-settings-panel";
import { ShortcutsPanel } from "@/features/settings/components/shortcuts-panel";
import { useEditorSettingsSync } from "@/features/settings/hooks/use-editor-settings-sync";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

function SettingsTabs() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "shortcuts" ? "shortcuts" : "editor";

  return (
    <Tabs defaultValue={defaultTab} key={defaultTab}>
      <TabsList variant="line" className="mb-6 w-full justify-start">
        <TabsTrigger value="editor" className="gap-1.5">
          <Settings2Icon className="size-3.5" />
          Editor
        </TabsTrigger>
        <TabsTrigger value="shortcuts" className="gap-1.5">
          <KeyboardIcon className="size-3.5" />
          Shortcuts
        </TabsTrigger>
      </TabsList>

      <TabsContent value="editor">
        <EditorSettingsPanel />
      </TabsContent>
      <TabsContent value="shortcuts">
        <ShortcutsPanel />
      </TabsContent>
    </Tabs>
  );
}

export function SettingsView() {
  useEditorSettingsSync();
  const { openProjects } = useProjectsDialog();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 12% 18%, color-mix(in oklch, var(--ring) 18%, transparent), transparent 55%), radial-gradient(ellipse 60% 45% at 88% 82%, color-mix(in oklch, var(--accent) 55%, transparent), transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openProjects()}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              aria-label="Back to projects"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <Image
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="size-7"
              priority
            />
            <div className="min-w-0">
              <h1
                className={cn(
                  display.className,
                  "text-lg leading-none font-semibold tracking-tight",
                )}
              >
                Settings
              </h1>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Editor preferences and keyboard shortcuts
              </p>
            </div>
          </div>
          <AppUserButton />
        </header>

        <section className="rounded-lg border border-border/70 bg-card/70 p-5 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-7 dark:bg-card/55">
          <Suspense fallback={null}>
            <SettingsTabs />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
