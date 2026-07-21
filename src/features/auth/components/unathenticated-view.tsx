"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { FolderTreeIcon } from "lucide-react";

const FILE_TREE = [
  { name: "polaris", depth: 0, folder: true, open: true },
  { name: "src", depth: 1, folder: true, open: true },
  { name: "app", depth: 2, folder: true, open: true },
  { name: "page.tsx", depth: 3, folder: false, active: false },
  { name: "layout.tsx", depth: 3, folder: false, active: false },
  { name: "welcome.ts", depth: 2, folder: false, active: true },
  { name: "package.json", depth: 1, folder: false, active: false },
  { name: "README.md", depth: 0, folder: false, active: false },
] as const;

function WindowControls() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span className="size-3 rounded-full bg-[#ff5f57]" />
      <span className="size-3 rounded-full bg-[#febc2e]" />
      <span className="size-3 rounded-full bg-[#28c840]" />
    </div>
  );
}

function CodeLine({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-5.5 leading-5.5">
      <span className="w-12 shrink-0 pr-4 text-right text-[#858585] select-none">
        {n}
      </span>
      <span className="flex-1 whitespace-pre">{children}</span>
    </div>
  );
}

export function UnauthenticatedView() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1e1e1e] font-mono text-[13px] text-[#cccccc]">
      {/* Title bar */}
      <header className="relative flex h-9 shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#323233] px-3">
        <WindowControls />
        <span className="absolute left-1/2 -translate-x-1/2 text-xs text-[#cccccc]/80">
          Polaris — Code Editor
        </span>
        <div className="w-14" aria-hidden />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar — explorer only */}
        <aside
          aria-label="Activity bar"
          className="flex w-12 shrink-0 flex-col items-center border-r border-[#2b2b2b] bg-[#333333] py-2"
        >
          <div
            aria-label="Explorer"
            className="relative flex size-10 items-center justify-center text-white before:absolute before:left-0 before:h-6 before:w-0.5 before:rounded-r before:bg-white"
          >
            <FolderTreeIcon className="size-5.5 stroke-[1.5]" />
          </div>
        </aside>

        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-[#2b2b2b] bg-[#252526] sm:flex md:w-60">
          <div className="flex h-9 items-center px-4 text-[11px] font-semibold tracking-wider text-[#bbbbbb] uppercase">
            Explorer
          </div>
          <div className="flex-1 overflow-hidden px-1 py-1">
            {FILE_TREE.map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-1.5 rounded-sm py-0.5 pr-2 text-[13px] ${
                  "active" in item && item.active
                    ? "bg-[#37373d] text-white"
                    : "text-[#cccccc]"
                }`}
                style={{ paddingLeft: `${8 + item.depth * 12}px` }}
              >
                <span className="text-[#858585]">
                  {item.folder ? (item.open ? "▾" : "▸") : " "}
                </span>
                <span
                  className={
                    item.folder
                      ? "text-[#cccccc]"
                      : item.name.endsWith(".tsx") || item.name.endsWith(".ts")
                        ? "text-[#519aba]"
                        : item.name.endsWith(".json")
                          ? "text-[#cbcb41]"
                          : "text-[#cccccc]"
                  }
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* Editor + panel */}
        <main className="flex min-w-0 flex-1 flex-col bg-[#1e1e1e]">
          {/* Tabs */}
          <div className="flex h-9 shrink-0 items-end border-b border-[#2b2b2b] bg-[#252526]">
            <div className="flex h-9 items-center gap-2 border-r border-[#2b2b2b] bg-[#1e1e1e] px-4 text-[#ffffff]">
              <span className="text-[#519aba]">TS</span>
              <span>welcome.ts</span>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex h-7 shrink-0 items-center gap-1 border-b border-[#2b2b2b] px-4 text-xs text-[#858585]">
            <span>src</span>
            <span>/</span>
            <span className="text-[#cccccc]">welcome.ts</span>
          </div>

          {/* Editor body */}
          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            <CodeLine n={1}>
              <span className="text-[#6a9955]">
                {"// Polaris — your code editor workspace"}
              </span>
            </CodeLine>
            <CodeLine n={2}>
              <span className="text-[#569cd6]">import</span>
              <span> {"{ Workspace } "}</span>
              <span className="text-[#569cd6]">from</span>
              <span className="text-[#ce9178]">{' "@polaris/core"'}</span>
              <span>;</span>
            </CodeLine>
            <CodeLine n={3}>&nbsp;</CodeLine>
            <CodeLine n={4}>
              <span className="text-[#569cd6]">const</span>
              <span> polaris </span>
              <span className="text-[#569cd6]">=</span>
              <span> </span>
              <span className="text-[#569cd6]">new</span>
              <span> </span>
              <span className="text-[#4ec9b0]">Workspace</span>
              <span>({"{"}</span>
            </CodeLine>
            <CodeLine n={5}>
              <span>{"  name: "}</span>
              <span className="text-[#ce9178]">{`"polaris"`}</span>
              <span>,</span>
            </CodeLine>
            <CodeLine n={6}>
              <span>{"  features: ["}</span>
              <span className="text-[#ce9178]">{`"editor"`}</span>
              <span>, </span>
              <span className="text-[#ce9178]">{`"terminal"`}</span>
              <span>, </span>
              <span className="text-[#ce9178]">{`"git"`}</span>
              <span>, </span>
              <span className="text-[#ce9178]">{`"ai"`}</span>
              <span>{"]"}</span>
              <span>,</span>
            </CodeLine>
            <CodeLine n={7}>
              <span>{"});"}</span>
            </CodeLine>
            <CodeLine n={8}>&nbsp;</CodeLine>
            <CodeLine n={9}>
              <span className="text-[#569cd6]">async function</span>
              <span> </span>
              <span className="text-[#dcdcaa]">main</span>
              <span>() {"{"}</span>
            </CodeLine>
            <CodeLine n={10}>
              <span>{"  "}</span>
              <span className="text-[#569cd6]">await</span>
              <span> polaris.</span>
              <span className="text-[#dcdcaa]">authenticate</span>
              <span>(); </span>
              <span className="text-[#6a9955]">
                {"// required to open projects"}
              </span>
            </CodeLine>
            <CodeLine n={11}>
              <span>{"  "}</span>
              <span className="text-[#569cd6]">const</span>
              <span> projects </span>
              <span className="text-[#569cd6]">=</span>
              <span> </span>
              <span className="text-[#569cd6]">await</span>
              <span> polaris.</span>
              <span className="text-[#dcdcaa]">loadProjects</span>
              <span>();</span>
            </CodeLine>
            <CodeLine n={12}>
              <span>{"  "}</span>
              <span className="text-[#569cd6]">return</span>
              <span> projects;</span>
            </CodeLine>
            <CodeLine n={13}>
              <span>{"}"}</span>
            </CodeLine>
            <CodeLine n={14}>&nbsp;</CodeLine>
            <CodeLine n={15}>
              <span className="text-[#6a9955]">
                {"// Error: Authentication required (401)"}
              </span>
            </CodeLine>
            <CodeLine n={16}>
              <span className="text-[#6a9955]">
                {"// Run `polaris auth login` to continue"}
              </span>
            </CodeLine>
          </div>

          {/* Bottom panel — terminal only */}
          <div className="flex h-[42%] min-h-45 max-h-80 shrink-0 flex-col border-t border-[#2b2b2b]">
            <div className="flex h-9 shrink-0 items-center border-b border-[#2b2b2b] bg-[#252526] px-4 text-xs">
              <span className="border-b border-[#007acc] pb-2 text-[#ffffff]">
                TERMINAL
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-between overflow-auto bg-[#1e1e1e] p-4">
              <div className="space-y-1 text-[13px] leading-relaxed">
                <p>
                  <span className="text-[#4ec9b0]">polaris</span>
                  <span className="text-[#cccccc]"> on </span>
                  <span className="text-[#569cd6]">main</span>
                  <span className="text-[#cccccc]"> → </span>
                  <span className="text-[#858585]">~/workspace</span>
                </p>
                <p>
                  <span className="text-[#cccccc]">$ </span>
                  <span>polaris auth status</span>
                </p>
                <p className="text-[#ce9178]">✗ Not authenticated</p>
                <p className="mt-3">
                  <span className="text-[#cccccc]">$ </span>
                  <span>polaris auth login</span>
                  <span className="auth-cursor ml-0.5 inline-block h-4 w-2 bg-[#cccccc]" />
                </p>
                <p className="text-[#858585]">
                  Sign in to unlock your editor, projects, and workspace sync.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="rounded-sm bg-[#0e639c] px-4 py-1.5 text-[13px] text-white transition-colors hover:bg-[#1177bb]"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="rounded-sm border border-[#3c3c3c] bg-[#3c3c3c] px-4 py-1.5 text-[13px] text-[#cccccc] transition-colors hover:bg-[#454545]"
                  >
                    Create account
                  </button>
                </SignUpButton>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Status bar */}
      <footer className="flex h-5.5 shrink-0 items-center bg-[#007acc] px-3 text-[12px] text-white">
        Authentication required
      </footer>

      <style>{`
        @keyframes auth-cursor-blink {
          0%, 45% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .auth-cursor {
          animation: auth-cursor-blink 1s step-end infinite;
          vertical-align: text-bottom;
        }
      `}</style>
    </div>
  );
}
