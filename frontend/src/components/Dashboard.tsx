import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export default function Dashboard() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });

  return (
    <div className="card p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Your Dashboard</h2>
          <p className="text-gray-500 mt-1">Track your deposits and yield generation</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Wallet Balance</p>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)}` : '0.0000'}
          </p>
          <p className="text-sm text-gray-500 mt-1">ETH</p>
        </div>
        
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Deposited</p>
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">0.0000</p>
          <p className="text-sm text-gray-500 mt-1">ETH</p>
        </div>
        
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Yield Generated</p>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">0.0000</p>
          <p className="text-sm text-gray-500 mt-1">ETH</p>
        </div>
      </div>
      
      {/* Progress indicator */}
      <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Start Generating Yields for Good</h3>
            <p className="text-sm text-gray-600 mt-1">Make your first deposit to begin supporting causes while earning returns</p>
          </div>
        </div>
      </div>
    </div>
  );
}