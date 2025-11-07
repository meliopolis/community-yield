import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { ERC4626_ABI } from '../config/contracts';

interface VaultData {
  totalAssets: bigint | undefined;
  totalSupply: bigint | undefined;
  sharePrice: number | undefined;
  isLoading: boolean;
  error: boolean;
}

export function useVaultData(vaultAddress: string, chainId: number): VaultData {
  // Read total assets in the vault
  const { data: totalAssets, isLoading: isLoadingAssets, error: assetsError } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: 'totalAssets',
    chainId,
  });

  // Read total shares (vault tokens) issued
  const { data: totalSupply, isLoading: isLoadingSupply, error: supplyError } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: ERC4626_ABI,
    functionName: 'totalSupply',
    chainId,
  });

  // Calculate share price (assets per share)
  const sharePrice = totalAssets && totalSupply && totalSupply > 0n
    ? Number(formatEther(totalAssets)) / Number(formatEther(totalSupply))
    : undefined;

  return {
    totalAssets,
    totalSupply,
    sharePrice,
    isLoading: isLoadingAssets || isLoadingSupply,
    error: !!assetsError || !!supplyError,
  };
}