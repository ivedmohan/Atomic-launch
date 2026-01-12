import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { 
  createTokenInstruction, 
  buyTokenInstruction,
  deriveBondingCurve,
  deriveAssociatedBondingCurve,
} from './pumpfun';
import { 
  JITO_TIP_ACCOUNTS, 
  PLATFORM_FEE_SOL,
  BurnerWallet,
  TokenConfig,
} from '@/types';
import { solToLamports, generateRandomSlippage } from '../utils';
import { getConnection } from './connection';

// Platform fee recipient - Uses system program as placeholder (will be replaced by env var in API route)
// Note: This file contains client-side bundler utilities
// The actual fee recipient is configured in the API route via environment variable

// Jito configuration
const JITO_BLOCK_ENGINE_URL = 'https://mainnet.block-engine.jito.wtf';
const JITO_TIP_AMOUNT = 0.001; // SOL tip for priority

export interface BundleParams {
  tokenConfig: TokenConfig;
  burnerWallets: BurnerWallet[];
  totalBuyAmountSOL: number;
  baseSlippagePercent: number;
  metadataUri: string;
}

export interface SignedBundle {
  transactions: string[]; // Base64 encoded signed transactions
  mintKeypair: string; // Base58 encoded secret key
}

// Create the full atomic bundle for launch + snipe
export async function createLaunchBundle(params: BundleParams): Promise<{
  transactions: VersionedTransaction[];
  mintKeypair: Keypair;
}> {
  const connection = getConnection();
  const { tokenConfig, burnerWallets, totalBuyAmountSOL, baseSlippagePercent, metadataUri } = params;
  
  if (burnerWallets.length === 0) {
    throw new Error('No burner wallets provided');
  }

  // Generate mint keypair
  const mintKeypair = Keypair.generate();
  
  // Derive bonding curve addresses
  const bondingCurve = deriveBondingCurve(mintKeypair.publicKey);
  const associatedBondingCurve = deriveAssociatedBondingCurve(mintKeypair.publicKey, bondingCurve);
  
  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  
  const transactions: VersionedTransaction[] = [];
  
  // Calculate buy amount per wallet
  const buyAmountPerWallet = totalBuyAmountSOL / burnerWallets.length;
  const buyAmountLamports = solToLamports(buyAmountPerWallet);
  
  // Transaction 1: Create token (from first wallet)
  const creatorWallet = Keypair.fromSecretKey(burnerWallets[0].secretKey);
  
  const createInstructions: TransactionInstruction[] = [
    // Compute budget for complex transaction
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
    
    // Create the token
    createTokenInstruction({
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      uri: metadataUri,
      creator: creatorWallet.publicKey,
      mint: mintKeypair,
    }),
    
    // Note: Platform fee is added in the server-side API route
    // to ensure the fee wallet address comes from secure environment configuration
    
    // Jito tip
    SystemProgram.transfer({
      fromPubkey: creatorWallet.publicKey,
      toPubkey: new PublicKey(JITO_TIP_ACCOUNTS[0]),
      lamports: solToLamports(JITO_TIP_AMOUNT),
    }),
  ];
  
  const createMessage = new TransactionMessage({
    payerKey: creatorWallet.publicKey,
    recentBlockhash: blockhash,
    instructions: createInstructions,
  }).compileToV0Message();
  
  const createTx = new VersionedTransaction(createMessage);
  createTx.sign([creatorWallet, mintKeypair]);
  transactions.push(createTx);
  
  // Transactions 2-N: Buy transactions for each wallet
  for (let i = 0; i < burnerWallets.length; i++) {
    const wallet = burnerWallets[i];
    const keypair = Keypair.fromSecretKey(wallet.secretKey);
    
    // Dynamic slippage - later wallets get higher slippage
    const slippage = generateRandomSlippage(baseSlippagePercent, i, burnerWallets.length);
    const slippageBps = slippage * 100; // Convert to basis points
    
    const buyInstructions: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
      
      buyTokenInstruction({
        mint: mintKeypair.publicKey,
        buyer: keypair.publicKey,
        solAmount: buyAmountLamports,
        slippageBps,
        bondingCurve,
        associatedBondingCurve,
      }),
    ];
    
    // Add small Jito tip to each transaction
    if (i < 5) { // Only tip on first 5 transactions
      buyInstructions.push(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new PublicKey(JITO_TIP_ACCOUNTS[i % JITO_TIP_ACCOUNTS.length]),
          lamports: solToLamports(0.0001),
        })
      );
    }
    
    const buyMessage = new TransactionMessage({
      payerKey: keypair.publicKey,
      recentBlockhash: blockhash,
      instructions: buyInstructions,
    }).compileToV0Message();
    
    const buyTx = new VersionedTransaction(buyMessage);
    buyTx.sign([keypair]);
    transactions.push(buyTx);
  }
  
  return { transactions, mintKeypair };
}

