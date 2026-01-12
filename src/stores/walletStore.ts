import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { 
  BurnerWallet, 
  TokenConfig, 
  LaunchConfig, 
  LaunchState,
  WalletHolding,
  DEFAULT_WALLET_COUNT,
  PLATFORM_FEE_SOL,
  GAS_BUFFER_SOL 
} from '@/types';

interface WalletStore {
  // Burner wallets
  burnerWallets: BurnerWallet[];
  
  // Token configuration
  tokenConfig: TokenConfig;
  
  // Launch configuration
  launchConfig: LaunchConfig;
  
  // Current state
  launchState: LaunchState;
  
  // Holdings after launch
  holdings: WalletHolding[];
  
  // Mint address of created token
  tokenMint: string | null;
  
  // Actions
  generateWallets: (count: number) => void;
  clearWallets: () => void;
  updateWalletBalance: (index: number, balance: number) => void;
  setWalletFunded: (index: number, funded: boolean) => void;
  setTokenConfig: (config: Partial<TokenConfig>) => void;
  setLaunchConfig: (config: Partial<LaunchConfig>) => void;
  setLaunchState: (state: Partial<LaunchState>) => void;
  setHoldings: (holdings: WalletHolding[]) => void;
  setTokenMint: (mint: string | null) => void;
  getTotalFundingRequired: () => number;
  exportWallets: () => { publicKey: string; secretKey: string }[];
  importWallets: (wallets: { publicKey: string; secretKey: string }[]) => void;
  recoverFromStorage: () => boolean;
}

// Helper to serialize/deserialize Uint8Array for localStorage
const serializeWallet = (wallet: BurnerWallet): BurnerWallet & { secretKeyBase58: string } => ({
  ...wallet,
  secretKeyBase58: bs58.encode(wallet.secretKey),
});

const deserializeWallet = (wallet: BurnerWallet & { secretKeyBase58?: string }): BurnerWallet => {
  if (wallet.secretKeyBase58) {
    return {
      ...wallet,
      secretKey: bs58.decode(wallet.secretKeyBase58),
    };
  }
  // Handle case where secretKey might already be an array
  return {
    ...wallet,
    secretKey: new Uint8Array(Object.values(wallet.secretKey)),
  };
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      burnerWallets: [],
      tokenConfig: {
        name: '',
        symbol: '',
        description: '',
        imageUrl: '',
      },
      launchConfig: {
        totalBuyAmount: 5,
        walletCount: DEFAULT_WALLET_COUNT,
        slippagePercent: 10,
      },
      launchState: {
        step: 'idle',
      },
      holdings: [],
      tokenMint: null,

      generateWallets: (count: number) => {
        const wallets: BurnerWallet[] = [];
        for (let i = 0; i < count; i++) {
          const keypair = Keypair.generate();
          wallets.push({
            publicKey: keypair.publicKey.toBase58(),
            secretKey: keypair.secretKey,
            index: i,
            balance: 0,
            funded: false,
          });
        }
        set({ burnerWallets: wallets });
      },

      clearWallets: () => {
        set({ 
          burnerWallets: [], 
          launchState: { step: 'idle' },
          holdings: [],
          tokenMint: null,
        });
      },

      updateWalletBalance: (index: number, balance: number) => {
        set(state => ({
          burnerWallets: state.burnerWallets.map(w =>
            w.index === index ? { ...w, balance } : w
          ),
        }));
      },

      setWalletFunded: (index: number, funded: boolean) => {
        set(state => ({
          burnerWallets: state.burnerWallets.map(w =>
            w.index === index ? { ...w, funded } : w
          ),
        }));
      },

      setTokenConfig: (config: Partial<TokenConfig>) => {
        set(state => ({
          tokenConfig: { ...state.tokenConfig, ...config },
        }));
      },

      setLaunchConfig: (config: Partial<LaunchConfig>) => {
        set(state => ({
          launchConfig: { ...state.launchConfig, ...config },
        }));
      },

      setLaunchState: (state: Partial<LaunchState>) => {
        set(s => ({
          launchState: { ...s.launchState, ...state },
        }));
      },

      setHoldings: (holdings: WalletHolding[]) => {
        set({ holdings });
      },

      setTokenMint: (mint: string | null) => {
        set({ tokenMint: mint });
      },

      getTotalFundingRequired: () => {
        const { launchConfig, burnerWallets } = get();
        const buyAmount = launchConfig.totalBuyAmount;
        const gasBuffer = GAS_BUFFER_SOL * burnerWallets.length;
        const platformFee = PLATFORM_FEE_SOL;
        return buyAmount + gasBuffer + platformFee;
      },

      exportWallets: () => {
        return get().burnerWallets.map(w => ({
          publicKey: w.publicKey,
          secretKey: bs58.encode(w.secretKey),
        }));
      },

      importWallets: (wallets: { publicKey: string; secretKey: string }[]) => {
        const burnerWallets: BurnerWallet[] = wallets.map((w, index) => ({
          publicKey: w.publicKey,
          secretKey: bs58.decode(w.secretKey),
          index,
          balance: 0,
          funded: false,
        }));
        set({ burnerWallets });
      },

      recoverFromStorage: () => {
        const { burnerWallets } = get();
        return burnerWallets.length > 0;
      },
    }),
    {
      name: 'atomic-launch-wallets',
      // Custom serialization to handle Uint8Array
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed.state?.burnerWallets) {
            parsed.state.burnerWallets = parsed.state.burnerWallets.map(deserializeWallet);
          }
          return parsed;
        },
        setItem: (name, value) => {
          const toStore = {
            ...value,
            state: {
              ...value.state,
              burnerWallets: value.state.burnerWallets?.map(serializeWallet) || [],
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);


