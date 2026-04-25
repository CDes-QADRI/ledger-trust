"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { ThemeProvider } from "../lib/theme";

// dynamic with ssr:false is only allowed in Client Components
const ProvidersNoSSR = dynamic(
  () => import("../lib/providers").then((m) => m.Providers),
  { ssr: false }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ProvidersNoSSR>{children}</ProvidersNoSSR>
    </ThemeProvider>
  );
}