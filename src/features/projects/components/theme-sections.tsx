
import {
  MoonIcon,
  SunIcon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ThemeSection() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted ? (resolvedTheme ?? "dark") : "dark";

  return (
    <div className="mt-6 flex flex-col gap-0.5">
      <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Appearance
      </p>
      <div className="mx-3 grid grid-cols-2 gap-1.5 rounded-sm border border-border/60 bg-background/30 p-1">
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-[12px] font-medium transition-colors",
            active === "dark"
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MoonIcon className="size-3.5" />
          Dark
        </button>
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-[12px] font-medium transition-colors",
            active === "light"
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <SunIcon className="size-3.5" />
          Light
        </button>
      </div>
    </div>
  );
}
