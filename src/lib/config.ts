// Application Configuration
// Controls testing modes and network selection

export type NetworkMode = 'mainnet' | 'devnet' | 'mock';

// Set this to control the app behavior
export const NETWORK_MODE: NetworkMode = (process.env.NEXT_PUBLIC_NETWORK_MODE as NetworkMode) || 'mock';

// RPC Endpoints - Use env vars to allow custom RPC (e.g., Helius)
const DEVNET_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';

export const RPC_ENDPOINTS = {
  mainnet: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
  devnet: DEVNET_RPC,
  mock: DEVNET_RPC,
};

// Jito Configuration
export const JITO_CONFIG = {
  mainnet: {
    blockEngineUrl: 'https://mainnet.block-engine.jito.wtf',
    enabled: true,
  },
  devnet: {
    blockEngineUrl: '', // Jito doesn't exist on devnet
    enabled: false,
  },
  mock: {
    blockEngineUrl: '',
    enabled: false, // Simulated mode
  },
};

// Feature flags based on network
export const FEATURES = {
  mainnet: {
    realJitoBundles: true,
    realPumpFun: true,
    requiresFunding: true,
    platformFee: 0.5,
  },
  devnet: {
    realJitoBundles: false,
    realPumpFun: false,
    requiresFunding: true, // Can still test funding with devnet SOL
    platformFee: 0,
  },
  mock: {
    realJitoBundles: false,
    realPumpFun: false,
    requiresFunding: false, // Completely simulated
    platformFee: 0,
  },
};

export function getConfig() {
  return {
    network: NETWORK_MODE,
    rpcUrl: RPC_ENDPOINTS[NETWORK_MODE],
    jito: JITO_CONFIG[NETWORK_MODE],
    features: FEATURES[NETWORK_MODE],
    isMockMode: NETWORK_MODE === 'mock',
    isDevnet: NETWORK_MODE === 'devnet',
    isMainnet: NETWORK_MODE === 'mainnet',
  };
}

// Helper to check if we should simulate operations
export function shouldSimulate(): boolean {
  return NETWORK_MODE !== 'mainnet';
}


