# Atomic Launch - Configuration Guide

## 🔢 Platform Limits

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Max Wallets** | 50 | Jito bundle limit (5 tx × 10 wallets) |
| **Min Wallets** | 5 | Minimum for meaningful distribution |
| **Platform Fee** | 0.5 SOL | Fixed fee per launch |
| **Gas per Wallet** | ~0.01 SOL | Transaction fees |

---

## 💰 Recommended Amounts

### Cost Calculator

```
Total Cost = Platform Fee + Gas Buffer + Buy Amount

Where:
  Platform Fee = 0.5 SOL (fixed)
  Gas Buffer   = 0.01 SOL × number_of_wallets
  Buy Amount   = Your choice
```

### Example Costs

| Wallets | Buy Amount | Gas | Platform Fee | **Total Needed** |
|---------|------------|-----|--------------|------------------|
| 10 | 1 SOL | 0.1 SOL | 0.5 SOL | **1.6 SOL** |
| 20 | 5 SOL | 0.2 SOL | 0.5 SOL | **5.7 SOL** |
| 50 | 10 SOL | 0.5 SOL | 0.5 SOL | **11 SOL** |
| 50 | 20 SOL | 0.5 SOL | 0.5 SOL | **21 SOL** |

### Recommended Launch Sizes

| Launch Size | Total Buy | Per Wallet | Use Case |
|-------------|-----------|------------|----------|
| **Micro** | 1-2 SOL | 0.02-0.04 SOL | Testing |
| **Small** | 2-5 SOL | 0.04-0.1 SOL | Low budget |
| **Medium** | 5-20 SOL | 0.1-0.4 SOL | Standard launch |
| **Large** | 20-50 SOL | 0.4-1.0 SOL | Serious launch |

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```bash
# Network Mode: 'mock' | 'devnet' | 'mainnet'
# - mock: UI testing, no real transactions
# - devnet: Solana devnet (Pump.fun doesn't exist here!)
# - mainnet: Production
NEXT_PUBLIC_NETWORK_MODE=mainnet

# Frontend RPC (balance display, UI)
# Can use public for development
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com

# Backend RPC (API routes, actual transactions)
# ⚠️ MUST be fast/private for production!
RPC_URL=https://api.mainnet-beta.solana.com

# Jito Block Engine
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf

# YOUR Platform Fee Wallet
# ⚠️ CHANGE THIS to your own wallet!
PLATFORM_FEE_WALLET=YOUR_WALLET_ADDRESS_HERE
```

---

## 🔐 RPC Configuration

### Which RPC for What?

| Variable | Purpose | Can Use Public? | Recommended |
|----------|---------|-----------------|-------------|
| `NEXT_PUBLIC_RPC_URL` | Frontend (UI, balances) | ✅ Yes | Private for speed |
| `RPC_URL` | Backend (transactions) | ⚠️ Risky | **Private required** |

### Why Private RPC for Production?

Public Solana RPC (`api.mainnet-beta.solana.com`):
- ❌ Rate limited (10-100 req/s)
- ❌ Slow response times (500ms-2s)
- ❌ Often fails during network congestion
- ❌ Not suitable for time-sensitive transactions

Private RPC (Helius, QuickNode, Triton):
- ✅ High throughput (1000+ req/s)
- ✅ Fast response (<100ms)
- ✅ Reliable during congestion
- ✅ Priority transaction routing

### Recommended RPC Providers

| Provider | Cost | Speed | Link |
|----------|------|-------|------|
| **Helius** | $50-200/mo | ⚡⚡⚡ | [helius.dev](https://helius.dev) |
| **QuickNode** | $50-100/mo | ⚡⚡ | [quicknode.com](https://quicknode.com) |
| **Triton** | $100/mo | ⚡⚡⚡ | [triton.one](https://triton.one) |
| **Alchemy** | Free tier | ⚡⚡ | [alchemy.com](https://alchemy.com) |

---

## 🎯 Jito Configuration

### Block Engine URL

The public endpoint works for most cases:
```
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
```

### When to Upgrade?

Consider Jito's authenticated access if:
- Launching during high network congestion
- Need guaranteed bundle inclusion
- Running multiple launches per hour

See: [Jito Documentation](https://jito-labs.gitbook.io/mev/)

---

## 🛡️ Security Architecture

### What Stays Client-Side (Browser)
- ✅ Burner wallet generation (keypairs)
- ✅ Private keys (never leave browser)
- ✅ Wallet backup file

### What Goes Server-Side (API)
- ✅ Transaction building
- ✅ Jito bundle submission
- ✅ RPC communication
- ⚠️ Secret keys are sent for signing (but only to YOUR server)

### Security Considerations

1. **HTTPS Required** - Always use HTTPS in production
2. **API Keys** - Never expose RPC API keys in frontend code
3. **Rate Limiting** - Consider adding rate limits to API routes
4. **Validation** - All inputs are validated server-side

---

## 📈 Scalability

### Current Architecture

```
User Browser          Next.js Serverless          Solana/Jito
     │                       │                        │
     ├──Generate Wallets────►│                        │
     │                       │                        │
     ├──Fund Wallets────────►│──────────────────────►│
     │                       │                        │
     ├──Launch Token────────►│──Build Bundle─────────►│
     │                       │                        │
     │◄──Result──────────────│◄──Bundle Status────────│
```

### Handles Well
- ✅ Multiple concurrent users (each request independent)
- ✅ Serverless auto-scaling
- ✅ Stateless design

### Limitations
- ⚠️ No queue system (bursts may overwhelm)
- ⚠️ No transaction retry logic
- ⚠️ Shared RPC may bottleneck

### For High Traffic (Future)
- Add Redis for rate limiting
- Add job queue (Bull, SQS) for launches
- Dedicated RPC per request type
- WebSocket for real-time status

---

## 🚀 Production Checklist

- [ ] Set `NEXT_PUBLIC_NETWORK_MODE=mainnet`
- [ ] Configure private RPC (`RPC_URL`)
- [ ] Set your fee wallet (`PLATFORM_FEE_WALLET`)
- [ ] Test with small amounts first (2-3 wallets, 0.1 SOL)
- [ ] Enable HTTPS
- [ ] Set up monitoring/logging
- [ ] Consider rate limiting

