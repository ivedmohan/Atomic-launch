import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// Minimum lamports needed for transaction fee
const TX_FEE_BUFFER = 5000;

// Batch size for parallel processing
const BATCH_SIZE = 20;

interface ReclaimRequest {
  destinationWallet: string;
  wallets: {
    publicKey: string;
    secretKey: number[];
  }[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ReclaimRequest = await request.json();
    const { destinationWallet, wallets } = body;

    if (!destinationWallet) {
      return NextResponse.json(
        { success: false, error: 'Destination wallet is required' },
        { status: 400 }
      );
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No wallets to reclaim from' },
        { status: 400 }
      );
    }

    const destination = new PublicKey(destinationWallet);
    const connection = new Connection(RPC_URL, 'confirmed');

    // Get fresh blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    // Step 1: Get all balances in parallel
    console.log(`Fetching balances for ${wallets.length} wallets...`);
    const keypairs = wallets.map(w => Keypair.fromSecretKey(new Uint8Array(w.secretKey)));
    const balancePromises = keypairs.map(kp => connection.getBalance(kp.publicKey));
    const balances = await Promise.all(balancePromises);

    // Step 2: Build transactions only for wallets with sufficient balance
    const txsToSend: { keypair: Keypair; transaction: Transaction; balance: number }[] = [];
    
    for (let i = 0; i < keypairs.length; i++) {
      const balance = balances[i];
      if (balance > TX_FEE_BUFFER) {
        const reclaimAmount = balance - TX_FEE_BUFFER;
        
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: keypairs[i].publicKey,
        });
        
        // Low compute budget for simple transfer
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 5000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
          SystemProgram.transfer({
            fromPubkey: keypairs[i].publicKey,
            toPubkey: destination,
            lamports: reclaimAmount,
          })
        );
        
        transaction.sign(keypairs[i]);
        txsToSend.push({ keypair: keypairs[i], transaction, balance: reclaimAmount });
      }
    }

    console.log(`Sending ${txsToSend.length} reclaim transactions in parallel batches...`);

    // Step 3: Send transactions in parallel batches (fire and forget for speed)
    const results: {
      wallet: string;
      success: boolean;
      amount?: number;
      signature?: string;
      error?: string;
    }[] = [];
    
    let totalReclaimed = 0;
    let successCount = 0;

    for (let i = 0; i < txsToSend.length; i += BATCH_SIZE) {
      const batch = txsToSend.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async ({ keypair, transaction, balance }) => {
        try {
          const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            {
              skipPreflight: true, // Skip for speed
              preflightCommitment: 'confirmed',
            }
          );
          
          return {
            wallet: keypair.publicKey.toBase58(),
            success: true,
            amount: balance / LAMPORTS_PER_SOL,
            signature,
          };
        } catch (err) {
          return {
            wallet: keypair.publicKey.toBase58(),
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        results.push(result);
        if (result.success && result.amount) {
          totalReclaimed += result.amount;
          successCount++;
        }
      }
      
      console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batchResults.filter(r => r.success).length}/${batch.length} sent`);
    }

    // Add results for skipped wallets (zero balance)
    for (let i = 0; i < keypairs.length; i++) {
      if (balances[i] <= TX_FEE_BUFFER) {
        results.push({
          wallet: keypairs[i].publicKey.toBase58(),
          success: false,
          amount: 0,
          error: 'Balance too low to reclaim',
        });
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Reclaim completed in ${duration.toFixed(2)}s`);

    return NextResponse.json({
      success: true,
      totalReclaimed,
      totalWallets: wallets.length,
      successfulReclaims: successCount,
      duration: `${duration.toFixed(2)}s`,
      note: 'Transactions sent without waiting for confirmation. Check explorer for status.',
      results,
    });

  } catch (error) {
    console.error('Reclaim API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


