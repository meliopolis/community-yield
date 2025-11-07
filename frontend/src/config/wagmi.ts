import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, base, baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';

export const config = createConfig(
  getDefaultConfig({
    chains: [mainnet, base, sepolia, baseSepolia],
    transports: {
      [mainnet.id]: http(),
      [base.id]: http(),
      [sepolia.id]: http(),
      [baseSepolia.id]: http(),
    },
    
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    
    appName: 'Community Yield',
    appDescription: 'Redirect DeFi yields to support community causes',
    appUrl: 'https://community-yield.app',
    appIcon: 'https://community-yield.app/logo.png',
  }),
);