"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationProgress } from "@/components/navigation-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <ThemeProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            className: "font-[family-name:var(--font-manrope)]",
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
