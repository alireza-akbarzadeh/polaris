import { Spinner } from "@/components/ui/spinner";

export function AuthLoadingView() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1e1e1e] font-mono text-[#cccccc]">
      <header className="flex h-9 shrink-0 items-center justify-center border-b border-[#2b2b2b] bg-[#323233] text-xs text-[#cccccc]/80">
        Polaris — Code Editor
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Spinner className="size-5 text-[#007acc]" />
        <p className="text-sm text-[#858585]">Initializing workspace…</p>
      </div>
      <footer className="flex h-[22px] shrink-0 items-center bg-[#007acc] px-3 text-[12px] text-white">
        Loading authentication
      </footer>
    </div>
  );
}
