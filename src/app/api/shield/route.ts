/**
 * Privacy Shield API
 * Server-side only - shields SOL using Privacy Cash or ShadowWire
 * 
 * The SDKs use WASM/Node.js and can only run server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const IS_DEVNET = RPC_URL.includes('devnet');

interface ShieldRequest {
    method: 'privacy-cash' | 'shadowwire';
    secretKey?: number[];
    lamports: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: ShieldRequest = await request.json();
        const { method, secretKey, lamports } = body;

        if (!method || !lamports) {
            return NextResponse.json(
                { success: false, error: 'Missing method or lamports' },
                { status: 400 }
            );
        }

        // On devnet, return mock success (SDKs only work on mainnet)
        if (IS_DEVNET) {
            console.log(`[DEVNET MOCK] Shielding ${lamports / 1e9} SOL via ${method}`);

            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            return NextResponse.json({
                success: true,
                txSignature: 'DEVNET_MOCK_' + Date.now(),
                method,
                note: 'Devnet mock - real shielding only works on mainnet',
            });
        }

        // On mainnet, require secret key for real operations
        if (!secretKey) {
            return NextResponse.json(
                { success: false, error: 'Secret key required for mainnet shielding' },
                { status: 400 }
            );
        }

        const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

        if (method === 'privacy-cash') {
            // Dynamic import - only loads on server where WASM works
            const { PrivacyCash } = await import('privacycash');

            const client = new PrivacyCash({
                RPC_url: RPC_URL,
                owner: keypair,
                enableDebug: process.env.NODE_ENV === 'development',
            });

            const result = await client.deposit({ lamports });

            return NextResponse.json({
                success: true,
                txSignature: result.tx,
                method: 'privacy-cash',
            });
        }

        if (method === 'shadowwire') {
            const { ShadowWireClient } = await import('@radr/shadowwire');

            const client = new ShadowWireClient({
                network: 'mainnet-beta',
                debug: process.env.NODE_ENV === 'development',
            });

            const result = await client.deposit({
                wallet: keypair.publicKey.toBase58(),
                amount: lamports / 1e9,
            });

            return NextResponse.json({
                success: result.success,
                method: 'shadowwire',
            });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid method' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Shield API error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
