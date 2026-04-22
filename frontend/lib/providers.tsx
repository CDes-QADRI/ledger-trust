"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

// Config at module level is correct — wagmi handles SSR with ssr:true
const wagmiConfig = getDefaultConfig({
  appName: "Party Expense Tracker",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "placeholder",
  chains: [sepolia],
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient inside useState prevents state sharing between server requests
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}