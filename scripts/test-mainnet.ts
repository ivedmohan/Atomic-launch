#!/usr/bin/env npx ts-node

/**
 * MAINNET TEST SCRIPT
 * 
 * This script tests the core functionality with REAL mainnet transactions.
 * Use tiny amounts to verify everything works before doing real launches.
 * 
 * Usage:
 *   npx ts-node scripts/test-mainnet.ts
 * 
 * Or add to package.json:
 *   "scripts": { "test:mainnet": "ts-node scripts/test-mainnet.ts" }
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import * as readline from 'readline';

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const JITO_BLOCK_ENGINE = 'https://mainnet.block-engine.jito.wtf';

// Test amounts (TINY for safety)
const TEST_CONFIG = {
  walletCount: 3,          // Only 3 wallets for test
  fundAmountPerWallet: 0.001, // 0.001 SOL each
  jitoTipAmount: 0.0001,   // Tiny tip
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ATOMIC LAUNCH - MAINNET TEST SCRIPT');
  console.log('='.repeat(60));
  console.log('\n⚠️  WARNING: This uses REAL SOL on mainnet!');
  console.log(`    Test Amount: ~${(TEST_CONFIG.walletCount * TEST_CONFIG.fundAmountPerWallet + 0.001).toFixed(4)} SOL\n`);

  // Get private key from user
  const privateKeyInput = await question('Enter your wallet private key (base58): ');
  
  let mainWallet: Keypair;
  try {
    mainWallet = Keypair.fromSecretKey(bs58.decode(privateKeyInput.trim()));
    console.log(`\n✅ Loaded wallet: ${mainWallet.publicKey.toBase58()}`);
  } catch (e) {
    console.error('❌ Invalid private key format');
    process.exit(1);
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(mainWallet.publicKey);
  const balanceSOL = balance / LAMPORTS_PER_SOL;
  console.log(`💰 Balance: ${balanceSOL.toFixed(4)} SOL`);

  const requiredSOL = TEST_CONFIG.walletCount * TEST_CONFIG.fundAmountPerWallet + 0.002;
  if (balanceSOL < requiredSOL) {
    console.error(`❌ Insufficient balance. Need at least ${requiredSOL.toFixed(4)} SOL`);
    process.exit(1);
  }

  const proceed = await question('\nProceed with test? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    process.exit(0);
  }

  console.log('\n--- TEST 1: Generate Burner Wallets ---');
  const burnerWallets: Keypair[] = [];
  for (let i = 0; i < TEST_CONFIG.walletCount; i++) {
    const wallet = Keypair.generate();
    burnerWallets.push(wallet);
    console.log(`  Wallet ${i + 1}: ${wallet.publicKey.toBase58()}`);
  }

  console.log('\n--- TEST 2: Fund Burner Wallets ---');
  const fundTx = new Transaction();
  
  for (const wallet of burnerWallets) {
    fundTx.add(
      SystemProgram.transfer({
        fromPubkey: mainWallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: TEST_CONFIG.fundAmountPerWallet * LAMPORTS_PER_SOL,
      })
    );
  }

  try {
    const fundSig = await sendAndConfirmTransaction(connection, fundTx, [mainWallet]);
    console.log(`  ✅ Funded! Signature: ${fundSig}`);
    console.log(`  📎 https://solscan.io/tx/${fundSig}`);
  } catch (e) {
    console.error('  ❌ Funding failed:', e);
    process.exit(1);
  }

  // Wait for balances to update
  await new Promise(r => setTimeout(r, 2000));

  // Verify balances
  console.log('\n--- TEST 3: Verify Balances ---');
  for (let i = 0; i < burnerWallets.length; i++) {
    const bal = await connection.getBalance(burnerWallets[i].publicKey);
    console.log(`  Wallet ${i + 1}: ${(bal / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  }

  console.log('\n--- TEST 4: Test Jito Connection ---');
  try {
    const response = await fetch(`${JITO_BLOCK_ENGINE}/api/v1/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTipAccounts',
        params: [],
      }),
    });
    const result = await response.json();
    if (result.result) {
      console.log(`  ✅ Jito connected! Tip accounts available: ${result.result.length}`);
    } else {
      console.log('  ⚠️ Jito response:', JSON.stringify(result));
    }
  } catch (e) {
    console.error('  ❌ Jito connection failed:', e);
  }

  console.log('\n--- TEST 5: Reclaim SOL from Burner Wallets ---');
  const reclaimNow = await question('Reclaim SOL back to main wallet? (yes/no): ');
  
  if (reclaimNow.toLowerCase() === 'yes') {
    let totalReclaimed = 0;
    
    for (let i = 0; i < burnerWallets.length; i++) {
      const wallet = burnerWallets[i];
      const bal = await connection.getBalance(wallet.publicKey);
      
      if (bal > 5000) { // More than rent
        const reclaimAmount = bal - 5000; // Leave tiny bit for rent
        
        const reclaimTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: mainWallet.publicKey,
            lamports: reclaimAmount,
          })
        );

        try {
          const sig = await sendAndConfirmTransaction(connection, reclaimTx, [wallet]);
          totalReclaimed += reclaimAmount;
          console.log(`  ✅ Wallet ${i + 1}: Reclaimed ${(reclaimAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
        } catch (e) {
          console.error(`  ❌ Wallet ${i + 1}: Failed to reclaim`);
        }
      }
    }
    
    console.log(`\n  💰 Total Reclaimed: ${(totalReclaimed / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  }

  // Export wallet backup
  console.log('\n--- Wallet Backup (Save This!) ---');
  const backup = {
    mainWallet: mainWallet.publicKey.toBase58(),
    burnerWallets: burnerWallets.map((w, i) => ({
      index: i,
      publicKey: w.publicKey.toBase58(),
      secretKey: bs58.encode(w.secretKey),
    })),
    timestamp: new Date().toISOString(),
  };
  
  console.log('\n' + JSON.stringify(backup, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(60) + '\n');

  rl.close();
}

main().catch(console.error);


