"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling for the confirm button */
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);
  const settledRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      settledRef.current = false;
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const close = useCallback((value: boolean) => {
    if (settledRef.current) {
      return;
    }
    settledRef.current = true;
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <AlertDialogContent className="border-ws-border bg-ws-panel text-ws-text sm:max-w-md">
          <AlertDialogHeader className="sm:place-items-start sm:text-left">
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap text-ws-text-muted">
              {pending?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-ws-border bg-ws-hover text-ws-text hover:bg-ws-border"
              onClick={(event) => {
                event.preventDefault();
                close(false);
              }}
            >
              {pending?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                pending?.tone === "danger"
                  ? "bg-ws-danger text-white hover:bg-ws-danger-bg-hover"
                  : "bg-ws-accent text-white hover:bg-ws-accent-hover"
              }
              onClick={(event) => {
                event.preventDefault();
                close(true);
              }}
            >
              {pending?.confirmLabel ?? "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return confirm;
}

/** Thrown when the user dismisses a confirm dialog without continuing. */
export class ActionCancelledError extends Error {
  constructor(message = "Cancelled") {
    super(message);
    this.name = "ActionCancelledError";
  }
}

export function isActionCancelled(error: unknown): boolean {
  return (
    error instanceof ActionCancelledError ||
    (error instanceof Error && error.name === "ActionCancelledError")
  );
}