// Submit bundle to Jito
export async function submitBundleToJito(
  transactions: VersionedTransaction[]
): Promise<{ bundleId: string }> {
  const serializedTxs = transactions.map(tx => 
    Buffer.from(tx.serialize()).toString('base64')
  );
  
  const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
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
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Jito bundle error: ${result.error.message}`);
  }
  
  return { bundleId: result.result };
}

// Check bundle status
export async function getBundleStatus(bundleId: string): Promise<{
  status: 'pending' | 'landed' | 'failed';
  slot?: number;
}> {
  const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBundleStatuses',
      params: [[bundleId]],
    }),
  });
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Bundle status error: ${result.error.message}`);
  }
  
  const status = result.result?.value?.[0];
  
  if (!status) {
    return { status: 'pending' };
  }
  
  if (status.confirmation_status === 'confirmed' || status.confirmation_status === 'finalized') {
    return { status: 'landed', slot: status.slot };
  }
  
  if (status.err) {
    return { status: 'failed' };
  }
  
  return { status: 'pending' };
}

// Maximum wallets per transaction to stay under Solana's 1232 byte limit
// Each transfer is ~40 bytes, with ~200 bytes overhead, so ~25 max
const MAX_WALLETS_PER_TX = 20;

// Create funding transactions (distribute SOL to burner wallets)
// Returns array of transactions if wallets > MAX_WALLETS_PER_TX
export async function createFundingTransactions(
  fromPubkey: PublicKey,
  burnerWallets: BurnerWallet[],
  totalAmountSOL: number
): Promise<Transaction[]> {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  
  // Validate inputs
  if (burnerWallets.length === 0) {
    throw new Error('No burner wallets provided');
  }
  if (totalAmountSOL <= 0) {
    throw new Error('Invalid funding amount');
  }
  
  const amountPerWallet = solToLamports(totalAmountSOL / burnerWallets.length);
  
  // Validate amount is reasonable (at least 1000 lamports per wallet)
  if (amountPerWallet < 1000) {
    throw new Error('Amount per wallet too small');
  }
  
  // Split wallets into batches
  const batches: BurnerWallet[][] = [];
  for (let i = 0; i < burnerWallets.length; i += MAX_WALLETS_PER_TX) {
    batches.push(burnerWallets.slice(i, i + MAX_WALLETS_PER_TX));
  }
  
  const transactions: Transaction[] = [];
  
  for (const batch of batches) {
    // Create legacy transaction for wallet compatibility
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: fromPubkey,
    });
    
    // Add compute budget instructions
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 50000 + (batch.length * 1500) }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
    );
    
    // Add transfer to each burner wallet with validation
    for (const wallet of batch) {
      // Validate public key string
      if (!wallet.publicKey || typeof wallet.publicKey !== 'string') {
        throw new Error(`Invalid wallet public key at index ${wallet.index}`);
      }
      
      try {
        const recipientPubkey = new PublicKey(wallet.publicKey);
        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey: recipientPubkey,
            lamports: amountPerWallet,
          })
        );
      } catch (err) {
        throw new Error(`Invalid public key for wallet ${wallet.index}: ${wallet.publicKey}`);
      }
    }
    
    transactions.push(transaction);
  }
  
  return transactions;
}

// Legacy single-transaction function for backwards compatibility (small wallet counts)
export async function createFundingTransaction(
  fromPubkey: PublicKey,
  burnerWallets: BurnerWallet[],
  totalAmountSOL: number
): Promise<Transaction> {
  const transactions = await createFundingTransactions(fromPubkey, burnerWallets, totalAmountSOL);
  if (transactions.length > 1) {
    throw new Error(`Too many wallets (${burnerWallets.length}) for single transaction. Use createFundingTransactions instead.`);
  }
  return transactions[0];
}

// Create sell-all transaction bundle
export async function createSellBundle(
  burnerWallets: BurnerWallet[],
  mintPubkey: PublicKey
): Promise<VersionedTransaction[]> {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  
  const bondingCurve = deriveBondingCurve(mintPubkey);
  const associatedBondingCurve = deriveAssociatedBondingCurve(mintPubkey, bondingCurve);
  
  const transactions: VersionedTransaction[] = [];
  
  for (const wallet of burnerWallets) {
    const keypair = Keypair.fromSecretKey(wallet.secretKey);
    
    // Get token balance
    // Note: In production, you'd fetch the actual token balance
    // For now, we'll sell all tokens
    
    const instructions: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
      // Sell instruction would go here
      // sellTokenInstruction({ ... })
    ];
    
    const message = new TransactionMessage({
      payerKey: keypair.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    
    const tx = new VersionedTransaction(message);
    tx.sign([keypair]);
    transactions.push(tx);
  }
  
  return transactions;
}

