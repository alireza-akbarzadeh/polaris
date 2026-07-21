"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRightIcon } from "lucide-react";

const STARS: [number, number, number][] = [
  [280, 180, 2.2],
  [420, 240, 1.8],
  [520, 160, 2.5],
  [640, 220, 1.6],
  [760, 140, 2],
  [480, 360, 1.5],
  [560, 480, 1.8],
  [700, 420, 1.4],
  [880, 280, 2.2],
  [960, 200, 1.6],
  [200, 420, 1.2],
  [340, 520, 1.3],
  [1000, 460, 1.4],
  [150, 220, 1.1],
  [1050, 160, 1.2],
];

export function UnauthenticatedView() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0c1017] text-white">
      <style>{`
        @keyframes auth-star-twinkle {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @keyframes auth-polaris-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes auth-constellation-drift {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-1.5%, 1%, 0) scale(1.03); }
        }
        @keyframes auth-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-rise { animation: auth-rise 0.7s ease-out both; }
        .auth-star { animation: auth-star-twinkle 3s ease-in-out infinite; }
        .auth-polaris { animation: auth-polaris-pulse 4s ease-in-out infinite; }
        .auth-drift {
          animation: auth-constellation-drift 28s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.45 0.12 250 / 0.35), transparent 55%), radial-gradient(ellipse 50% 40% at 80% 70%, oklch(0.4 0.08 220 / 0.15), transparent 50%), radial-gradient(ellipse 40% 30% at 15% 80%, oklch(0.35 0.06 280 / 0.12), transparent 45%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      {/* Dominant visual: constellation plane */}
      <svg
        aria-hidden
        className="auth-drift pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="auth-star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.85 0.1 250)" stopOpacity="1" />
            <stop
              offset="100%"
              stopColor="oklch(0.85 0.1 250)"
              stopOpacity="0"
            />
          </radialGradient>
        </defs>
        <g stroke="oklch(0.7 0.08 250 / 0.2)" strokeWidth="1" fill="none">
          <path d="M280 180 L420 240 L520 160 L640 220 L760 140" />
          <path d="M420 240 L480 360 L640 220" />
          <path d="M760 140 L880 280 L960 200" />
          <path d="M480 360 L560 480 L700 420 L880 280" />
        </g>
        {STARS.map(([x, y, r], i) => (
          <circle
            key={i}
            className="auth-star"
            cx={x}
            cy={y}
            r={r}
            fill="oklch(0.92 0.02 250)"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
        <circle cx="640" cy="220" r="28" fill="url(#auth-star-glow)" opacity="0.55" />
        <circle
          className="auth-polaris"
          cx="640"
          cy="220"
          r="4.5"
          fill="oklch(0.95 0.04 250)"
        />
      </svg>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex max-w-xl flex-col items-center text-center">
          <p
            className="auth-rise mb-6 font-mono text-sm tracking-[0.35em] text-white/50 uppercase"
            style={{ animationDelay: "0ms" }}
          >
            Polaris
          </p>

          <h1
            className="auth-rise font-mono text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl"
            style={{ animationDelay: "100ms" }}
          >
            Find your north.
          </h1>

          <p
            className="auth-rise mt-5 max-w-md text-base leading-relaxed text-white/55 sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            Sign in to open your projects and keep building from where you left
            off.
          </p>

          <div
            className="auth-rise mt-10 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center"
            style={{ animationDelay: "300ms" }}
          >
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="h-11 w-full bg-white text-[#0c1017] hover:bg-white/90 sm:w-auto sm:min-w-35"
              >
                Sign in
                <ArrowRightIcon />
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto sm:min-w-35"
              >
                Create account
              </Button>
            </SignUpButton>
          </div>
        </div>
      </main>

      <footer
        className="auth-rise relative z-10 px-6 pb-8 text-center font-mono text-xs tracking-wide text-white/25"
        style={{ animationDelay: "500ms" }}
      >
        Secure access · Your workspace stays private
      </footer>
    </div>
  );
}
