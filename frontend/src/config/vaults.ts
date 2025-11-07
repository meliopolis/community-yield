export interface Vault {
  address: string;
  name: string;
  asset: string;
  apy: string;
  description: string;
  chain: number;
}

export const AVAILABLE_VAULTS: Vault[] = [
  // Ethereum Mainnet Vaults - Commented out for cleanup
  // {
  //   address: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB', // Steakhouse USDC vault
  //   name: 'Steakhouse USDC - Ethereum',
  //   asset: 'USDC',
  //   apy: 'Variable',
  //   description: 'USDC lending on Morpho Blue - Ethereum',
  //   chain: 1
  // },
  // {
  //   address: '0x2371e134e3455e0593363cBF89d3b6cf53740618', // Correct WETH vault
  //   name: 'Morpho Gauntlet WETH Prime - Ethereum', 
  //   asset: 'WETH',
  //   apy: 'Variable',
  //   description: 'WETH lending on Morpho Blue - Ethereum',
  //   chain: 1
  // },
  // {
  //   address: '0x78Fc2c2eD1A4cDb5402365934aE5648aDAd094d0', // Re7 WETH vault
  //   name: 'Re7 Labs WETH - Ethereum',
  //   asset: 'WETH',
  //   apy: 'Variable',
  //   description: 'WETH lending optimized by Re7 Labs - Ethereum',
  //   chain: 1
  // },
  
  // Base Mainnet Vaults
  // {
  //   address: '0x4881Ef0BF6d2365D3dd6499ccd7532bcdBCE0658', // Moonwell Flagship USDC on Base
  //   name: 'Moonwell Flagship USDC - Base',
  //   asset: 'USDC',
  //   apy: 'Variable',
  //   description: 'USDC lending on Moonwell - Base',
  //   chain: 8453
  // },
  {
    address: '0x6b13c060F13Af1fdB319F52315BbbF3fb1D88844', // Morpho Gauntlet ETH Prime on Base
    name: 'Morpho Gauntlet ETH Prime - Base',
    asset: 'ETH',
    apy: 'Variable',
    description: 'ETH lending on Morpho Blue - Base',
    chain: 8453
  }
];