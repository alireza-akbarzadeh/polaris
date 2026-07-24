"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PromptOptions = {
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputLabel?: string;
};

type PromptFn = (options: PromptOptions) => Promise<string | null>;

const PromptContext = createContext<PromptFn | null>(null);

type PendingPrompt = PromptOptions & {
  resolve: (value: string | null) => void;
};

export function PromptDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [value, setValue] = useState("");
  const pendingRef = useRef<PendingPrompt | null>(null);
  const settledRef = useRef(false);
  const valueRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  valueRef.current = value;

  const prompt = useCallback<PromptFn>((options) => {
    return new Promise<string | null>((resolve) => {
      settledRef.current = false;
      const next = { ...options, resolve };
      pendingRef.current = next;
      const initial = options.defaultValue ?? "";
      valueRef.current = initial;
      setValue(initial);
      setPending(next);
    });
  }, []);

  const close = useCallback((result: string | null) => {
    if (settledRef.current) {
      return;
    }
    settledRef.current = true;
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(result);
  }, []);

  const confirm = useCallback(() => {
    const next = (inputRef.current?.value ?? valueRef.current).trimEnd();
    close(next);
  }, [close]);

  const cancel = useCallback(() => {
    close(null);
  }, [close]);

  useEffect(() => {
    if (!pending) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pending]);

  const valueFn = useMemo(() => prompt, [prompt]);

  return (
    <PromptContext.Provider value={valueFn}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) cancel();
        }}
      >
        <AlertDialogContent className="border-ws-border bg-ws-panel text-ws-text sm:max-w-md">
          <AlertDialogHeader className="sm:place-items-start sm:text-left">
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            {pending?.description ? (
              <AlertDialogDescription className="whitespace-pre-wrap text-ws-text-muted">
                {pending.description}
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription className="sr-only">
                Enter a value to continue.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              confirm();
            }}
          >
            <div className="grid gap-2">
              <label htmlFor={inputId} className="sr-only">
                {pending?.inputLabel ?? "Value"}
              </label>
              <Input
                ref={inputRef}
                id={inputId}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={pending?.placeholder}
                autoComplete="off"
                spellCheck={false}
                className="border-ws-border bg-ws-hover text-ws-text placeholder:text-ws-text-muted"
              />
            </div>

            <AlertDialogFooter>
              {/* Use plain Buttons — AlertDialogAction/Cancel auto-dismiss can
                  race onOpenChange(false) and resolve the prompt as cancelled. */}
              <Button
                type="button"
                variant="outline"
                className="border-ws-border bg-ws-hover text-ws-text hover:bg-ws-border"
                onClick={cancel}
              >
                {pending?.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="submit"
                className="bg-ws-accent text-white hover:bg-ws-accent-hover"
              >
                {pending?.confirmLabel ?? "Continue"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const prompt = useContext(PromptContext);
  if (!prompt) {
    throw new Error("usePrompt must be used within PromptDialogProvider");
  }
  return prompt;
}
