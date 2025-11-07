import { useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { ERC4626_ABI } from '../config/contracts';

interface Vault {
  address: string;
  name: string;
  asset: string;
  apy: string;
  description: string;
  chain: number;
}

interface VaultWithLiveData extends Vault {
  liveAPY?: string;
  totalAssets?: string;
  isLoading: boolean;
  hasError: boolean;
}

export function useAllVaultsData(vaults: Vault[]): VaultWithLiveData[] {
  // Create contract calls for all vaults
  const contracts = vaults.flatMap(vault => [
    {
      address: vault.address as `0x${string}`,
      abi: ERC4626_ABI,
      functionName: 'totalAssets',
      chainId: vault.chain,
    },
    {
      address: vault.address as `0x${string}`,
      abi: ERC4626_ABI,
      functionName: 'totalSupply',
      chainId: vault.chain,
    }
  ]);

  const { data: results, isLoading, error } = useReadContracts({
    contracts,
    allowFailure: true,
  });

  // Debug logging
  if (results && !isLoading) {
    console.log('Vault data results:', results);
    vaults.forEach((vault, index) => {
      const totalAssetsResult = results[index * 2];
      const totalSupplyResult = results[index * 2 + 1];
      console.log(`Vault ${vault.name}:`, {
        chain: vault.chain,
        address: vault.address,
        totalAssets: totalAssetsResult,
        totalSupply: totalSupplyResult
      });
    });
  }

  // Process results and calculate live data for each vault
  return vaults.map((vault, index) => {
    const totalAssetsIndex = index * 2;
    const totalSupplyIndex = index * 2 + 1;
    
    const totalAssetsResult = results?.[totalAssetsIndex];
    const totalSupplyResult = results?.[totalSupplyIndex];
    
    const hasError = totalAssetsResult?.status === 'failure' || 
                     totalSupplyResult?.status === 'failure' || 
                     !!error;
    
    let liveAPY: string | undefined;
    let totalAssets: string | undefined;
    
    if (!hasError && totalAssetsResult?.status === 'success' && totalSupplyResult?.status === 'success') {
      const assets = totalAssetsResult.result as bigint;
      const supply = totalSupplyResult.result as bigint;
      
      if (assets && supply && supply > 0n) {
        const sharePrice = Number(formatEther(assets)) / Number(formatEther(supply));
        if (sharePrice > 1) {
          liveAPY = `${((sharePrice - 1) * 100).toFixed(2)}%`;
        }
        totalAssets = Number(formatEther(assets)).toLocaleString();
      }
    }
    
    return {
      ...vault,
      liveAPY: hasError ? undefined : liveAPY,
      totalAssets,
      isLoading: isLoading,
      hasError,
    };
  });
}