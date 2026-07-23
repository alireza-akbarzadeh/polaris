"use client";

import { Manrope } from "next/font/google";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SHORTCUT_GROUPS } from "@/features/settings/lib/shortcuts";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

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

export function ShortcutsPanel() {
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
