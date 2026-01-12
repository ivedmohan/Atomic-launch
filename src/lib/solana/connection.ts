import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getConfig } from '@/lib/config';

// RPC Configuration - Use env vars for custom RPC
const CUSTOM_RPC = process.env.NEXT_PUBLIC_RPC_URL;

const RPC_ENDPOINTS = {
  mainnet: CUSTOM_RPC || 'https://api.mainnet-beta.solana.com',
  devnet: CUSTOM_RPC || 'https://api.devnet.solana.com',
  mock: CUSTOM_RPC || 'https://api.devnet.solana.com',
};

let connectionInstance: Connection | null = null;
let currentNetwork: string | null = null;

export function getConnection(): Connection {
  const config = getConfig();
  const network = config.network;

  // Recreate connection if network changed
  if (!connectionInstance || currentNetwork !== network) {
    connectionInstance = new Connection(RPC_ENDPOINTS[network], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
    currentNetwork = network;
  }
  return connectionInstance;
}

export function getRPCUrl(): string {
  const config = getConfig();
  return RPC_ENDPOINTS[config.network];
}

export function getNetworkType() {
  return getConfig().network;
}


