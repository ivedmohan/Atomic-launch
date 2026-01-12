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
import { 
  PLATFORM_FEE_SOL, 
  JITO_TIP_ACCOUNTS,
  TokenConfig,
} from '@/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PLATFORM_FEE_RECIPIENT = new PublicKey(
  process.env.PLATFORM_FEE_WALLET || '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'
);

const JITO_BLOCK_ENGINE_URL = process.env.JITO_BLOCK_ENGINE_URL || 'https://mainnet.block-engine.jito.wtf';
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Jito tip (in lamports) - 0.01 SOL for high priority
const JITO_TIP_LAMPORTS = 10_000_000;

// ============================================================================
// BATCHING CONSTANTS
// ============================================================================

// Maximum wallets we can fit in one transaction (due to 1232 byte limit)
// 10 signers × 64 bytes = 640 bytes for signatures
// Remaining ~592 bytes / ~50 bytes per swap = ~10-12 swaps
const MAX_BUYS_PER_TX = 10;

// First transaction has create + dev buy, so fewer buyer slots
const FIRST_TX_BUYER_SLOTS = 8;

// Maximum total wallets for atomic launch (5 tx × ~10 wallets)
const MAX_ATOMIC_WALLETS = 50;

// ============================================================================
// PUMP.FUN CONSTANTS
// ============================================================================

const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const PUMP_GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
const PUMP_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
const PUMP_EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const METAPLEX_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111');

// Instruction discriminators (Anchor)
const CREATE_DISCRIMINATOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

function deriveMetadataAccount(mint: PublicKey): PublicKey {
  const [metadata] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METAPLEX_METADATA_PROGRAM.toBuffer(), mint.toBuffer()],
    METAPLEX_METADATA_PROGRAM
  );
  return metadata;
}

function solToLamports(sol: number): number {
  return Math.floor(sol * 1e9);
}

// ============================================================================
// INSTRUCTION BUILDERS
// ============================================================================

function buildCreateInstruction(
  creator: PublicKey,
  mint: PublicKey,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  metadataAccount: PublicKey,
  tokenConfig: TokenConfig
): TransactionInstruction {
  // Metadata URI
  const metadataUri = tokenConfig.imageUrl.startsWith('http') 
    ? `https://pump.fun/api/ipfs?name=${encodeURIComponent(tokenConfig.name)}&symbol=${encodeURIComponent(tokenConfig.symbol)}&description=${encodeURIComponent(tokenConfig.description || '')}&image=${encodeURIComponent(tokenConfig.imageUrl)}`
    : tokenConfig.imageUrl;

  const nameBuffer = Buffer.from(tokenConfig.name);
  const symbolBuffer = Buffer.from(tokenConfig.symbol);
  const uriBuffer = Buffer.from(metadataUri);
  
  const createData = Buffer.concat([
    CREATE_DISCRIMINATOR,
    Buffer.from([nameBuffer.length, 0, 0, 0]), nameBuffer,
    Buffer.from([symbolBuffer.length, 0, 0, 0]), symbolBuffer,
    Buffer.from([uriBuffer.length, 0, 0, 0]), uriBuffer,
  ]);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: true, isWritable: true },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: METAPLEX_METADATA_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: metadataAccount, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: createData,
  });
}

function buildBuyInstruction(
  buyer: PublicKey,
  mint: PublicKey,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  buyLamports: number,
  slippagePercent: number,
  walletIndex: number
): TransactionInstruction {
  const buyerTokenAccount = getAssociatedTokenAddress(mint, buyer);
  
  // Dynamic slippage based on position
  const dynamicSlippage = slippagePercent + (walletIndex * 0.3);
  const slippageBps = Math.floor(dynamicSlippage * 100);
  const maxSolCost = BigInt(Math.floor(buyLamports * (1 + slippageBps / 10000)));

  // Buy instruction data (0 = spend all SOL up to max)
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(0), 0);
  const maxSolBuffer = Buffer.alloc(8);
  maxSolBuffer.writeBigUInt64LE(maxSolCost, 0);

  const buyData = Buffer.concat([BUY_DISCRIMINATOR, amountBuffer, maxSolBuffer]);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: buyData,
  });
}

// ============================================================================
// ATOMIC BUNDLE BUILDER
// ============================================================================

interface BuildAtomicBundleParams {
  tokenConfig: TokenConfig;
  keypairs: Keypair[];
  mintKeypair: Keypair;
  totalBuyAmount: number;
  slippagePercent: number;
  blockhash: string;
}

