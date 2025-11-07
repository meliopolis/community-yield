import { useAccount, useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { YIELD_REDIRECTOR_ADDRESSES, YIELD_REDIRECTOR_ABI } from '../config/contracts';
import { AVAILABLE_VAULTS } from '../config/vaults';

interface Position {
  positionId: string;
  vault: string;
  vaultAddress: string;
  asset: string;
  shares: string;
  depositedAmount: string;
  currentValue: string;
  accruedYield: string;
  beneficiary: string;
  isDepositor: boolean;
}

export default function PositionsList() {
  const { address } = useAccount();
  const chainId = useChainId();
  
  // Get chain-specific contract address
  const contractAddress = YIELD_REDIRECTOR_ADDRESSES[chainId as keyof typeof YIELD_REDIRECTOR_ADDRESSES];
  
  // Filter vaults for current chain and get their addresses
  const vaultsForChain = AVAILABLE_VAULTS.filter(v => v.chain === chainId);
  const vaultAddresses = vaultsForChain.map(v => v.address);

  // Get all positions where user is depositor
  const { data: depositorPositions, isLoading: isLoadingDepositor } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: YIELD_REDIRECTOR_ABI,
    functionName: 'getAllDepositorPositions',
    args: address && vaultAddresses.length > 0 ? [address as `0x${string}`, vaultAddresses as `0x${string}`[]] : undefined,
    query: { enabled: !!address && !!contractAddress && vaultAddresses.length > 0 }
  });

  // Get all positions where user is beneficiary
  const { data: beneficiaryPositions, isLoading: isLoadingBeneficiary } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: YIELD_REDIRECTOR_ABI,
    functionName: 'getAllBeneficiaryPositions',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!contractAddress }
  });

  const isLoading = isLoadingDepositor || isLoadingBeneficiary;

  // Process and combine positions
  const positions: Position[] = [];
  
  // Add depositor positions
  if (depositorPositions) {
    const [positionIds, shares, depositedAssets, beneficiaries, vaults, currentValues, accruedYields] = 
      depositorPositions as readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly `0x${string}`[], readonly `0x${string}`[], readonly bigint[], readonly bigint[]];
    
    for (let i = 0; i < positionIds.length; i++) {
      if (shares[i] > 0n) {
        const vault = vaultsForChain.find(v => v.address.toLowerCase() === vaults[i].toLowerCase());
        positions.push({
          positionId: positionIds[i],
          vault: vault?.name || `Vault ${vaults[i].slice(0, 8)}...`,
          vaultAddress: vaults[i],
          asset: vault?.asset || 'ETH',
          shares: formatEther(shares[i]),
          depositedAmount: formatEther(depositedAssets[i]),
          currentValue: formatEther(currentValues[i]),
          accruedYield: formatEther(accruedYields[i]),
          beneficiary: beneficiaries[i] === '0x0000000000000000000000000000000000000000' ? 'None' : 
                      beneficiaries[i] === '0x0000000000000000000000000000000000000002' ? 'CommonsHub/Gitcoin' :
                      `${beneficiaries[i].slice(0, 6)}...${beneficiaries[i].slice(-4)}`,
          isDepositor: true
        });
      }
    }
  }
  
  // Add beneficiary positions (avoid duplicates if user is both depositor and beneficiary)
  if (beneficiaryPositions) {
    const [positionIds, shares, depositedAssets, , vaults, currentValues, accruedYields] = 
      beneficiaryPositions as readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly `0x${string}`[], readonly `0x${string}`[], readonly bigint[], readonly bigint[]];
    
    for (let i = 0; i < positionIds.length; i++) {
      // Skip if this position was already added as depositor position
      if (!positions.some(p => p.positionId === positionIds[i]) && shares[i] > 0n) {
        const vault = vaultsForChain.find(v => v.address.toLowerCase() === vaults[i].toLowerCase());
        positions.push({
          positionId: positionIds[i],
          vault: vault?.name || `Vault ${vaults[i].slice(0, 8)}...`,
          vaultAddress: vaults[i],
          asset: vault?.asset || 'ETH',
          shares: formatEther(shares[i]),
          depositedAmount: formatEther(depositedAssets[i]),
          currentValue: formatEther(currentValues[i]),
          accruedYield: formatEther(accruedYields[i]),
          beneficiary: address || '', // Current user is the beneficiary
          isDepositor: false
        });
      }
    }
  }

  return (
    <div className="card p-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Your Positions</h3>
          <p className="text-sm text-gray-500">Manage your deposits and track yields</p>
          {isLoading && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Loading positions...</span>
            </div>
          )}
          {!address && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-xs text-gray-600">Connect wallet to view positions</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        {positions.map((position, index) => (
          <div key={index} className="position-card fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{position.vault}</h4>
                  <p className="text-sm text-gray-500">
                    {position.isDepositor ? 'Your deposit' : 'You are beneficiary'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                  Active
                </span>
                {!position.isDepositor && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Beneficiary
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Deposited</p>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(position.depositedAmount).toFixed(6)} {position.asset}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(position.currentValue).toFixed(6)} {position.asset}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Accrued Yield</p>
                <p className="text-2xl font-bold text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  +{parseFloat(position.accruedYield).toFixed(6)} {position.asset}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Beneficiary</p>
                <p className="text-lg font-semibold text-gray-900">{position.beneficiary}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              {!position.isDepositor && (
                <button className="flex-1 btn-primary py-3">
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span>Claim Yield</span>
                  </span>
                </button>
              )}
              {position.isDepositor && (
                <>
                  <button className="flex-1 btn-secondary py-3">
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span>Withdraw</span>
                    </span>
                  </button>
                  <button className="flex-1 btn-secondary py-3">
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Update Beneficiary</span>
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        
        {positions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              No positions yet
            </p>
            <p className="text-gray-500 mb-6">
              Make your first deposit to start generating yields for good causes!
            </p>
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 px-4 py-2 rounded-lg text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Start generating yields above</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}