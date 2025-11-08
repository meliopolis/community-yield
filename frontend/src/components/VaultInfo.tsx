import { useVaultData } from '../hooks/useVaultData';
import { formatEther } from 'viem';

interface VaultInfoProps {
  vault: {
    address: string;
    name: string;
    asset: string;
    apy: string;
    description: string;
    chain: number;
  };
  currentChainId: number;
}

export function VaultInfo({ vault, currentChainId }: VaultInfoProps) {
  const { totalAssets, sharePrice, isLoading, error } = useVaultData(
    vault.address, 
    vault.chain
  );

  const isCorrectChain = vault.chain === currentChainId;

  // Calculate estimated APY based on share price (simplified)
  const estimatedAPY = sharePrice && sharePrice > 1 
    ? `${((sharePrice - 1) * 100).toFixed(2)}%`
    : 'Loading...';

  return (
    <div className={`mt-3 p-4 rounded-lg border ${
      isCorrectChain 
        ? 'bg-indigo-50 border-indigo-200' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${
          isCorrectChain ? 'bg-indigo-500' : 'bg-yellow-500'
        }`}></div>
        <span className={`text-sm font-medium ${
          isCorrectChain ? 'text-indigo-900' : 'text-yellow-900'
        }`}>
          {vault.name}
        </span>
        {!isCorrectChain && (
          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
            Chain ID: {vault.chain}
          </span>
        )}
        {isLoading && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full animate-pulse">
            Loading...
          </span>
        )}
      </div>
      
      <p className={`text-sm ${
        isCorrectChain ? 'text-indigo-700' : 'text-yellow-700'
      }`}>
        {vault.description}
      </p>
      
      <div className={`mt-2 grid grid-cols-2 gap-4 text-xs ${
        isCorrectChain ? 'text-indigo-600' : 'text-yellow-600'
      }`}>
        <div>
          <span className="font-medium">Asset:</span> {vault.asset}
        </div>
        <div>
          <span className="font-medium">Live APY:</span> {
            error ? 'Error' : 
            isLoading ? 'Loading...' : 
            estimatedAPY
          }
        </div>
        {totalAssets !== undefined && totalAssets > 0n && (
          <div className="col-span-2">
            <span className="font-medium">Total Assets:</span> {
              Number(formatEther(totalAssets)).toLocaleString()
            } {vault.asset}
          </div>
        )}
      </div>
      
      {!isCorrectChain && (
        <div className="mt-3 p-2 bg-yellow-100 rounded border border-yellow-300">
          <p className="text-xs text-yellow-800">
            ⚠️ This vault is on a different chain. Please switch to Chain ID {vault.chain} to make deposits.
          </p>
        </div>
      )}
    </div>
  );
}