function buildAtomicBundle(params: BuildAtomicBundleParams): VersionedTransaction[] {
  const { tokenConfig, keypairs, mintKeypair, totalBuyAmount, slippagePercent, blockhash } = params;
  
  const mint = mintKeypair.publicKey;
  const bondingCurve = deriveBondingCurve(mint);
  const associatedBondingCurve = deriveAssociatedBondingCurve(mint, bondingCurve);
  const metadataAccount = deriveMetadataAccount(mint);
  
  const buyLamportsPerWallet = solToLamports(totalBuyAmount / keypairs.length);
  const bundleTransactions: VersionedTransaction[] = [];

  console.log(`\nBuilding atomic bundle for ${keypairs.length} wallets...`);
  console.log(`Buy amount per wallet: ${(buyLamportsPerWallet / 1e9).toFixed(4)} SOL`);

  // ========================================================================
  // TRANSACTION 1: Create Pool + First Batch of Buys
  // ========================================================================
  {
    const firstBatchWallets = keypairs.slice(0, FIRST_TX_BUYER_SLOTS);
    const creator = keypairs[0]; // Dev wallet is the creator
    
    const instructions: TransactionInstruction[] = [
      // Set high compute limit for create + multiple buys
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }),
      
      // Create token instruction
      buildCreateInstruction(
        creator.publicKey,
        mint,
        bondingCurve,
        associatedBondingCurve,
        metadataAccount,
        tokenConfig
      ),
      
      // Platform fee (from creator)
      SystemProgram.transfer({
        fromPubkey: creator.publicKey,
        toPubkey: PLATFORM_FEE_RECIPIENT,
        lamports: solToLamports(PLATFORM_FEE_SOL),
      }),
    ];

    // Add buy instructions for first batch
    firstBatchWallets.forEach((wallet, index) => {
      instructions.push(
        buildBuyInstruction(
          wallet.publicKey,
          mint,
          bondingCurve,
          associatedBondingCurve,
          buyLamportsPerWallet,
          slippagePercent,
          index
        )
      );
    });

    const message = new TransactionMessage({
      payerKey: creator.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    // Sign with creator (payer), mintKeypair (new token), and all buyers in batch
    tx.sign([creator, mintKeypair, ...firstBatchWallets]);
    bundleTransactions.push(tx);
    
    console.log(`TX 1: Create + ${firstBatchWallets.length} buys (signers: ${firstBatchWallets.length + 2})`);
  }

  // ========================================================================
  // TRANSACTIONS 2-4: Middle Batches of Buys (10 each)
  // ========================================================================
  let walletIndex = FIRST_TX_BUYER_SLOTS;
  let txNumber = 2;
  
  while (walletIndex < keypairs.length - MAX_BUYS_PER_TX) {
    const batchEnd = Math.min(walletIndex + MAX_BUYS_PER_TX, keypairs.length);
    const batchWallets = keypairs.slice(walletIndex, batchEnd);
    
    if (batchWallets.length === 0) break;
    
    const payer = batchWallets[0]; // First wallet in batch pays gas
    
    const instructions: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 }),
    ];

    // Add buy instructions for this batch
    batchWallets.forEach((wallet, index) => {
      instructions.push(
        buildBuyInstruction(
          wallet.publicKey,
          mint,
          bondingCurve,
          associatedBondingCurve,
          buyLamportsPerWallet,
          slippagePercent,
          walletIndex + index
        )
      );
    });

    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign(batchWallets); // All wallets in batch must sign
    bundleTransactions.push(tx);
    
    console.log(`TX ${txNumber}: ${batchWallets.length} buys (wallets ${walletIndex + 1}-${batchEnd})`);
    
    walletIndex = batchEnd;
    txNumber++;
    
    // Safety: Don't exceed Jito's 5 transaction limit
    if (bundleTransactions.length >= 4) break;
  }

  // ========================================================================
  // FINAL TRANSACTION: Remaining Buys + Jito Tip
  // ========================================================================
  {
    const finalWallets = keypairs.slice(walletIndex);
    
    if (finalWallets.length > 0) {
      const payer = finalWallets[0];
      
      const instructions: TransactionInstruction[] = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 }),
      ];

      // Add buy instructions for final batch
      finalWallets.forEach((wallet, index) => {
        instructions.push(
          buildBuyInstruction(
            wallet.publicKey,
            mint,
            bondingCurve,
            associatedBondingCurve,
            buyLamportsPerWallet,
            slippagePercent,
            walletIndex + index
          )
        );
      });

      // Jito tip for priority (from payer of this tx)
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: new PublicKey(JITO_TIP_ACCOUNTS[0]),
          lamports: JITO_TIP_LAMPORTS,
        })
      );

      const message = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);
      tx.sign(finalWallets);
      bundleTransactions.push(tx);
      
      console.log(`TX ${txNumber}: ${finalWallets.length} buys + Jito tip (final)`);
    }
  }

  console.log(`\nBundle created: ${bundleTransactions.length} transactions total`);
  return bundleTransactions;
}

// ============================================================================
// JITO BUNDLE SUBMISSION
// ============================================================================

