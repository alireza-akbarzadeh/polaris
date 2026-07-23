"use client";

import { cn } from "@/lib/utils";

type TopProgressBarProps = {
  className?: string;
  /** Accessible label while the bar is active */
  label?: string;
};

/**
 * Indeterminate top-of-viewport progress (YouTube / NProgress style).
 */
export function TopProgressBar({
  className,
  label = "Loading",
}: TopProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuetext={label}
      aria-busy="true"
      aria-label={label}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-transparent",
        className,
      )}
    >
      <div className="absolute inset-y-0 w-1/3 animate-[top-progress_1.1s_ease-in-out_infinite] rounded-full bg-[#3574f0] shadow-[0_0_12px_rgba(53,116,240,0.65)]" />
      <style>{`
        @keyframes top-progress {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </div>
  );
}
