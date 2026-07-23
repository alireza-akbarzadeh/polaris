"use client";

import {
  ArrowLeftIcon,
  KeyboardIcon,
  RotateCcwIcon,
  Settings2Icon,
} from "lucide-react";
import { Manrope } from "next/font/google";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppUserButton } from "@/features/billing/components/app-user-button";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";
import { useEditorSettingsSync } from "@/features/settings/hooks/use-editor-settings-sync";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  TAB_SIZE_OPTIONS,
} from "@/features/settings/lib/editor-settings";
import { SHORTCUT_GROUPS } from "@/features/settings/lib/shortcuts";
import { useEditorSettingsStore } from "@/features/settings/store/editor-settings-store";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end">{children}</div>
    </div>
  );
}

function ShortcutKeys({ keys }: { keys: string }) {
  const parts = keys.split(" ").filter(Boolean);
  return (
    <KbdGroup>
      {parts.map((part) => (
        <Kbd key={`${keys}-${part}`}>{part}</Kbd>
      ))}
    </KbdGroup>
  );
}

function EditorSettingsPanel() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = !mounted || (resolvedTheme ?? "dark") === "dark";

  const fontSize = useEditorSettingsStore((s) => s.fontSize);
  const tabSize = useEditorSettingsStore((s) => s.tabSize);
  const wordWrap = useEditorSettingsStore((s) => s.wordWrap);
  const lineNumbers = useEditorSettingsStore((s) => s.lineNumbers);
  const highlightActiveLine = useEditorSettingsStore((s) => s.highlightActiveLine);
  const bracketMatching = useEditorSettingsStore((s) => s.bracketMatching);
  const lineHeight = useEditorSettingsStore((s) => s.lineHeight);
  const setSettings = useEditorSettingsStore((s) => s.setSettings);
  const resetSettings = useEditorSettingsStore((s) => s.resetSettings);

  return (
    <div className="space-y-1">
      <SettingRow
        label="Appearance"
        description="App and editor color theme"
      >
        <Select
          value={isDark ? "dark" : "light"}
          onValueChange={(value) => {
            if (value) setTheme(value);
          }}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <Separator />

      <SettingRow
        label="Font size"
        description={`${fontSize}px — applies to the code editor`}
      >
        <div className="flex w-[200px] items-center gap-3">
          <Slider
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={[fontSize]}
            onValueChange={([value]) => setSettings({ fontSize: value })}
            aria-label="Font size"
          />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {fontSize}
          </span>
        </div>
      </SettingRow>

      <Separator />

      <SettingRow
        label="Line height"
        description={`${lineHeight.toFixed(1)} — spacing between editor lines`}
      >
        <div className="flex w-[200px] items-center gap-3">
          <Slider
            min={LINE_HEIGHT_MIN}
            max={LINE_HEIGHT_MAX}
            step={0.1}
            value={[lineHeight]}
            onValueChange={([value]) => setSettings({ lineHeight: value })}
            aria-label="Line height"
          />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {lineHeight.toFixed(1)}
          </span>
        </div>
      </SettingRow>

      <Separator />

      <SettingRow
        label="Tab size"
        description="Spaces inserted when pressing Tab"
      >
        <Select
          value={String(tabSize)}
          onValueChange={(value) => {
            if (value) setSettings({ tabSize: Number(value) });
          }}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAB_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} spaces
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <Separator />

      <SettingRow
        label="Word wrap"
        description="Wrap long lines instead of horizontal scrolling"
      >
        <Switch
          checked={wordWrap}
          onCheckedChange={(checked) => setSettings({ wordWrap: checked })}
          aria-label="Word wrap"
        />
      </SettingRow>

      <Separator />

      <SettingRow
        label="Line numbers"
        description="Show gutter line numbers"
      >
        <Switch
          checked={lineNumbers}
          onCheckedChange={(checked) => setSettings({ lineNumbers: checked })}
          aria-label="Line numbers"
        />
      </SettingRow>

      <Separator />

      <SettingRow
        label="Highlight active line"
        description="Emphasize the line under the cursor"
      >
        <Switch
          checked={highlightActiveLine}
          onCheckedChange={(checked) =>
            setSettings({ highlightActiveLine: checked })
          }
          aria-label="Highlight active line"
        />
      </SettingRow>

      <Separator />

      <SettingRow
        label="Bracket matching"
        description="Highlight matching brackets near the cursor"
      >
        <Switch
          checked={bracketMatching}
          onCheckedChange={(checked) =>
            setSettings({ bracketMatching: checked })
          }
          aria-label="Bracket matching"
        />
      </SettingRow>

      <div className="flex justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetSettings}
          className="gap-1.5"
        >
          <RotateCcwIcon className="size-3.5" />
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}

function ShortcutsPanel() {
  return (
    <div className="space-y-8">
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.id}>
          <h3
            className={cn(
              display.className,
              "mb-3 text-sm font-semibold tracking-tight text-foreground",
            )}
          >
            {group.title}
          </h3>
          <ul className="divide-y divide-border/60 rounded-md border border-border/70">
            {group.shortcuts.map((shortcut) => (
              <li
                key={shortcut.id}
                className="flex items-center justify-between gap-4 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{shortcut.label}</p>
                  {shortcut.description ? (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {shortcut.description}
                    </p>
                  ) : null}
                </div>
                <ShortcutKeys keys={shortcut.keys} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

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
