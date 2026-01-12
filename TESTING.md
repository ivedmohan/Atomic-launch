# Testing Guide

## Network Modes

| Mode | Privacy Features | Pump.fun | Use Case |
|------|-----------------|----------|----------|
| `devnet` | Mock only | ❌ | UI testing |
| `mainnet` | Real | ✅ | Full demo |

## Devnet Testing

### Setup
```bash
# .env.local
NEXT_PUBLIC_NETWORK_MODE=devnet
RPC_URL=https://api.devnet.solana.com
```

### What Works on Devnet
- ✅ Wallet generation (50 burner wallets)
- ✅ Devnet SOL funding (via faucet)
- ✅ Privacy UI (selector, score, panels)
- ✅ Reclaim SOL back to main wallet
- ❌ Real privacy operations (Privacy Cash/ShadowWire)
- ❌ Pump.fun launches (mainnet only)

### Test Steps
1. Start app: `npm run dev`
2. Connect Phantom wallet (set to devnet)
3. Generate 5-10 burner wallets
4. Use faucet to get devnet SOL
5. Fund burners (normal mode)
6. Test "Reclaim" to get SOL back
7. Verify UI shows correct balances

---

## Mainnet Testing

### Setup
```bash
# .env.local
NEXT_PUBLIC_NETWORK_MODE=mainnet
RPC_URL=https://your-helius-rpc-url
PLATFORM_FEE_WALLET=your-wallet-address
```

### Privacy Testing (Recommended: ~0.3 SOL)
1. Set privacy method to "Privacy Cash"
2. Shield 0.1 SOL → verify commitment
3. Distribute to 3 burners → verify random timing
4. Check privacy score shows "High"

### Full Launch Test (Optional: ~0.5 SOL)
1. Shield 0.3 SOL
2. Distribute to 5 burners
3. Configure test token
4. Launch with minimal buy amount

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/launch` | 3 requests | 1 minute |
| `/api/reclaim` | 5 requests | 1 minute |
| `/api/shield` | 5 requests | 1 minute |
| `/api/balance` | 20 requests | 10 seconds |

---

## Validation

All inputs are validated:
- **Token name**: 1-32 chars, alphanumeric + spaces
- **Token symbol**: 1-10 chars, alphanumeric only
- **Buy amount**: 0.1 - 100 SOL
- **Slippage**: 0.5% - 50%
- **Wallets**: 1-50 per launch
- **Public keys**: Valid Solana format
