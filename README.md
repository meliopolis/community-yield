# Community Yield

A DeFi application that allows users to deposit funds into Morpho Protocol vaults while redirecting the generated yield to support community causes.

## Features

- **Deposit to Morpho Vaults**: Maintain ownership of your principal while earning yield
- **Redirect Yield**: Designate any wallet address to receive your generated yields
- **Support Communities**: Direct yields to pre-configured community causes or custom addresses
- **Full Control**: Update beneficiaries or withdraw your principal at any time

## Architecture

### Smart Contracts
- `YieldRedirector.sol`: Main contract managing deposits, yield tracking, and beneficiary assignments
- Built with Solidity 0.8.19 and tested with Foundry

### Frontend
- React + TypeScript application built with Vite
- Web3 integration using wagmi and ConnectKit
- Styled with Tailwind CSS

## Setup

### Smart Contracts

```bash
cd contracts
forge install
forge test
```

To deploy:
```bash
cp .env.example .env
# Add your private key and RPC URL
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

### Frontend

```bash
cd frontend
bun install
cp .env.example .env
# Add your WalletConnect Project ID
bun dev
```

## How It Works

1. **Connect Wallet**: Users connect their wallet via ConnectKit
2. **Select Vault**: Choose from supported Morpho Protocol vaults
3. **Set Beneficiary**: Select a pre-configured community cause or enter a custom address
4. **Deposit Funds**: Funds are deposited to the Morpho vault through the YieldRedirector contract
5. **Yield Accrual**: Yields accumulate over time and can be claimed by the beneficiary
6. **Maintain Control**: Original depositor retains ownership of principal and can withdraw anytime

## Contract Functions

- `deposit(vault, amount, beneficiary)`: Deposit funds and set beneficiary
- `claimYield(depositor, vault)`: Beneficiary claims accumulated yield
- `withdraw(vault, amount)`: Withdraw principal (depositor only)
- `updateBeneficiary(vault, newBeneficiary)`: Change the yield recipient
- `getPosition(depositor, vault)`: View position details

## Supported Networks

- Ethereum Mainnet
- Sepolia Testnet
- Base Sepolia Testnet

## Security Considerations

- Smart contracts should be audited before mainnet deployment
- Users maintain full control of their principal
- Beneficiaries can only claim yields, not principal
- Emergency withdrawal functions available

## License

MIT