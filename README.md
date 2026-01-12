# Stealth Launch 🚀

**The first privacy-preserving token launchpad for Pump.fun on Solana.**

Launch your meme coin without getting doxxed. Stealth Launch breaks on-chain links between your wallet and your token using ZK proofs and Bulletproofs.

## Features

- 🔒 **Privacy Cash Integration** — Shield SOL with ZK proofs, withdraw to burners with zero on-chain link
- 🛡️ **ShadowWire Integration** — Hide transaction amounts using Bulletproofs
- ⚡ **Atomic Jito Bundles** — Launch token + snipe in the same block
- 🎲 **Stealth Distribution** — Randomized timing (30s-5min) and amounts (±15%)
- 📊 **Privacy Score** — See how unlinkable your launch is
- 💼 **50 Burner Wallets** — Maximum distribution for natural-looking buys

## How It Works

```
Your Wallet → Shield (ZK) → Privacy Pool → Stealth Withdraw → Burner Wallets → Atomic Launch
                                    ↑
                              UNLINKABLE
```

1. **Generate** burner wallets (up to 50)
2. **Shield** your SOL into Privacy Cash or ShadowWire pool
3. **Distribute** privately to burners with randomized timing
4. **Launch** token + snipe atomically via Jito bundle
5. **Stay anonymous** — no on-chain connection to you

## Tech Stack

- **Next.js 16** — React 19 with App Router
- **Solana Web3.js** — Blockchain interactions
- **Jito Bundles** — MEV-protected atomic transactions
- **Privacy Cash SDK** — ZK proof shielding
- **ShadowWire SDK** — Bulletproof private transfers
- **Zustand** — State management
- **TailwindCSS** — Styling

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Environment Variables

```env
# Network mode: 'mainnet' | 'devnet' | 'mock'
NEXT_PUBLIC_NETWORK_MODE=mainnet

# RPC URLs
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
RPC_URL=your-private-rpc-url

# Jito
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf

# Platform Fee Wallet
PLATFORM_FEE_WALLET=your-wallet-address
```

## Privacy Providers

| Provider | Method | Privacy Level | Use Case |
|----------|--------|---------------|----------|
| **Privacy Cash** | ZK Merkle Tree | 🔥 High | Full unlinking |
| **ShadowWire** | Bulletproofs | ⚡ Medium | Hidden amounts |

## Hackathon Submission

Built for **Solana Privacy Hack 2026**

- 🏆 Open Track ($18k)
- ⭐ Privacy Cash Bounty ($15k)
- ⭐ ShadowWire Bounty ($15k)
- 🚀 Helius Bounty ($5k)

## License

**⚠️ Source Available — NOT Open Source**

This software is proprietary. You may view the source code for educational purposes only.

- ❌ No commercial use
- ❌ No copying or redistribution
- ❌ No derivative works
- ❌ No use in production

See [LICENSE](./LICENSE) for details.

---

Built with ❤️ for the Solana Privacy Hack 2026
