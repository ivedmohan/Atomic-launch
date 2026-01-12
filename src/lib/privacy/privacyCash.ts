/**
 * Privacy Cash SDK Wrapper
 * Provides shielded SOL transfers using ZK proofs
 * 
 * NOTE: Uses dynamic import due to WASM dependencies that don't work with SSR
 */

import { Keypair } from '@solana/web3.js';
import {
    PrivacyProvider,
    PrivacyBalance,
    ShieldResult,
    WithdrawResult
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrivacyCashClient = any;

export class PrivacyCashProvider implements PrivacyProvider {
    readonly name = 'privacy-cash' as const;

    private client: PrivacyCashClient | null = null;
    private rpcUrl: string;
    private _isReady = false;

    constructor(rpcUrl: string) {
        this.rpcUrl = rpcUrl;
    }

    async initialize(secretKey: Uint8Array): Promise<void> {
        try {
            const keypair = Keypair.fromSecretKey(secretKey);

            // Dynamic import to avoid WASM loading during SSR
            const { PrivacyCash } = await import('privacycash');

            this.client = new PrivacyCash({
                RPC_url: this.rpcUrl,
                owner: keypair,
                enableDebug: process.env.NODE_ENV === 'development',
            });

            this._isReady = true;
        } catch (error) {
            console.error('Failed to initialize Privacy Cash:', error);
            throw error;
        }
    }

    isReady(): boolean {
        return this._isReady && this.client !== null;
    }

    async shield(lamports: number): Promise<ShieldResult> {
        if (!this.client) {
            return { success: false, error: 'Client not initialized' };
        }

        try {
            const result = await this.client.deposit({ lamports });
            return {
                success: true,
                txSignature: result.tx,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async withdraw(recipientAddress: string, lamports: number): Promise<WithdrawResult> {
        if (!this.client) {
            return {
                success: false,
                error: 'Client not initialized',
                recipient: recipientAddress,
                amountLamports: lamports,
                feeLamports: 0,
            };
        }

        try {
            const result = await this.client.withdraw({
                lamports,
                recipientAddress,
            });

            return {
                success: true,
                txSignature: result.tx,
                recipient: result.recipient,
                amountLamports: result.amount_in_lamports,
                feeLamports: result.fee_in_lamports,
                isPartial: result.isPartial,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                recipient: recipientAddress,
                amountLamports: lamports,
                feeLamports: 0,
            };
        }
    }

    async getBalance(): Promise<PrivacyBalance> {
        if (!this.client) {
            return { lamports: 0, sol: 0 };
        }

        try {
            const result = await this.client.getPrivateBalance();
            return {
                lamports: result.lamports,
                sol: result.lamports / 1e9,
            };
        } catch (error) {
            console.error('Failed to get private balance:', error);
            return { lamports: 0, sol: 0 };
        }
    }

    // Clear cached UTXOs
    async clearCache(): Promise<void> {
        if (this.client) {
            await this.client.clearCache();
        }
    }
}
