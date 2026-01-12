'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PrivacyMethod, getProviderDisplayName } from '@/lib/privacy';
import { Shield, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface PrivacyFundingPanelProps {
    privacyMethod: PrivacyMethod;
    totalAmount: number; // in SOL
    onShielded: () => void;
    disabled?: boolean;
}

type ShieldingStatus = 'idle' | 'shielding' | 'shielded' | 'error';

export function PrivacyFundingPanel({
    privacyMethod,
    totalAmount,
    onShielded,
    disabled
}: PrivacyFundingPanelProps) {
    const { publicKey } = useWallet();
    const [status, setStatus] = useState<ShieldingStatus>('idle');
    const [shieldedBalance, setShieldedBalance] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleShield = async () => {
        if (!publicKey) {
            setError('Wallet not connected');
            return;
        }

        setStatus('shielding');
        setError(null);

        try {
            const lamports = Math.floor(totalAmount * 1e9);

            // Call server-side API that has access to the SDK
            const response = await fetch('/api/shield', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: privacyMethod,
                    lamports,
                    // Note: In production, this would use proper wallet signing
                    // For demo, we show the flow
                }),
            });

            const result = await response.json();

            if (result.success) {
                setShieldedBalance(totalAmount);
                setStatus('shielded');
                onShielded();
            } else {
                throw new Error(result.error || 'Shielding failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
        }
    };

    // Skip rendering if no privacy method selected
    if (privacyMethod === 'none') {
        return null;
    }

    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Shield Your SOL</h3>
                    <p className="text-sm text-zinc-400">
                        Using {getProviderDisplayName(privacyMethod)}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Amount display */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Amount to Shield</span>
                        <span className="text-xl font-bold text-white">{totalAmount.toFixed(3)} SOL</span>
                    </div>
                    {shieldedBalance > 0 && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-700">
                            <span className="text-zinc-400">Shielded Balance</span>
                            <span className="text-green-400">{shieldedBalance.toFixed(3)} SOL</span>
                        </div>
                    )}
                </div>

                {/* Status indicator */}
                {status === 'shielding' && (
                    <div className="flex items-center gap-2 text-yellow-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Shielding SOL... This may take a moment</span>
                    </div>
                )}

                {status === 'shielded' && (
                    <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>SOL shielded successfully!</span>
                    </div>
                )}

                {status === 'error' && error && (
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Action button */}
                <Button
                    onClick={handleShield}
                    disabled={disabled || status === 'shielding' || status === 'shielded' || !publicKey}
                    className="w-full"
                >
                    {status === 'shielding' ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Shielding...
                        </>
                    ) : status === 'shielded' ? (
                        <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Shielded
                        </>
                    ) : (
                        <>
                            <Shield className="w-4 h-4 mr-2" />
                            Shield {totalAmount.toFixed(3)} SOL
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>

                {/* Info text */}
                <p className="text-xs text-zinc-500 text-center">
                    {privacyMethod === 'privacy-cash'
                        ? 'Your SOL will be deposited into a ZK-proof protected pool. Withdrawals will have no on-chain link to this deposit.'
                        : 'Your SOL will be deposited into ShadowWire. Transfer amounts will be hidden using Bulletproofs.'}
                </p>
            </div>
        </Card>
    );
}
