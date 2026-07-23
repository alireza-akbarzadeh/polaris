"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import { Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

import { AppUserButton } from "@/features/billing/components/app-user-button";
import { PricingSection } from "@/features/billing/components/pricing-section";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const FEATURES = [
  {
    id: "engine",
    label: "01 // Reasoning",
    title: "Logic-First Completions",
    description:
      "Ask, edit, and explain in context of your open files — not a blank chat window bolted on the side.",
  },
  {
    id: "context",
    label: "02 // Context",
    title: "Deep Repo Indexing",
    description:
      "The assistant sees your project structure, open tabs, and diffs so suggestions stay grounded in real code.",
  },
  {
    id: "performance",
    label: "03 // Workflow",
    title: "Git, Terminal, Editor",
    description:
      "Status, history, publish, and a workspace terminal live next to your work — one browser IDE, zero hop.",
  },
] as const;

const WORKFLOW_STEPS = [
  {
    n: "01",
    t: "Open a workspace",
    d: "Create a project or clone from GitHub. Polaris boots the editor, file tree, and terminal together.",
  },
  {
    n: "02",
    t: "Describe intent",
    d: "Chat with the assistant against your open files, or select code and ask for a focused change.",
  },
  {
    n: "03",
    t: "Review the diff",
    d: "Accept edits in the editor, inspect git status, and keep history visible without leaving the tab.",
  },
  {
    n: "04",
    t: "Ship from the browser",
    d: "Commit, publish, and run commands in the workspace terminal — same surface end to end.",
  },
] as const;

const CAPABILITIES = [
  { k: "AI chat", v: "Context from open files & project tree" },
  { k: "Code editor", v: "Monaco with multi-file tabs" },
  { k: "Git", v: "Status, history, commit, publish" },
  { k: "Terminal", v: "Workspace shell next to the editor" },
] as const;

const FAQS = [
  {
    q: "Does Polaris send my code to the cloud?",
    a: "Your workspace runs in the browser against your project storage. AI features use the models configured for your plan — review Clerk Billing entitlements for what’s included.",
  },
  {
    q: "Do I need to install anything?",
    a: "No desktop app. Sign in, open a project, and the editor, Git tools, and terminal load in the browser.",
  },
  {
    q: "Can I clone from GitHub?",
    a: "Yes. Connect GitHub and clone a repository into a Polaris workspace, then edit and publish from the same UI.",
  },
  {
    q: "How does pricing work?",
    a: "Plans are managed with Clerk Billing. Scroll to Pricing below — the live table shows current tiers and opens checkout when you pick one.",
  },
  {
    q: "What happens after I subscribe?",
    a: "Checkout completes in Clerk’s drawer. You’re redirected to projects, and Pro entitlements unlock features gated by your plan.",
  },
] as const;

function PricingLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href="#pricing" className={className}>
      {children}
    </a>
  );
}

function Nav() {
  const { openProjects } = useProjectsDialog();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#121316]/80 px-6 py-4 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt=""
            width={24}
            height={24}
            className="size-6"
            priority
          />
          <span
            className={cn(
              display.className,
              "text-[15px] font-semibold tracking-tight text-white",
            )}
          >
            Polaris
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-[13px] font-medium text-[#9a9a9a] md:flex">
          <a href="#engine" className="transition-colors hover:text-white">
            Engine
          </a>
          <a href="#workflow" className="transition-colors hover:text-white">
            Workflow
          </a>
          <a href="#faq" className="transition-colors hover:text-white">
            FAQ
          </a>
          <PricingLink className="transition-colors hover:text-white">
            Pricing
          </PricingLink>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <Show when="signed-out">
          <SignInButton mode="modal" forceRedirectUrl="/projects">
            <button
              type="button"
              className="text-[13px] font-medium text-[#9a9a9a] transition-colors hover:text-white"
            >
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/projects">
            <button
              type="button"
              className="rounded-md bg-white px-4 py-2 text-[13px] font-bold text-[#121316] transition-colors hover:bg-zinc-200 sm:px-5"
            >
              Get started
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <button
            type="button"
            onClick={() => openProjects()}
            className="rounded-md bg-white px-4 py-2 text-[13px] font-bold text-[#121316] transition-colors hover:bg-zinc-200 sm:px-5"
          >
            Open projects
          </button>
          <AppUserButton />
        </Show>
      </div>
    </nav>
  );
}

