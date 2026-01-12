import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';

/**
 * MOCK LAUNCH ENDPOINT
 * 
 * This simulates a successful launch for testing purposes.
 * Use this when NETWORK_MODE is 'mock' or 'devnet'.
 * 
 * It doesn't actually create any tokens on-chain, but returns
 * realistic-looking responses so you can test the UI flow.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenConfig, wallets } = body;

    // Validate inputs just like the real endpoint
    if (!tokenConfig?.name || !tokenConfig?.symbol) {
      return NextResponse.json(
        { success: false, error: 'Token name and symbol are required' },
        { status: 400 }
      );
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one wallet is required' },
        { status: 400 }
      );
    }

    // Simulate processing delay (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Generate a fake mint address (this won't exist on-chain)
    const fakeMint = Keypair.generate().publicKey.toBase58();
    
    // Generate fake bundle ID and signature
    const fakeBundleId = `mock-bundle-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const fakeSignature = Keypair.generate().publicKey.toBase58(); // Just using as random string

    console.log(`[MOCK] Simulated launch for token: ${tokenConfig.name} (${tokenConfig.symbol})`);
    console.log(`[MOCK] Fake mint address: ${fakeMint}`);
    console.log(`[MOCK] Wallets in bundle: ${wallets.length}`);

    return NextResponse.json({
      success: true,
      mintAddress: fakeMint,
      bundleId: fakeBundleId,
      signature: fakeSignature,
      mock: true, // Flag to indicate this is simulated
      message: '🧪 MOCK MODE: This is a simulated launch. No actual tokens were created.',
    });

  } catch (error) {
    console.error('[MOCK] Launch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Mock launch failed',
        mock: true,
      },
      { status: 500 }
    );
  }
}


