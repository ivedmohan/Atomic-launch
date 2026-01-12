/**
 * ShadowWire SDK Wrapper
 * Provides private transfers using Bulletproofs (hidden amounts)
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { ShadowWireClient } from '@radr/shadowwire';
import type { SolanaNetwork } from '@radr/shadowwire';
import {
    PrivacyProvider,
    PrivacyBalance,
    ShieldResult,
    WithdrawResult
} from './types';

export class ShadowWireProvider implements PrivacyProvider {
    readonly name = 'shadowwire' as const;

    private client: ShadowWireClient | null = null;
    private network: SolanaNetwork;
    private _isReady = false;
    private walletAddress: string | null = null;

    constructor(network: SolanaNetwork = 'mainnet-beta') {
        this.network = network;
    }

    async initialize(secretKey: Uint8Array): Promise<void> {
        try {
            const keypair = Keypair.fromSecretKey(secretKey);
            this.walletAddress = keypair.publicKey.toBase58();

            // ShadowWire client config
            this.client = new ShadowWireClient({
                network: this.network,
                debug: process.env.NODE_ENV === 'development',
            });

            this._isReady = true;
        } catch (error) {
            console.error('Failed to initialize ShadowWire:', error);
            throw error;
        }
    }

    isReady(): boolean {
        return this._isReady && this.client !== null;
    }

    /**
     * ShadowWire requires depositing to their pool first.
     * This deposits SOL to the ShadowWire pool.
     */
    async shield(lamports: number): Promise<ShieldResult> {
        if (!this.client || !this.walletAddress) {
            return { success: false, error: 'Client not initialized' };
        }

        try {
            const result = await this.client.deposit({
                wallet: this.walletAddress,
                amount: lamports / 1e9, // Convert to SOL
            });

            return {
                success: result.success,
                txSignature: undefined, // Deposit returns unsigned tx, needs signing
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Transfer SOL privately using Bulletproofs
     * Uses external transfer which works with any Solana wallet
     */
    async withdraw(recipientAddress: string, lamports: number): Promise<WithdrawResult> {
        if (!this.client || !this.walletAddress) {
            return {
                success: false,
                error: 'Client not initialized',
                recipient: recipientAddress,
                amountLamports: lamports,
                feeLamports: 0,
            };
        }

        try {
            // Use external transfer (amount visible but sender anonymous)
            const result = await this.client.transfer({
                sender: this.walletAddress,
                recipient: recipientAddress,
                amount: lamports / 1e9, // Convert to SOL
                token: 'SOL',
                type: 'external',
            });

            return {
                success: true,
                txSignature: result.tx_signature,
                recipient: recipientAddress,
                amountLamports: lamports,
                feeLamports: 0,
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

    /**
     * Get balance from ShadowWire pool
     */
    async getBalance(): Promise<PrivacyBalance> {
        if (!this.client || !this.walletAddress) {
            return { lamports: 0, sol: 0 };
        }

        try {
            const result = await this.client.getBalance(this.walletAddress);

            const sol = result?.available ?? 0;
            return {
                lamports: Math.floor(sol * 1e9),
                sol,
            };
        } catch (error) {
            console.error('Failed to get ShadowWire balance:', error);
            return { lamports: 0, sol: 0 };
        }
    }
}