function Hero() {
  const { openProjects } = useProjectsDialog();

  return (
    <section className="relative overflow-hidden pt-20 pb-28 md:pt-24 md:pb-40">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[1200px] -translate-x-1/2 rounded-full bg-[#3574f0]/20 opacity-50 blur-[160px]"
      />

      <div className="mx-auto max-w-6xl px-6 text-center">
        <div className="animate-float">
          <p
            className={cn(
              display.className,
              "mb-6 text-[clamp(2.75rem,9vw,5.75rem)] leading-[0.9] font-extrabold tracking-[-0.04em] text-white",
            )}
          >
            Polaris
          </p>
          <h1 className="mx-auto mb-6 max-w-5xl text-balance text-3xl font-bold tracking-tight text-white md:mb-8 md:text-6xl md:leading-[1.05]">
            Ship code{" "}
            <span className="text-[#8b8e96]">at the speed of</span> thought.
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-balance text-base font-medium leading-relaxed text-[#8b8e96] md:mb-16 md:text-xl">
            The AI workspace for building software. Context-aware editing, Git,
            and terminal — zero config, in the browser.
          </p>
          <div className="mb-14 flex flex-wrap items-center justify-center gap-3 md:mb-16">
            <Show when="signed-out">
              <SignUpButton mode="modal" forceRedirectUrl="/projects">
                <button
                  type="button"
                  className="rounded-md bg-[#3574f0] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#2d66d8]"
                >
                  Start building
                </button>
              </SignUpButton>
              <SignInButton mode="modal" forceRedirectUrl="/projects">
                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-transparent px-5 py-2.5 text-[14px] text-[#bcbec4] transition-colors hover:border-white/20 hover:text-white"
                >
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <button
                type="button"
                onClick={() => openProjects()}
                className="rounded-md bg-[#3574f0] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#2d66d8]"
              >
                Open projects
              </button>
              <PricingLink className="rounded-md border border-white/10 bg-transparent px-5 py-2.5 text-[14px] text-[#bcbec4] transition-colors hover:border-white/20 hover:text-white">
                View pricing
              </PricingLink>
            </Show>
          </div>
        </div>

        <div
          className="animate-float relative mx-auto max-w-6xl"
          style={{ animationDelay: "200ms" }}
        >
          <div
            aria-hidden
            className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-white/15 to-transparent opacity-10 blur-sm"
          />
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0C0C0E] shadow-[0_48px_100px_-20px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-5 py-3.5">
              <div className="flex w-24 gap-2">
                <div className="size-3 rounded-full bg-white/10" />
                <div className="size-3 rounded-full bg-white/10" />
                <div className="size-3 rounded-full bg-white/10" />
              </div>
              <div className="font-mono text-[11px] tracking-widest text-[#9a9a9a] uppercase opacity-60">
                src/app/page.tsx — Polaris
              </div>
              <div className="flex w-24 justify-end">
                <div className="size-4 rounded-sm bg-white/10" />
              </div>
            </div>

            <div className="grid h-[420px] md:h-[540px] md:grid-cols-[220px_1fr]">
              <div className="hidden space-y-4 border-r border-white/5 p-5 text-left font-mono text-[11px] opacity-40 md:block">
                <div className="space-y-2">
                  <div className="font-bold tracking-wider text-white/80 uppercase">
                    Explorer
                  </div>
                  <div className="pl-2 text-white">polaris</div>
                  <div className="pl-2">▾ src</div>
                  <div className="pl-6 font-bold text-[#7eb0f8]">page.tsx</div>
                  <div className="pl-6">workspace.tsx</div>
                  <div className="pl-6">types.d.ts</div>
                  <div className="pl-2">▸ components</div>
                  <div className="pl-2">▸ features</div>
                </div>
                <div className="space-y-2 pt-4">
                  <div className="font-bold tracking-wider text-white/80 uppercase">
                    Context
                  </div>
                  <div className="pl-2">open_files</div>
                  <div className="pl-2">git_status</div>
                </div>
              </div>

              <div className="relative p-6 text-left font-mono text-[13px] leading-relaxed md:p-8">
                <div className="mb-1 flex gap-6">
                  <div className="w-6 select-none text-right text-white/20">
                    102
                  </div>
                  <div className="font-medium text-zinc-500">
                    <span className="text-[#c792ea]">import</span> {"{"}{" "}
                    <span className="text-[#82aaff]">Workspace</span> {"}"}{" "}
                    <span className="text-[#c792ea]">from</span>{" "}
                    <span className="text-[#c3e88d]">
                      &quot;@polaris/core&quot;
                    </span>
                    ;
                  </div>
                </div>
                <div className="mb-1 flex gap-6">
                  <div className="w-6 select-none text-right text-white/20">
                    103
                  </div>
                  <div className="text-zinc-500" />
                </div>
                <div className="mb-1 flex gap-6">
                  <div className="w-6 select-none text-right text-white/20">
                    104
                  </div>
                  <div className="font-medium text-zinc-500">
                    <span className="text-[#c792ea]">export default function</span>{" "}
                    <span className="text-[#82aaff]">Home</span>() {"{"}
                  </div>
                </div>

                <div className="group -mx-6 mb-1 flex gap-6 bg-[#3574f0]/10 px-6 py-1 ring-1 ring-[#3574f0]/25 md:-mx-8 md:px-8">
                  <div className="w-6 select-none text-right text-[#7eb0f8]/50">
                    105
                  </div>
                  <div className="font-medium text-white">
                    <span className="text-[#c792ea]">return</span>{" "}
                    <span className="text-[#c792ea]">&lt;</span>
                    <span className="text-[#82aaff]">Workspace</span>{" "}
                    project=
                    <span className="text-[#c3e88d]">&quot;polaris&quot;</span>{" "}
                    ai=
                    <span className="text-[#ffcb6b]">true</span>{" "}
                    <span className="text-[#c792ea]">/&gt;</span>
                    <span className="cursor-blink ml-1 inline-block h-4 w-[2px] bg-[#3574f0] align-middle" />
                  </div>
                </div>

                <div className="mb-1 flex gap-6">
                  <div className="w-6 select-none text-right text-white/20">
                    106
                  </div>
                  <div className="pl-4 text-white/40 italic">
                    {"// AI, git, and terminal — one workspace"}
                  </div>
                </div>
                <div className="mb-1 flex gap-6">
                  <div className="w-6 select-none text-right text-white/20">
                    107
                  </div>
                  <div className="text-zinc-500">{"}"}</div>
                </div>

                <div
                  className="animate-float absolute right-4 bottom-4 w-72 rounded-lg border border-white/10 bg-zinc-900 p-5 shadow-2xl md:right-8 md:bottom-8 md:w-80"
                  style={{ animationDelay: "800ms" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#3574f0]" />
                    <span className="text-[10px] font-bold tracking-wider text-[#9a9a9a] uppercase">
                      Polaris AI
                    </span>
                  </div>
                  <p className="mb-4 text-[12px] leading-snug text-white/90">
                    Based on this file, keep Polaris as the hero brand and pair
                    one primary CTA with the full-bleed editor preview.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded bg-[#3574f0] py-1.5 text-[11px] font-bold text-white"
                    >
                      Apply Fix
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded border border-white/5 bg-white/5 py-1.5 text-[11px] font-bold text-white"
                    >
                      Explain
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="border-t border-white/5 bg-white/[0.01] py-24">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-[#7eb0f8] uppercase">
            Principles
          </div>
          <h2
            className={cn(
              display.className,
              "text-3xl font-bold tracking-tight text-white md:text-5xl",
            )}
          >
            Engineered for the compiler in your head.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.id}
              id={feature.id}
              className="scroll-mt-24 rounded-2xl border border-white/5 bg-zinc-900/50 p-8 transition-all hover:border-white/10 md:p-10"
            >
              <div className="mb-6 font-mono text-[10px] font-bold tracking-widest text-[#7eb0f8] uppercase">
                {feature.label}
              </div>
              <h3 className="mb-4 text-xl font-bold text-white">
                {feature.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-[#8b8e96]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EngineDeepDive() {
  return (
    <section className="border-t border-white/5 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-16 px-6 md:grid-cols-2 md:items-center md:px-8">
        <div>
          <div className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-[#7eb0f8] uppercase">
            04 // Native workspace
          </div>
          <h2
            className={cn(
              display.className,
              "mb-6 text-3xl font-bold tracking-tight text-white md:text-5xl md:leading-[1.1]",
            )}
          >
            An AI workspace that lives{" "}
            <span className="text-[#8b8e96]">inside</span> the browser.
          </h2>
          <p className="mb-8 text-base leading-relaxed text-[#8b8e96] md:text-lg">
            No separate chat app, no desktop install. Polaris keeps the editor,
            assistant, Git, and terminal on one surface so you stay in flow.
          </p>
          <div className="space-y-4">
            {CAPABILITIES.map((row) => (
              <div
                key={row.k}
                className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3"
              >
                <span className="font-mono text-[11px] tracking-widest text-[#9a9a9a] uppercase">
                  {row.k}
                </span>
                <span className="text-right text-sm font-medium text-white">
                  {row.v}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-10 rounded-full bg-[#3574f0]/15 blur-[100px]"
          />
          <div className="relative rounded-2xl border border-white/10 bg-zinc-950 p-8 font-mono text-[12px] leading-relaxed">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-[#9a9a9a] uppercase">
                workspace_trace.log
              </span>
              <span className="rounded bg-[#3574f0]/20 px-2 py-0.5 text-[10px] font-bold text-[#7eb0f8]">
                LIVE
              </span>
            </div>
            <div className="space-y-2 text-zinc-400">
              <div>
                <span className="text-[#7eb0f8]">→</span> open: page.tsx{" "}
                <span className="text-[#9a9a9a]">(ready)</span>
              </div>
              <div>
                <span className="text-[#7eb0f8]">→</span> context: 3 tabs + git
                status
              </div>
              <div>
                <span className="text-[#7eb0f8]">→</span> assist: refactor Hero
                CTA
              </div>
              <div className="text-emerald-400">
                ✓ patch ready{" "}
                <span className="text-[#9a9a9a]">(apply in editor)</span>
              </div>
              <div className="mt-4 border-t border-white/5 pt-3 text-white/60">
                <span className="text-[#c792ea]">const</span> workspace ={" "}
                <span className="text-[#c792ea]">await</span> Polaris.
                <span className="text-[#82aaff]">boot</span>();
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSteps() {
  return (
    <section
      id="workflow"
      className="scroll-mt-24 border-t border-white/5 bg-white/[0.01] py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center md:mb-20">
          <div className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-[#7eb0f8] uppercase">
            Workflow
          </div>
          <h2
            className={cn(
              display.className,
              "text-3xl font-bold tracking-tight text-white md:text-5xl",
            )}
          >
            Four steps. Zero context switching.
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5 md:grid-cols-4">
          {WORKFLOW_STEPS.map((s) => (
            <div
              key={s.n}
              className="group relative bg-[#121316] p-8 transition-colors hover:bg-white/[0.02]"
            >
              <div className="mb-8 font-mono text-[42px] leading-none font-bold text-white/10 transition-colors group-hover:text-[#3574f0]/40">
                {s.n}
              </div>
              <h3 className="mb-3 text-lg font-bold text-white">{s.t}</h3>
              <p className="text-[13px] leading-relaxed text-[#8b8e96]">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-white/5 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 md:px-8">
        <div className="mb-12 text-center">
          <div className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-[#7eb0f8] uppercase">
            FAQ
          </div>
          <h2
            className={cn(
              display.className,
              "text-3xl font-bold tracking-tight text-white md:text-5xl",
            )}
          >
            Answers, before you ask.
          </h2>
        </div>
        <div className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-zinc-900/30">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer items-center justify-between text-[15px] font-medium text-white [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="ml-4 font-mono text-lg text-[#9a9a9a] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-[14px] leading-relaxed text-[#8b8e96]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  const { openProjects } = useProjectsDialog();

  return (
    <section className="py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.02] p-10 text-center md:rounded-[40px] md:p-16">
          <div
            aria-hidden
            className="absolute -top-24 -left-24 size-64 rounded-full bg-[#3574f0]/15 blur-[100px]"
          />
          <h2
            className={cn(
              display.className,
              "relative mb-6 text-3xl font-bold text-white md:text-4xl",
            )}
          >
            Build for the next era.
          </h2>
          <p className="relative mb-10 text-balance text-base text-[#8b8e96] md:text-lg">
            Create a free account, open a workspace, and start editing with AI,
            Git, and terminal in one place.
          </p>

          <div className="relative flex flex-wrap items-center justify-center gap-3">
            <Show when="signed-out">
              <SignUpButton mode="modal" forceRedirectUrl="/projects">
                <button
                  type="button"
                  className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-[#121316] transition-all hover:bg-zinc-200"
                >
                  Create account
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <button
                type="button"
                onClick={() => openProjects()}
                className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-[#121316] transition-all hover:bg-zinc-200"
              >
                Open projects
              </button>
            </Show>
            <PricingLink className="rounded-xl border border-white/10 px-8 py-3.5 text-sm font-medium text-[#bcbec4] transition-colors hover:border-white/20 hover:text-white">
              View pricing
            </PricingLink>
          </div>
          <p className="relative mt-8 font-mono text-[11px] tracking-[0.2em] text-[#9a9a9a]/40 uppercase">
            Browser workspace / AI + Git + terminal
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { openProjects } = useProjectsDialog();

  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-10 px-6 md:flex-row md:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt=""
            width={20}
            height={20}
            className="size-5 opacity-50"
          />
          <span className="font-mono text-xs font-bold tracking-widest uppercase opacity-40">
            Polaris {new Date().getFullYear()}
          </span>
        </div>
        <div className="flex gap-10 font-mono text-[10px] font-bold tracking-widest text-[#9a9a9a] uppercase">
          <PricingLink className="transition-colors hover:text-white">
            Pricing
          </PricingLink>
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/projects">
              <button
                type="button"
                className="transition-colors hover:text-white"
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <button
              type="button"
              onClick={() => openProjects()}
              className="transition-colors hover:text-white"
            >
              Projects
            </button>
          </Show>
        </div>
        <div className="font-mono text-[10px] tracking-widest text-[#9a9a9a]/30 uppercase">
          Designed for precision engineering
        </div>
      </div>
    </footer>
  );
}

export function LandingView() {
  useEffect(() => {
    if (window.location.hash !== "#pricing") return;
    const id = window.setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="min-h-dvh bg-[#121316] font-sans text-[#dfdfdf] selection:bg-[#3574f0]/30 selection:text-white">
      <Nav />
      <Hero />
      <Features />
      <EngineDeepDive />
      <WorkflowSteps />
      <PricingSection />
      <FaqSection />
      <Cta />
      <Footer />
    </div>
  );
}