async function submitJitoBundle(transactions: VersionedTransaction[]): Promise<{ 
  success: boolean; 
  bundleId?: string; 
  error?: string 
}> {
  try {
    const serializedTxs = transactions.map(tx => bs58.encode(tx.serialize()));
    
    console.log(`\nSubmitting ${serializedTxs.length} transactions to Jito...`);
    console.log(`Jito endpoint: ${JITO_BLOCK_ENGINE_URL}`);
    
    const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [serializedTxs],
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      console.error('Jito error:', result.error);
      return { success: false, error: result.error.message || JSON.stringify(result.error) };
    }
    
    console.log('Jito bundle accepted! Bundle ID:', result.result);
    return { success: true, bundleId: result.result };
  } catch (err) {
    console.error('Jito submission error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// FALLBACK: Non-Atomic Sequential Submission
// ============================================================================

async function submitFallback(
  transactions: VersionedTransaction[],
  connection: Connection,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<{ createSig: string | null; buyResults: { success: boolean; sig?: string; error?: string }[] }> {
  console.log('\n⚠️ FALLBACK MODE: Submitting transactions sequentially (NOT atomic!)');
  
  // Step 1: Send and confirm CREATE transaction
  const createTx = transactions[0];
  let createSig: string | null = null;
  
  try {
    createSig = await connection.sendRawTransaction(createTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    console.log('Create TX sent:', createSig);
    
    const confirmation = await connection.confirmTransaction({
      signature: createSig,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Create failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    console.log('Create TX confirmed!');
  } catch (err) {
    console.error('Create failed:', err);
    return { createSig: null, buyResults: [] };
  }

  // Step 2: Send remaining transactions in parallel
  const buyTxs = transactions.slice(1);
  const buyResults = await Promise.all(
    buyTxs.map(async (tx, index) => {
      try {
        const sig = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
        });
        return { success: true, sig };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown' };
      }
    })
  );

  return { createSig, buyResults };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

interface LaunchRequest {
  tokenConfig: TokenConfig;
  wallets: { publicKey: string; secretKey: number[] }[];
  totalBuyAmount?: number;
  slippagePercent?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: LaunchRequest = await request.json();
    const { tokenConfig, wallets, totalBuyAmount = 5, slippagePercent = 15 } = body;

    // Check network
    const isDevnet = RPC_URL.includes('devnet');
    if (isDevnet) {
      return NextResponse.json({
        success: false,
        error: 'Pump.fun only works on MAINNET. Switch to mainnet RPC or use Mock mode.',
        isDevnetError: true,
      }, { status: 400 });
    }

    // Validate input
    if (!tokenConfig.name || !tokenConfig.symbol) {
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

    // Check wallet limit for atomic launch
    if (wallets.length > MAX_ATOMIC_WALLETS) {
      return NextResponse.json({
        success: false,
        error: `Atomic launch supports max ${MAX_ATOMIC_WALLETS} wallets per bundle. You have ${wallets.length}. Please reduce wallet count or use multiple launches.`,
        maxWallets: MAX_ATOMIC_WALLETS,
      }, { status: 400 });
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🚀 ATOMIC LAUNCH: ${tokenConfig.name} (${tokenConfig.symbol})`);
    console.log(`   Wallets: ${wallets.length} | Buy Amount: ${totalBuyAmount} SOL | Slippage: ${slippagePercent}%`);
    console.log(`${'='.repeat(70)}`);

    // Setup
    const keypairs = wallets.map(w => Keypair.fromSecretKey(new Uint8Array(w.secretKey)));
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Build the atomic bundle
    const bundleTransactions = buildAtomicBundle({
      tokenConfig,
      keypairs,
      mintKeypair,
      totalBuyAmount,
      slippagePercent,
      blockhash,
    });

    // Submit to Jito
    const jitoResult = await submitJitoBundle(bundleTransactions);
    
    let response: Record<string, unknown>;

    if (jitoResult.success) {
      // 🎉 ATOMIC SUCCESS
      response = {
        success: true,
        atomic: true,
        mintAddress: mint.toBase58(),
        bundleId: jitoResult.bundleId,
        transactions: bundleTransactions.length,
        wallets: wallets.length,
        note: 'Bundle submitted to Jito. All transactions will execute atomically in the same block.',
      };
    } else {
      // Fallback to sequential (not atomic)
      console.log('\nJito bundle failed, attempting fallback...');
      const fallbackResult = await submitFallback(
        bundleTransactions,
        connection,
        blockhash,
        lastValidBlockHeight
      );

      const successfulBuys = fallbackResult.buyResults.filter(r => r.success).length;
      
      response = {
        success: fallbackResult.createSig !== null,
        atomic: false,
        mintAddress: mint.toBase58(),
        createSignature: fallbackResult.createSig,
        jitoError: jitoResult.error,
        stats: {
          totalBuyTxs: fallbackResult.buyResults.length,
          successfulBuyTxs: successfulBuys,
          failedBuyTxs: fallbackResult.buyResults.length - successfulBuys,
        },
        note: '⚠️ Fallback mode: Not atomic. Token created, buys sent separately.',
      };
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Launch completed in ${duration}s`);
    console.log(`   Mint: ${mint.toBase58()}`);
    console.log(`${'='.repeat(70)}\n`);

    return NextResponse.json({
      ...response,
      duration: `${duration}s`,
    });

  } catch (error) {
    console.error('Launch API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
