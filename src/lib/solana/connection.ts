import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getConfig } from '@/lib/config';

// RPC Configuration
const RPC_ENDPOINTS = {
  mainnet: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  mock: 'https://api.devnet.solana.com',
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


