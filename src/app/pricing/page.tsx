"use client";

import { useEffect } from "react";

import { LandingView } from "@/features/auth/components/unauthenticated-view";

/** Deep link shell — scrolls to the Clerk pricing section on the landing page. */
export default function PricingPage() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.history.replaceState(null, "", "/#pricing");
    }, 50);
    return () => window.clearTimeout(id);
  }, []);

  return <LandingView />;
}
