import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { JITO_TIP_ACCOUNTS } from '@/types';

// Jito Block Engine URL
const JITO_BLOCK_ENGINE_URL = process.env.JITO_BLOCK_ENGINE_URL || 'https://mainnet.block-engine.jito.wtf';

// RPC URL
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// Pump.fun Program constants
const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const PUMP_GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
const PUMP_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
const PUMP_EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Sell discriminator
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

interface SellRequest {
  mintAddress: string;
  wallets: {
    publicKey: string;
    secretKey: number[];
  }[];
}

function deriveBondingCurve(mint: PublicKey): PublicKey {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PUMP_PROGRAM_ID
  );
  return bondingCurve;
}

function deriveAssociatedBondingCurve(mint: PublicKey, bondingCurve: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM
  );
  return ata;
}

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM
  );
  return ata;
}

export async function POST(request: NextRequest) {
  try {
    const body: SellRequest = await request.json();
    const { mintAddress, wallets } = body;

    if (!mintAddress) {
      return NextResponse.json(
        { success: false, error: 'Mint address is required' },
        { status: 400 }
      );
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one wallet is required' },
        { status: 400 }
      );
    }

    const mint = new PublicKey(mintAddress);
    const bondingCurve = deriveBondingCurve(mint);
    const associatedBondingCurve = deriveAssociatedBondingCurve(mint, bondingCurve);

    // Reconstruct keypairs
    const keypairs = wallets.map(w => 
      Keypair.fromSecretKey(new Uint8Array(w.secretKey))
    );

    // Connect to Solana
    const connection = new Connection(RPC_URL, 'confirmed');
    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    const transactions: VersionedTransaction[] = [];
    const results: { wallet: string; success: boolean; signature?: string; error?: string }[] = [];

    // Build sell transactions for each wallet
    for (let i = 0; i < keypairs.length; i++) {
      const seller = keypairs[i];
      const sellerTokenAccount = getAssociatedTokenAddress(mint, seller.publicKey);

      try {
        // Get token balance
        const tokenBalance = await connection.getTokenAccountBalance(sellerTokenAccount);
        const tokenAmount = BigInt(tokenBalance.value.amount);

        if (tokenAmount === BigInt(0)) {
          results.push({
            wallet: seller.publicKey.toBase58(),
            success: false,
            error: 'No tokens to sell',
          });
          continue;
        }

        // Build sell instruction data
        const amountBuffer = Buffer.alloc(8);
        amountBuffer.writeBigUInt64LE(tokenAmount, 0);

        const minSolBuffer = Buffer.alloc(8);
        minSolBuffer.writeBigUInt64LE(BigInt(0), 0); // Accept any amount

        const sellData = Buffer.concat([
          SELL_DISCRIMINATOR,
          amountBuffer,
          minSolBuffer,
        ]);

        const sellInstructions: TransactionInstruction[] = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
          
          new TransactionInstruction({
            programId: PUMP_PROGRAM_ID,
            keys: [
              { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
              { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
              { pubkey: mint, isSigner: false, isWritable: false },
              { pubkey: bondingCurve, isSigner: false, isWritable: true },
              { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
              { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },
              { pubkey: seller.publicKey, isSigner: true, isWritable: true },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: ASSOCIATED_TOKEN_PROGRAM, isSigner: false, isWritable: false },
              { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
              { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
              { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: sellData,
          }),
        ];

        // Small Jito tip for first transaction only
        if (i === 0) {
          sellInstructions.push(
            SystemProgram.transfer({
              fromPubkey: seller.publicKey,
              toPubkey: new PublicKey(JITO_TIP_ACCOUNTS[0]),
              lamports: 500000, // 0.0005 SOL
            })
          );
        }

        const sellMessage = new TransactionMessage({
          payerKey: seller.publicKey,
          recentBlockhash: blockhash,
          instructions: sellInstructions,
        }).compileToV0Message();

        const sellTx = new VersionedTransaction(sellMessage);
        sellTx.sign([seller]);
        transactions.push(sellTx);

        results.push({
          wallet: seller.publicKey.toBase58(),
          success: true,
        });

      } catch (walletErr) {
        results.push({
          wallet: seller.publicKey.toBase58(),
          success: false,
          error: walletErr instanceof Error ? walletErr.message : 'Unknown error',
        });
      }
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid transactions to submit',
        results,
      });
    }

    // Try to submit as Jito bundle
    const serializedTxs = transactions.map(tx => bs58.encode(tx.serialize()));

    try {
      const jitoResponse = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [serializedTxs],
        }),
      });

      const jitoResult = await jitoResponse.json();

      if (!jitoResult.error) {
        return NextResponse.json({
          success: true,
          bundleId: jitoResult.result,
          results,
        });
      }
    } catch (jitoErr) {
      console.warn('Jito bundle failed, falling back to individual transactions');
    }

    // Fallback: send transactions individually
    for (let i = 0; i < transactions.length; i++) {
      try {
        const sig = await connection.sendRawTransaction(transactions[i].serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        // Update result with signature
        const walletKey = keypairs[i].publicKey.toBase58();
        const resultIndex = results.findIndex(r => r.wallet === walletKey);
        if (resultIndex >= 0) {
          results[resultIndex].signature = sig;
        }
      } catch (txErr) {
        console.error('Transaction error:', txErr);
      }
    }

    return NextResponse.json({
      success: true,
      bundleId: null,
      note: 'Submitted via fallback (non-atomic)',
      results,
    });

  } catch (error) {
    console.error('Sell API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


