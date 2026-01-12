import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { PUMP_FUN_PROGRAM_ID } from '@/types';

// Pump.fun Program Constants
const PUMP_PROGRAM = new PublicKey(PUMP_FUN_PROGRAM_ID);
const PUMP_GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
const PUMP_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
const PUMP_EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Instruction discriminators (first 8 bytes of sha256 hash of instruction name)
const CREATE_DISCRIMINATOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

interface CreateTokenParams {
  name: string;
  symbol: string;
  uri: string; // IPFS URI for metadata
  creator: PublicKey;
  mint: Keypair;
}

interface BuyTokenParams {
  mint: PublicKey;
  buyer: PublicKey;
  solAmount: number; // in lamports
  slippageBps: number;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
}

interface SellTokenParams {
  mint: PublicKey;
  seller: PublicKey;
  tokenAmount: bigint;
  slippageBps: number;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  sellerTokenAccount: PublicKey;
}

// Derive bonding curve PDA
export function deriveBondingCurve(mint: PublicKey): PublicKey {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PUMP_PROGRAM
  );
  return bondingCurve;
}

// Derive associated bonding curve (token account for bonding curve)
export function deriveAssociatedBondingCurve(
  mint: PublicKey,
  bondingCurve: PublicKey
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM
  );
  return ata;
}

// Get associated token address
export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM
  );
  return ata;
}

// Create token instruction
export function createTokenInstruction(params: CreateTokenParams): TransactionInstruction {
  const { name, symbol, uri, creator, mint } = params;
  
  const bondingCurve = deriveBondingCurve(mint.publicKey);
  const associatedBondingCurve = deriveAssociatedBondingCurve(mint.publicKey, bondingCurve);
  const creatorTokenAccount = getAssociatedTokenAddress(mint.publicKey, creator);

  // Encode instruction data
  const nameBuffer = Buffer.from(name);
  const symbolBuffer = Buffer.from(symbol);
  const uriBuffer = Buffer.from(uri);
  
  const data = Buffer.concat([
    CREATE_DISCRIMINATOR,
    Buffer.from([nameBuffer.length, 0, 0, 0]), // name length (u32 LE)
    nameBuffer,
    Buffer.from([symbolBuffer.length, 0, 0, 0]), // symbol length (u32 LE)
    symbolBuffer,
    Buffer.from([uriBuffer.length, 0, 0, 0]), // uri length (u32 LE)
    uriBuffer,
  ]);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM,
    keys: [
      { pubkey: mint.publicKey, isSigner: true, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'), isSigner: false, isWritable: true }, // Metaplex metadata
      { pubkey: PublicKey.default, isSigner: false, isWritable: true }, // metadata account
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// Buy token instruction
export function buyTokenInstruction(params: BuyTokenParams): TransactionInstruction {
  const { mint, buyer, solAmount, slippageBps, bondingCurve, associatedBondingCurve } = params;
  
  const buyerTokenAccount = getAssociatedTokenAddress(mint, buyer);
  
  // Calculate max SOL with slippage
  const maxSolCost = BigInt(Math.floor(solAmount * (1 + slippageBps / 10000)));
  
  // Encode instruction data: amount (u64) + maxSolCost (u64)
  // For pump.fun buy, we specify the token amount we want to buy
  // We'll use 0 for amount to let it calculate based on SOL spent
  const data = Buffer.alloc(8 + 8 + 8);
  CREATE_DISCRIMINATOR.copy(data, 0);
  BUY_DISCRIMINATOR.copy(data, 0);
  
  // Amount of tokens to buy (0 = buy with all provided SOL)
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(0), 0);
  
  // Max SOL to spend
  const maxSolBuffer = Buffer.alloc(8);
  maxSolBuffer.writeBigUInt64LE(maxSolCost, 0);
  
  const instructionData = Buffer.concat([
    BUY_DISCRIMINATOR,
    amountBuffer,
    maxSolBuffer,
  ]);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM,
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
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
}

// Sell token instruction
export function sellTokenInstruction(params: SellTokenParams): TransactionInstruction {
  const { mint, seller, tokenAmount, slippageBps, bondingCurve, associatedBondingCurve, sellerTokenAccount } = params;
  
  // Calculate min SOL with slippage
  const minSolOutput = BigInt(0); // Accept any amount for now
  
  // Encode instruction data
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(tokenAmount, 0);
  
  const minSolBuffer = Buffer.alloc(8);
  minSolBuffer.writeBigUInt64LE(minSolOutput, 0);
  
  const instructionData = Buffer.concat([
    SELL_DISCRIMINATOR,
    amountBuffer,
    minSolBuffer,
  ]);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM,
    keys: [
      { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
}

// Fetch bonding curve data
export async function getBondingCurveData(
  connection: Connection,
  mint: PublicKey
): Promise<{
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  realSolReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
} | null> {
  const bondingCurve = deriveBondingCurve(mint);
  const accountInfo = await connection.getAccountInfo(bondingCurve);
  
  if (!accountInfo) return null;
  
  // Parse bonding curve data (layout may vary, this is approximate)
  const data = accountInfo.data;
  
  return {
    virtualTokenReserves: data.readBigUInt64LE(8),
    virtualSolReserves: data.readBigUInt64LE(16),
    realTokenReserves: data.readBigUInt64LE(24),
    realSolReserves: data.readBigUInt64LE(32),
    tokenTotalSupply: data.readBigUInt64LE(40),
    complete: data[48] === 1,
  };
}


