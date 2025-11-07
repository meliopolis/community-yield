# YieldRedirector Deployment Guide

This guide will help you deploy the YieldRedirector contract to Base mainnet.

## Prerequisites

1. **Install Foundry** (if not already installed):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get Base ETH**: You'll need some ETH on Base for gas fees
   - Use Base bridge: https://bridge.base.org
   - Or get ETH from an exchange that supports Base

3. **Get BaseScan API Key** (optional, for verification):
   - Go to https://basescan.org/apis
   - Create account and get free API key

## Setup Environment

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your details:
   ```bash
   # Required: Your private key (without 0x prefix)
   PRIVATE_KEY=your_private_key_here
   
   # Optional: BaseScan API key for contract verification
   BASESCAN_API_KEY=your_basescan_api_key_here
   ```

   ⚠️ **SECURITY WARNING**: 
   - Never commit your `.env` file to git
   - Use a dedicated wallet for deployment
   - Make sure the wallet has sufficient Base ETH for gas

## Deploy to Base Mainnet

1. **Compile the contract**:
   ```bash
   forge build
   ```

2. **Deploy to Base**:
   ```bash
   forge script script/Deploy.s.sol:DeployScript --rpc-url base --broadcast --verify
   ```

   This command will:
   - Deploy the YieldRedirector contract
   - Verify the contract on BaseScan (if API key provided)
   - Save deployment details in `broadcast/` folder

3. **Copy the deployed address** from the output that looks like:
   ```
   YieldRedirector deployed at: 0x1234567890abcdef...
   ```

## Deploy to Base Sepolia (Testnet)

For testing, you can deploy to Base Sepolia first:

1. **Get Base Sepolia ETH**: Use the Base Sepolia faucet

2. **Deploy to testnet**:
   ```bash
   forge script script/Deploy.s.sol:DeployScript --rpc-url base-sepolia --broadcast --verify
   ```

## Update Frontend

After deployment, update the frontend configuration:

1. **Edit `frontend/src/config/contracts.ts`**:
   ```typescript
   export const YIELD_REDIRECTOR_ADDRESSES = {
     [1]: '0x0000000000000000000000000000000000000000', // Ethereum Mainnet
     [8453]: 'YOUR_DEPLOYED_ADDRESS_HERE', // Base Mainnet  
     [11155111]: '0x0000000000000000000000000000000000000000', // Sepolia Testnet
     [84532]: '0x0000000000000000000000000000000000000000', // Base Sepolia
   } as const;
   ```

2. **Replace `YOUR_DEPLOYED_ADDRESS_HERE`** with the actual deployed address

## Verify Deployment

1. **Check on BaseScan**: 
   - Go to https://basescan.org/address/YOUR_DEPLOYED_ADDRESS
   - Verify the contract is deployed and verified

2. **Test basic functions**:
   ```bash
   # Test reading from the contract
   cast call YOUR_DEPLOYED_ADDRESS "vaultInfo(address)" 0x6b13c060F13Af1fdB319F52315BbbF3fb1D88844 --rpc-url base
   ```

## Deployment Costs

Estimated gas costs on Base:
- **Deployment**: ~2-3M gas (~$1-5 USD depending on gas prices)
- **Each deposit**: ~200-300K gas
- **Claim yield**: ~150-200K gas
- **Withdraw**: ~200-250K gas

## Troubleshooting

### "Insufficient funds" error
- Make sure your wallet has enough Base ETH for gas fees
- Gas prices on Base are typically much lower than Ethereum

### "Contract verification failed"
- Check your BaseScan API key is correct
- Try verifying manually on BaseScan using the contract source code

### "RPC URL not responding"
- Base RPC may be temporarily unavailable
- Try using alternative RPC: `https://base-mainnet.public.blastapi.io`

### "Private key format error"
- Remove the `0x` prefix from your private key in the .env file
- Make sure there are no spaces or quotes around the key

## Security Notes

- ✅ Contract uses `via_ir` optimizer for gas efficiency
- ✅ All external calls are to verified ERC4626 vaults
- ✅ Position tracking prevents unauthorized access
- ✅ Proper access controls for deposits/withdrawals
- ⚠️ Always test on Base Sepolia first before mainnet deployment

## Next Steps

After deployment:
1. Test the deposit flow with small amounts
2. Verify yields are being redirected correctly
3. Test claim and withdraw functions
4. Add more vaults to the frontend configuration as needed