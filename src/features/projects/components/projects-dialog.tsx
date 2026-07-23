"use client";

import { Manrope } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useConvexAuth } from "convex/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectsDashboard } from "@/features/projects/components/projects-dashboard";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

type ProjectsDialogContextValue = {
  open: boolean;
  openProjects: () => void;
  closeProjects: () => void;
};

const ProjectsDialogContext =
  createContext<ProjectsDialogContextValue | null>(null);

export function useProjectsDialog() {
  const context = useContext(ProjectsDialogContext);
  if (!context) {
    throw new Error(
      "useProjectsDialog must be used within ProjectsDialogProvider",
    );
  }
  return context;
}

export function ProjectsDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Clerk signed-in ≠ Convex authenticated. Only open after Convex has a valid JWT.
  const { isAuthenticated } = useConvexAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/projects" && isAuthenticated) {
      setOpen(true);
      return;
    }
    if (pathname.startsWith("/projects/") || !isAuthenticated) {
      setOpen(false);
    }
  }, [pathname, isAuthenticated]);

  const openProjects = useCallback(() => {
    if (!isAuthenticated) return;
    setOpen(true);
  }, [isAuthenticated]);

  const closeProjects = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next && pathname === "/projects") {
        router.replace("/");
      }
    },
    [pathname, router],
  );

  const value = useMemo(
    () => ({ open, openProjects, closeProjects }),
    [open, openProjects, closeProjects],
  );

  return (
    <ProjectsDialogContext.Provider value={value}>
      {children}
      <ProjectsDialog open={open} onOpenChange={handleOpenChange} />
    </ProjectsDialogContext.Provider>
  );
}

function ProjectsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(92vh,900px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl",
          "border-border/70 bg-background shadow-[0_32px_120px_-24px_rgba(0,0,0,0.65)]",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 12% 0%, color-mix(in oklch, var(--ring) 18%, transparent), transparent 55%), radial-gradient(ellipse 60% 45% at 88% 100%, color-mix(in oklch, var(--accent) 45%, transparent), transparent 50%)",
          }}
        />

        <DialogHeader className="relative z-10 shrink-0 border-b border-border/60 px-6 py-5 text-left sm:px-8">
          <DialogTitle
            className={cn(
              display.className,
              "text-xl font-semibold tracking-tight sm:text-2xl",
            )}
          >
            Your projects
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create, clone, or open a workspace without leaving this page.
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          {open ? <ProjectsDashboard compact /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
