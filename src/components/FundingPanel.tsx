'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { createFundingTransactions } from '@/lib/solana/bundler';
import { getConfig } from '@/lib/config';
import { PLATFORM_FEE_SOL, GAS_BUFFER_SOL } from '@/types';
import { PrivacyMethod, getProviderDisplayName } from '@/lib/privacy';
import {
  Coins,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  FlaskConical,
  SkipForward,
  Shield,
} from 'lucide-react';

interface FundingPanelProps {
  privacyMethod?: PrivacyMethod;
}

export function FundingPanel({ privacyMethod = 'none' }: FundingPanelProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const {
    burnerWallets,
    launchConfig,
    setLaunchConfig,
    getTotalFundingRequired,
    setWalletFunded,
    setLaunchState,
    updateWalletBalance,
  } = useWalletStore();

  const [isFunding, setIsFunding] = useState(false);
  const [fundingStatus, setFundingStatus] = useState<'idle' | 'shielding' | 'distributing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const usePrivacy = privacyMethod !== 'none';

  const config = getConfig();

  // On devnet, no platform fee
  const platformFee = config.isMainnet ? PLATFORM_FEE_SOL : 0;
  const totalRequired = config.isMainnet
    ? getTotalFundingRequired()
    : launchConfig.totalBuyAmount + (GAS_BUFFER_SOL * burnerWallets.length);
  const gasEstimate = GAS_BUFFER_SOL * burnerWallets.length;

  const [fundingProgress, setFundingProgress] = useState({ current: 0, total: 0 });

  const handleFund = async () => {
    if (!publicKey || !sendTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (burnerWallets.length === 0) {
      alert('Please generate burner wallets first');
      return;
    }

    setIsFunding(true);
    setErrorMessage('');

    // Step 1: Shield if privacy is enabled
    if (usePrivacy) {
      setFundingStatus('shielding');
      setLaunchState({ step: 'shielding' });

      try {
        console.log(`Shielding ${totalRequired} SOL via ${privacyMethod}...`);

        const shieldResponse = await fetch('/api/shield', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: privacyMethod,
            lamports: Math.floor(totalRequired * 1e9),
          }),
        });

        const shieldResult = await shieldResponse.json();

        if (!shieldResult.success) {
          throw new Error(shieldResult.error || 'Shielding failed');
        }

        console.log('Shielding complete!');
      } catch (err) {
        console.error('Shield error:', err);
        setFundingStatus('error');
        const errorMsg = err instanceof Error ? err.message : 'Shielding failed';
        setErrorMessage(errorMsg);
        setLaunchState({ step: 'error', error: errorMsg });
        setIsFunding(false);
        return;
      }
    }

    // Step 2: Distribute to burner wallets
    setFundingStatus('distributing');
    setLaunchState({ step: 'funding' });

    try {
      console.log('Creating funding transactions for', burnerWallets.length, 'wallets');
      console.log('Total amount:', totalRequired, 'SOL');

      // Validate burner wallets before creating transaction
      for (const wallet of burnerWallets) {
        if (!wallet.publicKey || wallet.publicKey.length < 32) {
          throw new Error(`Invalid burner wallet at index ${wallet.index}`);
        }
      }

      // Create the funding transactions (may be multiple if > 20 wallets)
      const fundingTxs = await createFundingTransactions(
        publicKey,
        burnerWallets,
        totalRequired
      );

      console.log(`Created ${fundingTxs.length} funding transaction(s)`);
      setFundingProgress({ current: 0, total: fundingTxs.length });

      const signatures: string[] = [];

      // Send each transaction sequentially
      for (let i = 0; i < fundingTxs.length; i++) {
        console.log(`Sending transaction ${i + 1}/${fundingTxs.length}...`);
        setFundingProgress({ current: i + 1, total: fundingTxs.length });

        // Use sendTransaction from wallet adapter - handles signing internally
        const signature = await sendTransaction(fundingTxs[i], connection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        console.log(`Transaction ${i + 1} sent:`, signature);
        signatures.push(signature);

        // Wait for confirmation before sending next
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction ${i + 1} failed on-chain`);
        }

        console.log(`Transaction ${i + 1} confirmed!`);
      }

      console.log('All transactions confirmed!');

      // Mark all wallets as funded and update their balances
      const amountPerWallet = totalRequired / burnerWallets.length;
      burnerWallets.forEach((_, index) => {
        setWalletFunded(index, true);
        updateWalletBalance(index, amountPerWallet * 1e9); // Convert to lamports
      });

      setFundingStatus('success');
      setLaunchState({ step: 'idle', txSignature: signatures[signatures.length - 1] });

    } catch (err) {
      console.error('Funding error:', err);
      setFundingStatus('error');
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(errorMsg);
      setLaunchState({ step: 'error', error: errorMsg });
    } finally {
      setIsFunding(false);
      setFundingProgress({ current: 0, total: 0 });
    }
  };

  // Mock funding for test mode
  const handleMockFund = async () => {
    setIsFunding(true);
    setFundingStatus('idle');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark all wallets as funded with fake balances
    const amountPerWallet = (totalRequired / burnerWallets.length) * 1e9; // Convert to lamports
    burnerWallets.forEach((_, index) => {
      setWalletFunded(index, true);
      updateWalletBalance(index, amountPerWallet);
    });

    setFundingStatus('success');
    setLaunchState({ step: 'idle' });
    setIsFunding(false);
  };

  const allFunded = burnerWallets.length > 0 && burnerWallets.every(w => w.funded);

  return (
    <Card variant="gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#ffaa00]/20 to-[#ffaa00]/5">
              <Coins className="w-6 h-6 text-[#ffaa00]" />
            </div>
            <div>
              <CardTitle>Fund Wallets</CardTitle>
              <CardDescription>
                {config.isMockMode
                  ? '🧪 Test Mode - Simulated funding'
                  : 'Distribute SOL to your burner wallets'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.isMockMode && (
              <Badge variant="warning">
                <FlaskConical className="w-3 h-3 mr-1" />
                Mock
              </Badge>
            )}
            {allFunded && (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Funded
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mock Mode Notice */}
        {config.isMockMode && (
          <div className="bg-[#ffaa00]/10 rounded-xl p-4 border border-[#ffaa00]/30">
            <div className="flex items-start gap-3">
              <FlaskConical className="w-5 h-5 text-[#ffaa00] mt-0.5" />
              <div className="text-sm">
                <p className="text-[#ffaa00] font-medium mb-1">Test Mode</p>
                <p className="text-[#aa8844]">
                  Click "Skip Funding" to simulate funded wallets without spending any SOL.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Buy Amount Input */}
        <div>
          <Input
            label="Total Buy Amount (SOL)"
            type="number"
            min={0.1}
            step={0.1}
            value={launchConfig.totalBuyAmount}
            onChange={(e) => setLaunchConfig({ totalBuyAmount: parseFloat(e.target.value) || 0 })}
            icon={<Coins className="w-4 h-4" />}
          />
          <p className="text-xs text-[#6666aa] mt-2">
            This amount will be split across {burnerWallets.length} wallets
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-[#0f0f1a] rounded-xl p-4 border border-[#1f1f35]">
          <h4 className="text-sm font-semibold text-white mb-3">Cost Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#8888aa]">Buy Amount</span>
              <span className="text-white font-mono">{launchConfig.totalBuyAmount.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8888aa]">Gas Buffer ({burnerWallets.length} wallets)</span>
              <span className="text-white font-mono">{gasEstimate.toFixed(3)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8888aa]">Platform Fee</span>
              <span className={`font-mono ${!config.isMainnet ? 'text-[#6666aa] line-through' : 'text-white'}`}>
                {PLATFORM_FEE_SOL} SOL
              </span>
              {!config.isMainnet && <span className="text-[#00ff88] font-mono ml-2">FREE</span>}
            </div>
            <div className="border-t border-[#2a2a4a] my-2" />
            <div className="flex justify-between">
              <span className="text-white font-semibold">Total Required</span>
              <span className={`font-mono font-bold text-lg ${config.isMockMode ? 'text-[#ffaa00]' : config.isDevnet ? 'text-[#4488ff]' : 'text-[#00ff88]'}`}>
                {config.isMockMode ? '0.00 SOL (Test)' : `${totalRequired.toFixed(3)} SOL`}
              </span>
            </div>
          </div>
        </div>

        {/* Slippage Setting */}
        <div>
          <Input
            label="Base Slippage (%)"
            type="number"
            min={1}
            max={50}
            value={launchConfig.slippagePercent}
            onChange={(e) => setLaunchConfig({ slippagePercent: parseFloat(e.target.value) || 10 })}
            icon={<Zap className="w-4 h-4" />}
          />
          <p className="text-xs text-[#6666aa] mt-2">
            Dynamic slippage: Later wallets get up to 15% additional slippage
          </p>
        </div>

        {/* Status Messages */}
        {fundingStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-[#00ff88]/10 rounded-xl border border-[#00ff88]/30">
            <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
            <span className="text-[#00ff88] text-sm font-medium">
              {config.isMockMode ? '🧪 Mock funding complete!' : 'All wallets funded successfully!'}
            </span>
          </div>
        )}

        {fundingStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-[#ff4444]/10 rounded-xl border border-[#ff4444]/30">
            <AlertCircle className="w-5 h-5 text-[#ff4444]" />
            <span className="text-[#ff4444] text-sm">
              {errorMessage || 'Funding failed. Please try again.'}
            </span>
          </div>
        )}

        {/* Fund Buttons */}
        {config.isMockMode ? (
          <Button
            onClick={handleMockFund}
            isLoading={isFunding}
            disabled={burnerWallets.length === 0 || allFunded}
            size="lg"
            className="w-full"
            variant="secondary"
          >
            {isFunding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Simulating...
              </>
            ) : allFunded ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mock Funded
              </>
            ) : (
              <>
                <SkipForward className="w-4 h-4 mr-2" />
                Skip Funding (Test Mode)
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleFund}
            isLoading={isFunding}
            disabled={!publicKey || !sendTransaction || burnerWallets.length === 0 || allFunded}
            size="lg"
            className="w-full"
          >
            {isFunding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {fundingStatus === 'shielding'
                  ? `Shielding via ${getProviderDisplayName(privacyMethod)}...`
                  : fundingProgress.total > 1
                    ? `Distributing... (${fundingProgress.current}/${fundingProgress.total} txns)`
                    : 'Distributing to Wallets...'}
              </>
            ) : allFunded ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Wallets Funded
              </>
            ) : (
              <>
                {usePrivacy && <Shield className="w-4 h-4 mr-2" />}
                {usePrivacy ? 'Shield & Fund' : 'Fund'} {burnerWallets.length} Wallets
                {burnerWallets.length > 20 && (
                  <span className="text-xs opacity-70 ml-1">
                    ({Math.ceil(burnerWallets.length / 20)} txns)
                  </span>
                )}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}

        {!config.isMockMode && !publicKey && (
          <p className="text-center text-sm text-[#6666aa]">
            Connect your wallet to fund burner wallets
          </p>
        )}
      </CardContent>
    </Card>
  );
}
