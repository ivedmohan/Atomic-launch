/**
 * Shared Types for Stealth Launch
 */

// Burner wallet for token sniping
export interface BurnerWallet {
    publicKey: string;
    secretKey: Uint8Array;
    index: number;
    balance: number;
    funded: boolean;
}

// Token metadata configuration
export interface TokenConfig {
    name: string;
    symbol: string;
    description: string;
    imageUrl: string;
    twitter?: string;
    telegram?: string;
    website?: string;
}

// Launch configuration
export interface LaunchConfig {
    totalBuyAmount: number; // in SOL
    walletCount: number;
    slippagePercent: number;
}

// Launch state tracking
export interface LaunchState {
    step: 'idle' | 'generating' | 'funding' | 'shielding' | 'distributing' | 'launching' | 'completed' | 'error';
    progress?: number;
    message?: string;
    error?: string;
    txSignature?: string;
    bundleId?: string;
}

// Wallet token holdings
export interface WalletHolding {
    walletIndex: number;
    publicKey: string;
    tokenBalance: number;
    solBalance: number;
}

// Constants
export const DEFAULT_WALLET_COUNT = 20;
export const MIN_WALLET_COUNT = 5;
export const MAX_WALLET_COUNT = 50;
export const PLATFORM_FEE_SOL = 0.5;
export const GAS_BUFFER_SOL = 0.01;

// Pump.fun program ID (mainnet)
export const PUMP_FUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// Jito tip accounts
export const JITO_TIP_ACCOUNTS = [
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];
