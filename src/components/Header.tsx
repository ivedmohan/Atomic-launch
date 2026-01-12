'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/Button';
import { shortenAddress, formatSOL } from '@/lib/utils';
import { getConfig } from '@/lib/config';
import { getConnection } from '@/lib/solana/connection';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  Rocket, 
  Wallet, 
  LogOut,
  Zap,
  FlaskConical,
  Globe,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

function NetworkBadge() {
  const config = getConfig();
  
  const networkConfig = {
    mainnet: {
      label: 'Solana Mainnet',
      color: 'bg-[#00ff88]',
      borderColor: 'border-[#00ff88]/30',
      icon: <Zap className="w-3 h-3 text-[#ffaa00]" />,
    },
    devnet: {
      label: 'Devnet',
      color: 'bg-[#4488ff]',
      borderColor: 'border-[#4488ff]/30',
      icon: <Globe className="w-3 h-3 text-[#4488ff]" />,
    },
    mock: {
      label: '🧪 Test Mode',
      color: 'bg-[#ffaa00]',
      borderColor: 'border-[#ffaa00]/30',
      icon: <FlaskConical className="w-3 h-3 text-[#ffaa00]" />,
    },
  };

  const current = networkConfig[config.network];

  return (
    <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a2e] border ${current.borderColor}`}>
      <div className={`w-2 h-2 rounded-full ${current.color} ${config.isMainnet ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-[#8888aa]">{current.label}</span>
      {current.icon}
    </div>
  );
}

function WalletInfo() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const config = getConfig();

  const fetchBalance = async () => {
    if (!publicKey || config.isMockMode) return;
    
    setIsLoading(true);
    try {
      const connection = getConnection();
      const bal = await connection.getBalance(publicKey);
      setBalance(bal);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const handleCopy = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = config.isDevnet 
    ? `https://explorer.solana.com/address/${publicKey?.toBase58()}?cluster=devnet`
    : `https://solscan.io/account/${publicKey?.toBase58()}`;

  if (!publicKey) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-[#12121f] border border-[#1f1f35] hover:border-[#2a2a4a] transition-colors"
      >
        <div className="flex flex-col items-end">
          <span className="font-mono text-sm text-white">
            {shortenAddress(publicKey.toBase58())}
          </span>
          {balance !== null && !config.isMockMode && (
            <span className="text-xs text-[#00ff88] font-mono">
              {(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </span>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88]/20 to-[#4488ff]/20 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-[#00ff88]" />
        </div>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-[#12121f] border border-[#1f1f35] rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Balance Section */}
            <div className="p-4 border-b border-[#1f1f35]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#6666aa] uppercase tracking-wider">Balance</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); fetchBalance(); }}
                  className="p-1 hover:bg-[#1a1a2e] rounded transition-colors"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-3 h-3 text-[#6666aa] ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {config.isMockMode 
                  ? '∞ SOL' 
                  : balance !== null 
                    ? `${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
                    : '...'
                }
              </p>
              {config.isDevnet && (
                <p className="text-xs text-[#4488ff] mt-1">Devnet SOL (not real)</p>
              )}
            </div>

            {/* Address Section */}
            <div className="p-4 border-b border-[#1f1f35]">
              <span className="text-xs text-[#6666aa] uppercase tracking-wider">Wallet Address</span>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-xs text-white font-mono bg-[#0a0a12] px-2 py-1.5 rounded overflow-hidden text-ellipsis">
                  {publicKey.toBase58()}
                </code>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  className="p-1.5 hover:bg-[#1a1a2e] rounded transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#00ff88]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#6666aa]" />
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#8888aa] hover:text-white hover:bg-[#1a1a2e] rounded-lg transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Header() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const config = getConfig();

  const handleConnect = () => {
    setVisible(true);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#1f1f35] bg-[#0a0a12]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00ff88] blur-xl opacity-30 rounded-full" />
              <div className="relative p-2 rounded-xl bg-gradient-to-br from-[#00ff88]/20 to-[#00ff88]/5 border border-[#00ff88]/30">
                <Rocket className="w-6 h-6 text-[#00ff88]" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Atomic<span className="text-[#00ff88]">Launch</span>
              </h1>
              <p className="text-[10px] text-[#6666aa] uppercase tracking-widest">
                {config.isMockMode ? 'Test Mode' : config.isDevnet ? 'Devnet Testing' : 'Jito-Powered Bundler'}
              </p>
            </div>
          </div>

          {/* Network Badge */}
          <NetworkBadge />

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {connected && publicKey ? (
              <div className="flex items-center gap-2">
                <WalletInfo />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                  className="text-[#ff4444] hover:bg-[#ff4444]/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect} size="md">
                <Wallet className="w-4 h-4 mr-2" />
                {config.isMockMode ? 'Connect (Optional)' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
