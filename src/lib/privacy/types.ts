/**
 * Privacy Provider Types
 * Unified interface for Privacy Cash and ShadowWire
 */

export type PrivacyMethod = 'none' | 'privacy-cash' | 'shadowwire';

export interface PrivacyConfig {
    method: PrivacyMethod;
    rpcUrl: string;
    // Stealth distribution config
    minDelayMs: number;  // Min delay between withdrawals
    maxDelayMs: number;  // Max delay between withdrawals
    amountVariance: number; // ±variance for amounts (0.15 = ±15%)
}

export interface ShieldResult {
    success: boolean;
    txSignature?: string;
    error?: string;
}

export interface WithdrawResult {
    success: boolean;
    txSignature?: string;
    recipient: string;
    amountLamports: number;
    feeLamports: number;
    isPartial?: boolean;
    error?: string;
}

export interface PrivacyBalance {
    lamports: number;
    sol: number;
}

export interface StealthWithdrawal {
    targetWallet: string;
    targetAmount: number; // in lamports
    actualAmount: number; // after variance applied
    scheduledTime: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    txSignature?: string;
    error?: string;
}

export interface StealthDistributionPlan {
    totalAmount: number;
    walletCount: number;
    withdrawals: StealthWithdrawal[];
    estimatedDuration: number; // ms
}

// Privacy provider interface - both Privacy Cash and ShadowWire implement this
export interface PrivacyProvider {
    readonly name: PrivacyMethod;

    // Initialize with wallet
    initialize(secretKey: Uint8Array): Promise<void>;

    // Shield/deposit SOL
    shield(lamports: number): Promise<ShieldResult>;

    // Withdraw to recipient
    withdraw(recipientAddress: string, lamports: number): Promise<WithdrawResult>;

    // Get shielded balance
    getBalance(): Promise<PrivacyBalance>;

    // Check if ready
    isReady(): boolean;
}

// Default config
export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
    method: 'none',
    rpcUrl: '',
    minDelayMs: 30000,   // 30 seconds
    maxDelayMs: 300000,  // 5 minutes  
    amountVariance: 0.15, // ±15%
};
