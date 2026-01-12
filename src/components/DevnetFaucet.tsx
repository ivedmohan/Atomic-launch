'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { getConfig } from '@/lib/config';
import {
  Droplets,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export function DevnetFaucet() {
  const { publicKey } = useWallet();
  const [isRequesting, setIsRequesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const config = getConfig();

  // Only show on devnet
  if (!config.isDevnet) return null;

  const requestAirdrop = async () => {
    if (!publicKey) {
      setStatus('error');
      setMessage('Please connect your wallet first');
      return;
    }

    setIsRequesting(true);
    setStatus('idle');
    setMessage('');

    try {
      const connection = new Connection(config.rpcUrl, 'confirmed');

      // Request 2 SOL airdrop (max allowed)
      const signature = await connection.requestAirdrop(
        publicKey,
        2 * LAMPORTS_PER_SOL
      );

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setStatus('success');
      setMessage(`Received 2 SOL! Tx: ${signature.slice(0, 20)}...`);

    } catch (err) {
      console.error('Airdrop error:', err);
      setStatus('error');

      // Handle rate limiting
      if (err instanceof Error && err.message.includes('429')) {
        setMessage('Rate limited! Try again in a minute or use the faucet link below.');
      } else {
        setMessage(err instanceof Error ? err.message : 'Airdrop failed');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card variant="glow" className="border-[#4488ff]/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#4488ff]/20 to-[#4488ff]/5">
            <Droplets className="w-6 h-6 text-[#4488ff]" />
          </div>
          <div>
            <CardTitle className="text-[#4488ff]">Devnet Faucet</CardTitle>
            <CardDescription>Get free SOL for testing</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-[#8888aa]">
          You're on <span className="text-[#4488ff] font-semibold">Devnet</span>.
          Get free SOL to test wallet funding and transactions.
        </p>

        {status === 'success' && (
          <div className="flex items-center gap-3 p-3 bg-[#00ff88]/10 rounded-xl border border-[#00ff88]/30">
            <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
            <span className="text-[#00ff88] text-sm">{message}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-3 p-3 bg-[#ff4444]/10 rounded-xl border border-[#ff4444]/30">
            <AlertCircle className="w-5 h-5 text-[#ff4444]" />
            <span className="text-[#ff4444] text-sm">{message}</span>
          </div>
        )}

        <Button
          onClick={requestAirdrop}
          isLoading={isRequesting}
          disabled={!publicKey}
          className="w-full"
          variant="secondary"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Requesting Airdrop...
            </>
          ) : (
            <>
              <Droplets className="w-4 h-4 mr-2" />
              Request 2 Free SOL
            </>
          )}
        </Button>

        {!publicKey && (
          <p className="text-center text-xs text-[#6666aa]">
            Connect wallet to request airdrop
          </p>
        )}

        <div className="pt-2 border-t border-[#1f1f35]">
          <p className="text-xs text-[#6666aa] mb-2">Alternative faucets:</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#4488ff] hover:underline"
            >
              Solana Faucet <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://solfaucet.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#4488ff] hover:underline"
            >
              Sol Faucet <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

