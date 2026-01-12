/**
 * Mock Privacy Provider
 * Simulates privacy operations for devnet/testnet testing
 */

import {
    PrivacyProvider,
    PrivacyBalance,
    ShieldResult,
    WithdrawResult
} from './types';

export class MockPrivacyProvider implements PrivacyProvider {
    readonly name: 'privacy-cash' | 'shadowwire';

    private _isReady = false;
    private balance = 0;
    private mockLatency: number;

    constructor(name: 'privacy-cash' | 'shadowwire', mockLatencyMs: number = 2000) {
        this.name = name;
        this.mockLatency = mockLatencyMs;
    }

    async initialize(_secretKey: Uint8Array): Promise<void> {
        await this.delay(500);
        this._isReady = true;
        console.log(`[MOCK] ${this.name} initialized`);
    }

    isReady(): boolean {
        return this._isReady;
    }

    async shield(lamports: number): Promise<ShieldResult> {
        console.log(`[MOCK] Shielding ${lamports / 1e9} SOL...`);
        await this.delay(this.mockLatency);

        this.balance += lamports;

        return {
            success: true,
            txSignature: this.generateMockTxSignature(),
        };
    }

    async withdraw(recipientAddress: string, lamports: number): Promise<WithdrawResult> {
        console.log(`[MOCK] Withdrawing ${lamports / 1e9} SOL to ${recipientAddress}...`);

        if (lamports > this.balance) {
            return {
                success: false,
                error: 'Insufficient shielded balance',
                recipient: recipientAddress,
                amountLamports: lamports,
                feeLamports: 0,
            };
        }

        await this.delay(this.mockLatency);

        this.balance -= lamports;
        const fee = Math.floor(lamports * 0.001); // 0.1% mock fee

        return {
            success: true,
            txSignature: this.generateMockTxSignature(),
            recipient: recipientAddress,
            amountLamports: lamports - fee,
            feeLamports: fee,
        };
    }

    async getBalance(): Promise<PrivacyBalance> {
        return {
            lamports: this.balance,
            sol: this.balance / 1e9,
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private generateMockTxSignature(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 88; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

/**
 * Create mock provider for testing
 */
export function createMockPrivacyProvider(
    method: 'privacy-cash' | 'shadowwire'
): MockPrivacyProvider {
    return new MockPrivacyProvider(method);
}
