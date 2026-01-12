'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { getConfig } from '@/lib/config';
import { 
  Rocket, 
  Image as ImageIcon,
  Twitter,
  MessageCircle,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  FlaskConical,
} from 'lucide-react';

export function LaunchPanel() {
  const { publicKey } = useWallet();
  const { 
    burnerWallets, 
    tokenConfig, 
    setTokenConfig,
    launchState,
    setLaunchState,
    setTokenMint,
    tokenMint,
    setWalletFunded,
  } = useWalletStore();

  const [isLaunching, setIsLaunching] = useState(false);
  const config = getConfig();

  const allFunded = burnerWallets.length > 0 && burnerWallets.every(w => w.funded);
  const isConfigValid = tokenConfig.name && tokenConfig.symbol && tokenConfig.imageUrl;

  // In mock mode, we can skip funding requirement
  const canLaunch = config.isMockMode 
    ? isConfigValid && burnerWallets.length > 0
    : isConfigValid && allFunded;

  const handleLaunch = async () => {
    if (!isConfigValid) {
      alert('Please fill in all required token information');
      return;
    }

    if (!config.isMockMode && !allFunded) {
      alert('Please fund your wallets first');
      return;
    }

    setIsLaunching(true);
    setLaunchState({ step: 'launching' });

    try {
      // Choose endpoint based on mode
      const endpoint = config.isMockMode ? '/api/launch/mock' : '/api/launch';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenConfig,
          wallets: burnerWallets.map(w => ({
            publicKey: w.publicKey,
            secretKey: Array.from(w.secretKey),
          })),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Launch failed');
      }

      // In mock mode, simulate funded wallets
      if (config.isMockMode) {
        burnerWallets.forEach((_, index) => {
          setWalletFunded(index, true);
        });
      }

      setTokenMint(result.mintAddress);
      setLaunchState({ 
        step: 'completed', 
        txSignature: result.signature,
      });

    } catch (err) {
      console.error('Launch error:', err);
      setLaunchState({ 
        step: 'error', 
        error: err instanceof Error ? err.message : 'Launch failed',
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Card variant="gradient">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#ff44aa]/20 to-[#ff44aa]/5">
              <Rocket className="w-6 h-6 text-[#ff44aa]" />
            </div>
            <div>
              <CardTitle>Launch Token</CardTitle>
              <CardDescription>
                {config.isMockMode 
                  ? '🧪 Test Mode - Simulated launch' 
                  : 'Configure and deploy your token on Pump.fun'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.isMockMode && (
              <Badge variant="warning">
                <FlaskConical className="w-3 h-3 mr-1" />
                Mock
              </Badge>
            )}
            {launchState.step === 'completed' && (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Launched
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mock Mode Notice */}
        {config.isMockMode && (
          <div className="bg-[#ffaa00]/10 rounded-xl p-4 border border-[#ffaa00]/30">
            <div className="flex items-start gap-3">
              <FlaskConical className="w-5 h-5 text-[#ffaa00] mt-0.5" />
              <div className="text-sm">
                <p className="text-[#ffaa00] font-medium mb-1">Test Mode Active</p>
                <p className="text-[#aa8844]">
                  No real tokens will be created. This mode lets you test the UI flow 
                  without spending any SOL. Set <code className="bg-[#0a0a12] px-1 rounded">NEXT_PUBLIC_NETWORK_MODE=mainnet</code> in .env.local for production.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Token Info */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Token Name *"
            placeholder="My Awesome Token"
            value={tokenConfig.name}
            onChange={(e) => setTokenConfig({ name: e.target.value })}
            maxLength={32}
          />
          <Input
            label="Symbol *"
            placeholder="MAT"
            value={tokenConfig.symbol}
            onChange={(e) => setTokenConfig({ symbol: e.target.value.toUpperCase() })}
            maxLength={10}
          />
        </div>

        <div>
          <Input
            label="Description"
            placeholder="A revolutionary memecoin..."
            value={tokenConfig.description}
            onChange={(e) => setTokenConfig({ description: e.target.value })}
          />
        </div>

        <div>
          <Input
            label="Image URL *"
            placeholder="https://example.com/token-image.png"
            value={tokenConfig.imageUrl}
            onChange={(e) => setTokenConfig({ imageUrl: e.target.value })}
            icon={<ImageIcon className="w-4 h-4" />}
          />
          <p className="text-xs text-[#6666aa] mt-2">
            Use IPFS, Imgur, or any public image URL (recommended: 500x500px)
          </p>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ffaa00]" />
            Social Links (Optional)
          </h4>
          <div className="grid grid-cols-1 gap-3">
            <Input
              placeholder="Twitter URL"
              value={tokenConfig.twitter || ''}
              onChange={(e) => setTokenConfig({ twitter: e.target.value })}
              icon={<Twitter className="w-4 h-4" />}
            />
            <Input
              placeholder="Telegram URL"
              value={tokenConfig.telegram || ''}
              onChange={(e) => setTokenConfig({ telegram: e.target.value })}
              icon={<MessageCircle className="w-4 h-4" />}
            />
            <Input
              placeholder="Website URL"
              value={tokenConfig.website || ''}
              onChange={(e) => setTokenConfig({ website: e.target.value })}
              icon={<Globe className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Preview */}
        {tokenConfig.imageUrl && (
          <div className="bg-[#0f0f1a] rounded-xl p-4 border border-[#1f1f35]">
            <h4 className="text-sm font-semibold text-white mb-3">Preview</h4>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#1a1a2e] overflow-hidden border border-[#2a2a4a]">
                <img
                  src={tokenConfig.imageUrl}
                  alt="Token preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231a1a2e" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%236666aa" font-size="14">No Image</text></svg>';
                  }}
                />
              </div>
              <div>
                <p className="text-white font-bold text-lg">
                  {tokenConfig.name || 'Token Name'}
                </p>
                <p className="text-[#00ff88] font-mono text-sm">
                  ${tokenConfig.symbol || 'SYMBOL'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {launchState.step === 'completed' && tokenMint && (
          <div className="bg-[#00ff88]/10 rounded-xl p-4 border border-[#00ff88]/30">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
              <span className="text-[#00ff88] font-semibold">
                {config.isMockMode ? '🧪 Mock Launch Complete!' : 'Launch Successful!'}
              </span>
            </div>
            <p className="text-sm text-[#8888aa] mb-3">
              {config.isMockMode 
                ? `Simulated: Token "${tokenConfig.name}" distributed to ${burnerWallets.length} wallets.`
                : `Your token has been created and distributed to ${burnerWallets.length} wallets.`
              }
            </p>
            {!config.isMockMode && (
              <div className="flex gap-3">
                <a
                  href={`https://pump.fun/${tokenMint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#00ff88] hover:underline"
                >
                  View on Pump.fun
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://solscan.io/token/${tokenMint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#4488ff] hover:underline"
                >
                  View on Solscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {config.isMockMode && (
              <p className="text-xs text-[#6666aa] mt-2 font-mono">
                Mock Mint: {tokenMint}
              </p>
            )}
          </div>
        )}

        {launchState.step === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-[#ff4444]/10 rounded-xl border border-[#ff4444]/30">
            <AlertCircle className="w-5 h-5 text-[#ff4444]" />
            <span className="text-[#ff4444] text-sm">
              {launchState.error || 'Launch failed. Please try again.'}
            </span>
          </div>
        )}

        {/* Launch Button */}
        <Button
          onClick={handleLaunch}
          isLoading={isLaunching}
          disabled={!canLaunch || launchState.step === 'completed'}
          size="lg"
          className="w-full"
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {config.isMockMode ? 'Simulating Launch...' : 'Launching Token...'}
            </>
          ) : launchState.step === 'completed' ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {config.isMockMode ? 'Mock Complete!' : 'Token Launched!'}
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              {config.isMockMode ? '🧪 Test Launch' : 'Launch & Snipe'}
            </>
          )}
        </Button>

        {/* Requirements */}
        {!config.isMockMode && !allFunded && burnerWallets.length > 0 && (
          <p className="text-center text-sm text-[#ffaa00]">
            Fund your wallets before launching
          </p>
        )}
        {burnerWallets.length === 0 && (
          <p className="text-center text-sm text-[#6666aa]">
            Generate {config.isMockMode ? '' : 'and fund '}wallets to enable launching
          </p>
        )}
      </CardContent>
    </Card>
  );
}
