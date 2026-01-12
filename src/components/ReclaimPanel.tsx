'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getConfig } from '@/lib/config';
import { formatSOL, shortenAddress } from '@/lib/utils';
import { 
  ArrowDownToLine,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { getConnection } from '@/lib/solana/connection';
import { PublicKey } from '@solana/web3.js';

interface ReclaimResult {
  wallet: string;
  success: boolean;
  amount?: number;
  signature?: string;
  error?: string;
}

export function ReclaimPanel() {
  const { publicKey } = useWallet();
  const { burnerWallets, updateWalletBalance, setWalletFunded } = useWalletStore();
  
  const [isReclaiming, setIsReclaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reclaimResults, setReclaimResults] = useState<ReclaimResult[] | null>(null);
  const [totalReclaimed, setTotalReclaimed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const config = getConfig();
  
  // Calculate total balance across all burner wallets
  const totalBalance = burnerWallets.reduce((acc, w) => acc + w.balance, 0);
  const walletsWithBalance = burnerWallets.filter(w => w.balance > 5000).length;

  const refreshBalances = async () => {
    if (burnerWallets.length === 0) return;
    
    setIsRefreshing(true);
    const connection = getConnection();
    
    try {
      for (const wallet of burnerWallets) {
        const balance = await connection.getBalance(new PublicKey(wallet.publicKey));
        updateWalletBalance(wallet.index, balance);
      }
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReclaim = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (burnerWallets.length === 0) {
      setError('No burner wallets to reclaim from');
      return;
    }

    if (config.isMockMode) {
      // Mock reclaim
      setIsReclaiming(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResults: ReclaimResult[] = burnerWallets.map(w => ({
        wallet: w.publicKey,
        success: true,
        amount: w.balance / 1e9,
        signature: `mock-sig-${Math.random().toString(36).substring(7)}`,
      }));
      
      setReclaimResults(mockResults);
      setTotalReclaimed(totalBalance / 1e9);
      
      // Reset wallet balances
      burnerWallets.forEach((_, index) => {
        updateWalletBalance(index, 0);
        setWalletFunded(index, false);
      });
      
      setIsReclaiming(false);
      return;
    }

    // Real reclaim
    setIsReclaiming(true);
    setError(null);
    setReclaimResults(null);

    try {
      const response = await fetch('/api/reclaim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationWallet: publicKey.toBase58(),
          wallets: burnerWallets.map(w => ({
            publicKey: w.publicKey,
            secretKey: Array.from(w.secretKey),
          })),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Reclaim failed');
      }

      setReclaimResults(result.results);
      setTotalReclaimed(result.totalReclaimed);

      // Update wallet balances
      for (const r of result.results) {
        if (r.success) {
          const walletIndex = burnerWallets.findIndex(w => w.publicKey === r.wallet);
          if (walletIndex >= 0) {
            updateWalletBalance(walletIndex, 0);
            setWalletFunded(walletIndex, false);
          }
        }
      }

    } catch (err) {
      console.error('Reclaim error:', err);
      setError(err instanceof Error ? err.message : 'Reclaim failed');
    } finally {
      setIsReclaiming(false);
    }
  };

  return (
    <Card variant="gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00ff88]/20 to-[#00ff88]/5">
              <ArrowDownToLine className="w-6 h-6 text-[#00ff88]" />
            </div>
            <div>
              <CardTitle>Reclaim SOL</CardTitle>
              <CardDescription>
                Withdraw remaining SOL from burner wallets
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshBalances}
            disabled={isRefreshing || burnerWallets.length === 0}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Balance Summary */}
        <div className="bg-[#0f0f1a] rounded-xl p-4 border border-[#1f1f35]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#6666aa] mb-1">Total Reclaimable</p>
              <p className="text-2xl font-bold text-[#00ff88] font-mono">
                {formatSOL(totalBalance)} SOL
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6666aa] mb-1">Wallets with Balance</p>
              <p className="text-2xl font-bold text-white">
                {walletsWithBalance} / {burnerWallets.length}
              </p>
            </div>
          </div>
        </div>

        {/* Destination Wallet */}
        {publicKey && (
          <div className="flex items-center gap-3 p-3 bg-[#1a1a2e] rounded-xl border border-[#2a2a4a]">
            <Wallet className="w-5 h-5 text-[#00ff88]" />
            <div className="flex-1">
              <p className="text-xs text-[#6666aa]">Destination Wallet</p>
              <p className="font-mono text-sm text-white">
                {shortenAddress(publicKey.toBase58(), 8)}
              </p>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        )}

        {/* Results */}
        {reclaimResults && reclaimResults.length > 0 && (
          <div className="bg-[#00ff88]/10 rounded-xl p-4 border border-[#00ff88]/30">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
              <span className="text-[#00ff88] font-semibold">
                Reclaimed {totalReclaimed.toFixed(6)} SOL!
              </span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {reclaimResults.map((result, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-[#8888aa]">
                    {shortenAddress(result.wallet, 4)}
                  </span>
                  {result.success ? (
                    <span className="text-[#00ff88]">
                      +{result.amount?.toFixed(6)} SOL
                    </span>
                  ) : (
                    <span className="text-[#ff4444]">
                      {result.error || 'Failed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-[#ff4444]/10 rounded-xl border border-[#ff4444]/30">
            <AlertCircle className="w-5 h-5 text-[#ff4444]" />
            <span className="text-[#ff4444] text-sm">{error}</span>
          </div>
        )}

        {/* Reclaim Button */}
        <Button
          onClick={handleReclaim}
          isLoading={isReclaiming}
          disabled={!publicKey || burnerWallets.length === 0 || totalBalance <= 5000}
          size="lg"
          className="w-full"
          variant={totalBalance > 0 ? 'primary' : 'secondary'}
        >
          {isReclaiming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Reclaiming SOL...
            </>
          ) : totalBalance <= 5000 ? (
            <>
              <Coins className="w-4 h-4 mr-2" />
              No SOL to Reclaim
            </>
          ) : (
            <>
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Reclaim {formatSOL(totalBalance)} SOL
            </>
          )}
        </Button>

        {!publicKey && (
          <p className="text-center text-sm text-[#6666aa]">
            Connect your wallet to reclaim SOL
          </p>
        )}

        {/* Info */}
        <div className="text-xs text-[#6666aa] bg-[#0f0f1a] rounded-lg p-3">
          <p className="font-medium text-[#8888aa] mb-1">💡 How it works:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Transfers remaining SOL from each burner wallet back to your main wallet</li>
            <li>Small transaction fees apply (~0.000005 SOL per wallet)</li>
            <li>Empty wallets are skipped automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


