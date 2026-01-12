import { NextRequest, NextResponse } from 'next/server';

/**
 * MOCK SELL ENDPOINT
 * 
 * Simulates selling all positions for testing.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mintAddress, wallets } = body;

    if (!mintAddress) {
      return NextResponse.json(
        { success: false, error: 'Mint address is required' },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

    // Generate fake results for each wallet
    const results = wallets.map((w: { publicKey: string }) => ({
      wallet: w.publicKey,
      success: Math.random() > 0.1, // 90% success rate simulation
      signature: `mock-sig-${Math.random().toString(36).substring(7)}`,
    }));

    console.log(`[MOCK] Simulated sell for ${wallets.length} wallets`);

    return NextResponse.json({
      success: true,
      bundleId: `mock-sell-${Date.now()}`,
      results,
      mock: true,
      message: '🧪 MOCK MODE: This is a simulated sell. No actual tokens were sold.',
    });

  } catch (error) {
    console.error('[MOCK] Sell error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Mock sell failed',
        mock: true,
      },
      { status: 500 }
    );
  }
}


