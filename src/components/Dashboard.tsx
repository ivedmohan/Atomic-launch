'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getConnection } from '@/lib/solana/connection';
import { shortenAddress, formatSOL } from '@/lib/utils';
import { PublicKey } from '@solana/web3.js';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Loader2,
  DollarSign,
  Users,
  Wallet,
  ArrowDownRight,
} from 'lucide-react';

export function Dashboard() {
  const { 
    burnerWallets, 
    tokenMint, 
    holdings,
    setHoldings,
    updateWalletBalance,
    launchState,
  } = useWalletStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  const refreshBalances = async () => {
    if (burnerWallets.length === 0) return;
    
    setIsRefreshing(true);
    const connection = getConnection();
    
    try {
      let total = 0;
      
      for (const wallet of burnerWallets) {
        const balance = await connection.getBalance(new PublicKey(wallet.publicKey));
        updateWalletBalance(wallet.index, balance);
        total += balance;
      }
      
      setTotalValue(total);
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (burnerWallets.length > 0) {
      refreshBalances();
    }
  }, [burnerWallets.length]);

  const handleSellAll = async () => {
    if (!tokenMint) {
      alert('No token to sell');
      return;
    }

    setIsSelling(true);
    
    try {
      const response = await fetch('/api/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintAddress: tokenMint,
          wallets: burnerWallets.map(w => ({
            publicKey: w.publicKey,
            secretKey: Array.from(w.secretKey),
          })),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Sell failed');
      }

      // Refresh balances after sell
      await refreshBalances();
      
    } catch (err) {
      console.error('Sell error:', err);
      alert(`Sell failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSelling(false);
    }
  };

  const fundedWallets = burnerWallets.filter(w => w.funded).length;
  const totalSOL = burnerWallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <Card variant="gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#4488ff]/20 to-[#4488ff]/5">
              <PieChart className="w-6 h-6 text-[#4488ff]" />
            </div>
            <div>
              <CardTitle>Holdings Dashboard</CardTitle>
              <CardDescription>Monitor and manage your positions</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshBalances}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f0f1a] rounded-xl p-4 border border-[#1f1f35]">
            <div className="flex items-center gap-2 text-[#6666aa] text-sm mb-2">
              <Wallet className="w-4 h-4" />
              Total Wallets
            </div>
            <p className="text-2xl font-bold text-white">{burnerWallets.length}</p>
          </div>
          
          <div className="bg-[#0f0f1a] rounded-xl p-4 border border-[#1f1f35]">
            <div className="flex items-center gap-2 text-[#6666aa] text-sm mb-2">
              <Users className="w-4 h-4" />
              Funded
            </div>
            <p className="text-2xl font-bold text-[#00ff88]">{fundedWallets}</p>
          </div>
          
          <div className="bg-[#0f0f1a] rounded-xl p-4 border border-[#1f1f35]">
            <div className="flex items-center gap-2 text-[#6666aa] text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              Total SOL
            </div>
            <p className="text-2xl font-bold text-white font-mono">
              {formatSOL(totalSOL)}
            </p>
          </div>
          
          <div className="bg-[#0f0f1a] rounded-xl p-4 border border-[#1f1f35]">
            <div className="flex items-center gap-2 text-[#6666aa] text-sm mb-2">
              {totalSOL > totalValue ? (
                <TrendingDown className="w-4 h-4 text-[#ff4444]" />
              ) : (
                <TrendingUp className="w-4 h-4 text-[#00ff88]" />
              )}
              Status
            </div>
            <Badge variant={launchState.step === 'completed' ? 'success' : 'info'}>
              {launchState.step === 'completed' ? 'Active' : launchState.step}
            </Badge>
          </div>
        </div>

        {/* Token Info */}
        {tokenMint && (
          <div className="bg-gradient-to-r from-[#00ff88]/5 to-[#4488ff]/5 rounded-xl p-4 border border-[#00ff88]/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6666aa] mb-1">Active Token</p>
                <p className="font-mono text-[#00ff88]">{shortenAddress(tokenMint, 8)}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://pump.fun/${tokenMint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#00ff88]/10 text-[#00ff88] text-sm rounded-lg hover:bg-[#00ff88]/20 transition-colors"
                >
                  Pump.fun
                </a>
                <a
                  href={`https://dexscreener.com/solana/${tokenMint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#4488ff]/10 text-[#4488ff] text-sm rounded-lg hover:bg-[#4488ff]/20 transition-colors"
                >
                  DexScreener
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Holdings List */}
        {burnerWallets.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            <div className="flex items-center justify-between text-xs text-[#6666aa] px-3 py-2">
              <span>WALLET</span>
              <span>SOL BALANCE</span>
            </div>
            {burnerWallets.map((wallet) => (
              <div
                key={wallet.publicKey}
                className="flex items-center justify-between p-3 bg-[#0f0f1a] rounded-xl border border-[#1f1f35]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4488ff]/20 to-[#4488ff]/5 flex items-center justify-center text-xs font-mono text-[#4488ff]">
                    #{wallet.index + 1}
                  </div>
                  <span className="font-mono text-sm text-white">
                    {shortenAddress(wallet.publicKey, 4)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-white">
                    {formatSOL(wallet.balance)} SOL
                  </span>
                  <Badge variant={wallet.funded ? 'success' : 'default'} className="text-xs">
                    {wallet.funded ? 'Active' : 'Empty'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sell All Button */}
        {tokenMint && launchState.step === 'completed' && (
          <Button
            onClick={handleSellAll}
            isLoading={isSelling}
            variant="danger"
            size="lg"
            className="w-full"
          >
            {isSelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Selling All Positions...
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4 mr-2" />
                Sell All Positions
              </>
            )}
          </Button>
        )}

        {burnerWallets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#6666aa]">Generate wallets to see your holdings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


