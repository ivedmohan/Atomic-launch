'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { PrivacyMethod, getProviderDisplayName } from '@/lib/privacy';
import { Shield, Clock, Shuffle, Users, TrendingUp } from 'lucide-react';

interface PrivacyScoreProps {
    privacyMethod: PrivacyMethod;
    walletCount: number;
    estimatedDurationMs?: number;
    amountVariance?: number;
}

export function PrivacyScore({
    privacyMethod,
    walletCount,
    estimatedDurationMs = 0,
    amountVariance = 0.15,
}: PrivacyScoreProps) {
    const score = useMemo(() => {
        if (privacyMethod === 'none') return 0;

        let s = 0;

        // Base score for using privacy
        if (privacyMethod === 'privacy-cash') s += 40;
        if (privacyMethod === 'shadowwire') s += 25;

        // Score for timing variance
        const avgDelayMins = estimatedDurationMs / walletCount / 60000;
        if (avgDelayMins > 1) s += 15;
        if (avgDelayMins > 2) s += 10;

        // Score for wallet count
        if (walletCount >= 10) s += 10;
        if (walletCount >= 25) s += 10;
        if (walletCount >= 50) s += 5;

        // Score for amount variance
        if (amountVariance >= 0.1) s += 10;

        return Math.min(100, s);
    }, [privacyMethod, walletCount, estimatedDurationMs, amountVariance]);

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-400';
        if (s >= 50) return 'text-yellow-400';
        if (s >= 25) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreLabel = (s: number) => {
        if (s >= 80) return 'Excellent';
        if (s >= 50) return 'Good';
        if (s >= 25) return 'Fair';
        return 'Low';
    };

    if (privacyMethod === 'none') {
        return (
            <Card className="p-4 bg-red-500/10 border-red-500/30">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-red-400" />
                    <div>
                        <span className="text-red-400 font-medium">No Privacy</span>
                        <p className="text-xs text-zinc-400">All transactions will be fully visible on-chain</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">Privacy Score</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                    {score}
                    <span className="text-sm font-normal text-zinc-400">/100</span>
                </div>
            </div>

            {/* Score bar */}
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-4">
                <div
                    className={`h-full transition-all duration-500 ${score >= 80 ? 'bg-green-500' :
                            score >= 50 ? 'bg-yellow-500' :
                                score >= 25 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Shield className="w-4 h-4" />
                    <span>{getProviderDisplayName(privacyMethod)}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                    <Users className="w-4 h-4" />
                    <span>{walletCount} wallets</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-4 h-4" />
                    <span>{Math.round(estimatedDurationMs / 60000)}min distribution</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                    <Shuffle className="w-4 h-4" />
                    <span>±{Math.round(amountVariance * 100)}% variance</span>
                </div>
            </div>

            <div className={`mt-3 pt-3 border-t border-zinc-700 text-center ${getScoreColor(score)}`}>
                <TrendingUp className="w-4 h-4 inline mr-1" />
                <span className="font-medium">{getScoreLabel(score)} Unlinkability</span>
            </div>
        </Card>
    );
}
