import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract, useAccount } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import { YIELD_REDIRECTOR_ADDRESSES, YIELD_REDIRECTOR_ABI, WETH_ADDRESSES, ERC20_ABI } from '../config/contracts';
import { AVAILABLE_VAULTS, type Vault } from '../config/vaults';
import { VaultInfo } from './VaultInfo';
import { useAllVaultsData } from '../hooks/useAllVaultsData';
import { simulate, getSimulationURL } from '../config/tenderly';

export default function DepositForm() {
  const chainId = useChainId();
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [selectedCause, setSelectedCause] = useState('');
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [transactionType, setTransactionType] = useState<'approval' | 'deposit' | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationUrl, setSimulationUrl] = useState<string | null>(null);
  
  const MAX_DEPOSIT = 0.1;
  const isAmountExceeded = parseFloat(amount) > MAX_DEPOSIT;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  // Fetch live data for all vaults
  const vaultsWithLiveData = useAllVaultsData(AVAILABLE_VAULTS);
  
  // Show all vaults regardless of chain
  const availableVaults = vaultsWithLiveData;
  
  // Get chain-specific contract address
  const contractAddress = YIELD_REDIRECTOR_ADDRESSES[chainId as keyof typeof YIELD_REDIRECTOR_ADDRESSES] || '0x0';
  
  // Get WETH contract address for current chain
  const wethAddress = WETH_ADDRESSES[chainId as keyof typeof WETH_ADDRESSES];
  
  // Check current allowance for WETH
  const { data: currentAllowance } = useReadContract({
    address: wethAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress as `0x${string}`] : undefined,
    query: { enabled: !!address && !!contractAddress && !!wethAddress }
  });
  
  // Check if we need approval
  const amountToSpend = amount ? parseEther(amount) : 0n;
  const needsApproval = currentAllowance !== undefined && amountToSpend > currentAllowance;

  // Reset transaction type when transaction is successful
  useEffect(() => {
    if (isSuccess) {
      // Small delay to show the success state, then reset
      const timer = setTimeout(() => {
        setTransactionType(null);
      }, 3000); // Reset after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const communityAddresses: Record<string, string> = {
    'CommonsHub': '0xdd1d28e5bedbd000a0539a3bf0ed558f4b721a84',
    'gitcoin': '0xdd1d28e5bedbd000a0539a3bf0ed558f4b721a84',
    'custom': ''
  };

  const handleApprove = async () => {
    if (!amount || !wethAddress || !contractAddress) return;
    
    const approvalAmount = parseEther(amount);
    console.log('Approving amount:', {
      amount: amount,
      amountInWei: approvalAmount.toString(),
      wethAddress: wethAddress,
      contractAddress: contractAddress
    });
    
    try {
      setTransactionType('approval');
      writeContract({
        address: wethAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress as `0x${string}`, approvalAmount],
      });
    } catch (error) {
      console.error('Approval error:', error);
      setTransactionType(null);
    }
  };

  const handleDeposit = async () => {
    if (!amount || !beneficiary || !selectedVault || !contractAddress || isAmountExceeded) return;
    
    try {
      setTransactionType('deposit');
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: YIELD_REDIRECTOR_ABI,
        functionName: 'deposit',
        args: [selectedVault.address as `0x${string}`, parseEther(amount), beneficiary as `0x${string}`],
      });
    } catch (error) {
      console.error('Deposit error:', error);
      setTransactionType(null);
    }
  };

  const handleSimulateDeposit = async () => {
    if (!amount || !beneficiary || !selectedVault || !contractAddress || !address || isAmountExceeded) return;
    
    setIsSimulating(true);
    setSimulationUrl(null);
    
    try {
      // Encode the deposit transaction
      const depositData = encodeFunctionData({
        abi: YIELD_REDIRECTOR_ABI,
        functionName: 'deposit',
        args: [selectedVault.address as `0x${string}`, parseEther(amount), beneficiary as `0x${string}`]
      });

      // // Create state objects to give the user WETH and approve the contract
      // const wethAmountHex = parseEther(amount).toString(16);
      // const userBalanceSlot = `0x${BigInt(`0x${address.slice(2).padStart(64, '0')}` + `0x${(3).toString(16).padStart(64, '0')}`).toString(16).padStart(64, '0')}`;
      // const allowanceSlot = `0x${BigInt(`0x${address.slice(2).padStart(64, '0')}` + `0x${(4).toString(16).padStart(64, '0')}`).toString(16).padStart(64, '0')}${contractAddress.slice(2).padStart(64, '0')}`;
      
      const stateObjects = {
        // [wethAddress]: {
        //   storage: {
        //     // User WETH balance
        //     [userBalanceSlot]: `0x${wethAmountHex.padStart(64, '0')}`,
        //     // WETH allowance for contract
        //     [allowanceSlot]: `0x${wethAmountHex.padStart(64, '0')}`
        //   }
        // }
      };

      console.log('Simulating deposit with state objects:', stateObjects);

      const result = await simulate(chainId, {
        from: address,
        to: contractAddress,
        data: depositData,
        state_objects: stateObjects
      });

      if (result.data && result.data.simulation) {
        const simUrl = getSimulationURL(result.data.simulation.id);
        setSimulationUrl(simUrl);
        console.log('Simulation successful:', simUrl);
        console.log('Full simulation result:', result.data);
      } else {
        console.error('Simulation failed:', result.error);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="card p-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Make a Deposit</h3>
          <p className="text-sm text-gray-500">Start generating yields for your chosen cause</p>
          <div className="mt-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-600">
              Current Chain ID: {chainId} | {availableVaults.length} vault{availableVaults.length !== 1 ? 's' : ''} total
              {availableVaults.some(v => v.isLoading) && (
                <span className="ml-2 animate-pulse">📊 Loading live data...</span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Vault Selection</span>
              {availableVaults.some(v => v.liveAPY) && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  🟢 Live Data
                </span>
              )}
            </span>
          </label>
          <select 
            className="input-field"
            value={selectedVault?.address || ''}
            onChange={(e) => {
              const vault = availableVaults.find(v => v.address === e.target.value);
              setSelectedVault(vault || null);
            }}
          >
            <option value="">Select a vault...</option>
            {availableVaults.map((vault) => {
              const displayAPY = vault.liveAPY || (vault.isLoading ? 'Loading...' : vault.apy);
              const chainLabel = vault.chain === 8453 ? ' [Base]' : vault.chain === 1 ? ' [Ethereum]' : '';
              const statusIndicator = vault.hasError ? ' ⚠️' : vault.liveAPY ? ' 🟢' : '';
              
              return (
                <option key={vault.address} value={vault.address}>
                  {vault.name} (APY: {displayAPY}) - {vault.asset}{chainLabel}{statusIndicator}
                </option>
              );
            })}
          </select>
          {selectedVault && (
            <VaultInfo vault={selectedVault} currentChainId={chainId} />
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span>Deposit Amount ({selectedVault?.asset || 'ETH'}) - Max: {MAX_DEPOSIT}</span>
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              max={MAX_DEPOSIT}
              step="0.001"
              className={`input-field pl-4 pr-16 ${isAmountExceeded ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-500">
              {selectedVault?.asset || 'ETH'}
            </div>
          </div>
          {isAmountExceeded && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Maximum deposit amount is {MAX_DEPOSIT} ETH. Please enter a smaller amount.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Select Beneficiary</span>
            </span>
          </label>
          <select 
            value={selectedCause}
            onChange={(e) => {
              setSelectedCause(e.target.value);
              setBeneficiary(communityAddresses[e.target.value] || '');
            }}
            className="input-field"
          >
            <option value="">Choose a cause...</option>
            <option value="CommonsHub">💝 CommonsHub</option>
            <option value="gitcoin">🌱 Gitcoin Grants</option>
            <option value="custom">🎯 Custom Address</option>
          </select>
        </div>

        {selectedCause === 'custom' && (
          <div className="fade-in-up">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Beneficiary Address</span>
              </span>
            </label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="0x..."
              className="input-field font-mono text-sm"
            />
          </div>
        )}

        {needsApproval && amount && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              You need to approve WETH spending before depositing. This is a one-time step.
            </p>
          </div>
        )}

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isPending || isConfirming || !amount || !selectedVault || (selectedVault && selectedVault.chain !== chainId) || isAmountExceeded}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isPending ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Confirming...</span>
              </span>
            ) : isConfirming ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-pulse w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              `Approve ${amount} WETH`
            )}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleDeposit}
              disabled={isPending || isConfirming || !amount || !beneficiary || !selectedVault || (selectedVault && selectedVault.chain !== chainId) || isAmountExceeded}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isPending ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Confirming...</span>
              </span>
            ) : isConfirming ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-pulse w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              'Deposit & Start Generating Yields'
            )}
            </button>
            <button
              onClick={handleSimulateDeposit}
              disabled={isSimulating || !amount || !beneficiary || !selectedVault || isAmountExceeded}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Simulate on Tenderly"
            >
              {isSimulating ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                '🔍'
              )}
            </button>
          </div>
        )}

        {simulationUrl && (
          <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <p className="text-sm text-purple-700 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Simulation successful! 
              <a 
                href={simulationUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 underline hover:no-underline"
              >
                View on Tenderly →
              </a>
            </p>
          </div>
        )}

        {isSuccess && transactionType === 'deposit' && (
          <div className="success-alert fade-in-up">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Successfully deposited!</p>
              <p className="text-sm">Your yields will be automatically redirected to the beneficiary.</p>
            </div>
          </div>
        )}

        {isSuccess && transactionType === 'approval' && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              WETH approval successful! You can now make your deposit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}