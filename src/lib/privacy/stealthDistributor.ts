/**
 * Stealth Distributor
 * Handles randomized, time-delayed distribution to burner wallets
 */

import {
    PrivacyProvider,
    StealthWithdrawal,
    StealthDistributionPlan,
    PrivacyConfig,
    DEFAULT_PRIVACY_CONFIG,
} from './types';

interface BurnerWallet {
    publicKey: string;
    index: number;
}

/**
 * Generate a random delay between min and max
 */
function randomDelay(minMs: number, maxMs: number): number {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Apply variance to an amount
 * e.g., variance of 0.15 means ±15%
 */
function applyVariance(amount: number, variance: number): number {
    const factor = 1 + (Math.random() * 2 - 1) * variance;
    return Math.floor(amount * factor);
}

/**
 * Create a stealth distribution plan
 */
export function createDistributionPlan(
    wallets: BurnerWallet[],
    totalLamports: number,
    config: Partial<PrivacyConfig> = {}
): StealthDistributionPlan {
    const { minDelayMs, maxDelayMs, amountVariance } = {
        ...DEFAULT_PRIVACY_CONFIG,
        ...config,
    };

    const baseAmountPerWallet = Math.floor(totalLamports / wallets.length);
    let remainingLamports = totalLamports;
    let cumulativeDelay = 0;

    const withdrawals: StealthWithdrawal[] = wallets.map((wallet, index) => {
        // Last wallet gets remaining to avoid rounding issues
        const isLast = index === wallets.length - 1;
        const targetAmount = isLast ? remainingLamports : baseAmountPerWallet;
        const actualAmount = isLast ? remainingLamports : applyVariance(targetAmount, amountVariance);

        remainingLamports -= actualAmount;

        // Add random delay (except for first wallet)
        if (index > 0) {
            cumulativeDelay += randomDelay(minDelayMs, maxDelayMs);
        }

        return {
            targetWallet: wallet.publicKey,
            targetAmount,
            actualAmount,
            scheduledTime: new Date(Date.now() + cumulativeDelay),
            status: 'pending' as const,
        };
    });

    // Shuffle the order for extra randomness
    const shuffled = [...withdrawals].sort(() => Math.random() - 0.5);

    // Recalculate scheduled times after shuffle
    let newCumulativeDelay = 0;
    shuffled.forEach((w, index) => {
        if (index > 0) {
            newCumulativeDelay += randomDelay(minDelayMs, maxDelayMs);
        }
        w.scheduledTime = new Date(Date.now() + newCumulativeDelay);
    });

    return {
        totalAmount: totalLamports,
        walletCount: wallets.length,
        withdrawals: shuffled,
        estimatedDuration: newCumulativeDelay,
    };
}

/**
 * Execute stealth distribution with progress callback
 */
export async function executeStealthDistribution(
    provider: PrivacyProvider,
    plan: StealthDistributionPlan,
    onProgress?: (withdrawal: StealthWithdrawal, index: number, total: number) => void
): Promise<StealthWithdrawal[]> {
    const results: StealthWithdrawal[] = [];

    for (let i = 0; i < plan.withdrawals.length; i++) {
        const withdrawal = { ...plan.withdrawals[i] };

        // Wait until scheduled time
        const now = Date.now();
        const scheduledTime = withdrawal.scheduledTime.getTime();
        if (scheduledTime > now) {
            await sleep(scheduledTime - now);
        }

        // Update status
        withdrawal.status = 'processing';
        onProgress?.(withdrawal, i, plan.withdrawals.length);

        try {
            const result = await provider.withdraw(
                withdrawal.targetWallet,
                withdrawal.actualAmount
            );

            if (result.success) {
                withdrawal.status = 'completed';
                withdrawal.txSignature = result.txSignature;
            } else {
                withdrawal.status = 'failed';
                withdrawal.error = result.error;
            }
        } catch (error) {
            withdrawal.status = 'failed';
            withdrawal.error = error instanceof Error ? error.message : 'Unknown error';
        }

        results.push(withdrawal);
        onProgress?.(withdrawal, i, plan.withdrawals.length);
    }

    return results;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate privacy score based on distribution
 */
export function calculatePrivacyScore(plan: StealthDistributionPlan): number {
    let score = 0;

    // Base score for using privacy
    score += 30;

    // Score for timing variance
    const avgDelay = plan.estimatedDuration / plan.walletCount;
    if (avgDelay > 60000) score += 20; // > 1 min average
    if (avgDelay > 120000) score += 10; // > 2 min average

    // Score for wallet count (more = harder to trace)
    if (plan.walletCount >= 10) score += 15;
    if (plan.walletCount >= 25) score += 10;
    if (plan.walletCount >= 50) score += 5;

    // Score for amount variance
    const amounts = plan.withdrawals.map(w => w.actualAmount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((acc, a) => acc + Math.pow(a - avgAmount, 2), 0) / amounts.length;
    const coefficientOfVariation = Math.sqrt(variance) / avgAmount;

    if (coefficientOfVariation > 0.1) score += 10;

    return Math.min(100, score);
}
