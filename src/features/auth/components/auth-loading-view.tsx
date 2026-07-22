export function AuthLoadingView() {
  return (
    <div className="flex h-dvh w-full flex-col bg-[#1e1f22] text-[#bcbec4]">
      {/* Main toolbar — matches WorkspaceToolbar */}
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-[#1e1f22] bg-[#2b2d30] px-2">
        <div className="h-3 w-24 animate-pulse rounded-sm bg-[#3c3f41]" />
        <div className="h-2.5 w-16 animate-pulse rounded-sm bg-[#3c3f41]/70" />
        <div className="ml-auto flex items-center gap-1">
          <div className="size-7 animate-pulse rounded-sm bg-[#3c3f41]/60" />
          <div className="size-7 animate-pulse rounded-sm bg-[#3c3f41]/60" />
          <div className="size-7 animate-pulse rounded-sm bg-[#3c3f41]/60" />
          <div className="ml-1 size-6 animate-pulse rounded-sm bg-[#3c3f41]" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Project tool window */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-[#1e1f22] bg-[#2b2d30] sm:flex">
          <div className="flex h-7 items-center border-b border-[#1e1f22] px-3">
            <div className="h-2.5 w-14 animate-pulse rounded-sm bg-[#3c3f41]" />
          </div>
          <div className="flex flex-col gap-2 p-3">
            <div className="h-2.5 w-[70%] animate-pulse rounded-sm bg-[#3c3f41]/80" />
            <div className="h-2.5 w-[55%] animate-pulse rounded-sm bg-[#3c3f41]/60" />
            <div className="h-2.5 w-[62%] animate-pulse rounded-sm bg-[#3c3f41]/50" />
            <div className="mt-2 h-2.5 w-[48%] animate-pulse rounded-sm bg-[#3c3f41]/40" />
          </div>
        </aside>

        {/* Editor */}
        <main className="flex min-w-0 flex-1 flex-col bg-[#1e1f22]">
          <div className="flex h-7 items-center border-b border-[#2b2d30] bg-[#2b2d30] px-3">
            <div className="h-2.5 w-12 animate-pulse rounded-sm bg-[#3c3f41]" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-[#3c3f41]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#3574f0]" />
            </div>
            <p className="text-[12px] text-[#787878]">Loading workspace…</p>
          </div>
        </main>
      </div>
    </div>
  );
}
