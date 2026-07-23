"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import {
  Authenticated,
  AuthLoading,
  ConvexReactClient,
  Unauthenticated,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { usePathname } from "next/navigation";

import { AuthLoadingView } from "@/features/auth/components/auth-loading-view";
import { LandingView } from "@/features/auth/components/unauthenticated-view";
import { PricingDialogProvider } from "@/features/billing/components/pricing-dialog";
import { ProjectsDialogProvider } from "@/features/projects/components/projects-dialog";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import ThemeProvider from "./theme-provider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** Public marketing / invite routes — no auth required to view. */
const PUBLIC_PATHS = ["/", "/pricing", "/invite"];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (path) => path !== "/" && (pathname === path || pathname.startsWith(`${path}/`)),
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);

  return (
    <>
      <Authenticated>{children}</Authenticated>
      <Unauthenticated>
        {publicRoute ? children : <LandingView />}
      </Unauthenticated>
      <AuthLoading>
        <AuthLoadingView />
      </AuthLoading>
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PricingDialogProvider>
            <ProjectsDialogProvider>
              <AuthGate>
                <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
              </AuthGate>
            </ProjectsDialogProvider>
          </PricingDialogProvider>
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
