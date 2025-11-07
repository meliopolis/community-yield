// Chain-specific contract addresses
export const YIELD_REDIRECTOR_ADDRESSES = {
  [1]: '0x0000000000000000000000000000000000000000', // Ethereum Mainnet
  [8453]: '0xfd6847c1340423eB0E4D598b02F45fd1F56eF48B', // Base Mainnet  
  [11155111]: '0x0000000000000000000000000000000000000000', // Sepolia Testnet
  [84532]: '0x0000000000000000000000000000000000000000', // Base Sepolia
} as const;

export const YIELD_REDIRECTOR_ADDRESS = '0x0000000000000000000000000000000000000000';

// WETH contract addresses for different chains
export const WETH_ADDRESSES = {
  [1]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum Mainnet
  [8453]: '0x4200000000000000000000000000000000000006', // Base Mainnet
  [11155111]: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia Testnet
  [84532]: '0x4200000000000000000000000000000000000006', // Base Sepolia
} as const;

// ERC4626 Vault ABI for reading live data
export const ERC4626_ABI = [
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'assets', type: 'uint256' }],
    name: 'previewDeposit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'previewRedeem',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'asset',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export const YIELD_REDIRECTOR_ABI = [
  {
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_assets', type: 'uint256' },
      { name: '_beneficiary', type: 'address' }
    ],
    name: 'deposit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_depositor', type: 'address' },
      { name: '_vault', type: 'address' }
    ],
    name: 'claimYield',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_assets', type: 'uint256' }
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_newBeneficiary', type: 'address' }
    ],
    name: 'updateBeneficiary',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_depositor', type: 'address' },
      { name: '_vault', type: 'address' }
    ],
    name: 'getPosition',
    outputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'depositedAssets', type: 'uint256' },
      { name: 'beneficiary', type: 'address' },
      { name: 'currentValue', type: 'uint256' },
      { name: 'accruedYield', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getSupportedVaults',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_depositor', type: 'address' },
      { name: '_vaults', type: 'address[]' }
    ],
    name: 'getAllDepositorPositions',
    outputs: [
      { name: 'positionIds', type: 'bytes32[]' },
      { name: 'shares', type: 'uint256[]' },
      { name: 'depositedAssets', type: 'uint256[]' },
      { name: 'beneficiaries', type: 'address[]' },
      { name: 'vaults', type: 'address[]' },
      { name: 'currentValues', type: 'uint256[]' },
      { name: 'accruedYields', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_beneficiary', type: 'address' }
    ],
    name: 'getAllBeneficiaryPositions',
    outputs: [
      { name: 'positionIds', type: 'bytes32[]' },
      { name: 'shares', type: 'uint256[]' },
      { name: 'depositedAssets', type: 'uint256[]' },
      { name: 'depositors', type: 'address[]' },
      { name: 'vaults', type: 'address[]' },
      { name: 'currentValues', type: 'uint256[]' },
      { name: 'accruedYields', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC20 ABI for token approvals and allowances
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;