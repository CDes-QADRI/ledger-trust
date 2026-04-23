"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import "@rainbow-me/rainbowkit/styles.css";

// Use injected() connector so MetaMask browser extension connects directly
// via window.ethereum — no WalletConnect tunnel needed, no domain whitelist needed
const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  connectors: [injected()],
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