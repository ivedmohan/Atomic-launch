'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { shortenAddress, downloadJSON, formatSOL } from '@/lib/utils';
import { 
  Wallet, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Shield,
  AlertTriangle,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { DEFAULT_WALLET_COUNT, MIN_WALLET_COUNT, MAX_WALLET_COUNT } from '@/types';

export function WalletGenerator() {
  const {
    burnerWallets,
    generateWallets,
    clearWallets,
    exportWallets,
    importWallets,
    recoverFromStorage,
  } = useWalletStore();

  const [walletCount, setWalletCount] = useState(DEFAULT_WALLET_COUNT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Check for existing wallets on mount
  useEffect(() => {
    if (recoverFromStorage() && burnerWallets.length > 0) {
      setShowRecoveryModal(true);
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setHasDownloaded(false);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    generateWallets(walletCount);
    setIsGenerating(false);
  };

  const handleDownloadBackup = () => {
    const wallets = exportWallets();
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      network: 'mainnet-beta',
      wallets: wallets.map((w, i) => ({
        index: i,
        publicKey: w.publicKey,
        secretKey: w.secretKey,
      })),
    };
    
    downloadJSON(backupData, `atomic-launch-backup-${Date.now()}.json`);
    setHasDownloaded(true);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.wallets && Array.isArray(data.wallets)) {
          importWallets(data.wallets);
          setHasDownloaded(true);
        }
      } catch (err) {
        console.error('Failed to import wallets:', err);
        alert('Invalid backup file format');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCopyAddress = async (address: string, index: number) => {
    await navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearWallets = () => {
    if (confirm('Are you sure? This will delete all generated wallets. Make sure you have backed them up!')) {
      clearWallets();
      setHasDownloaded(false);
    }
  };

  return (
    <>
      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card variant="glow" className="max-w-md w-full animate-in fade-in zoom-in duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-[#ffaa00]/10">
                  <AlertTriangle className="w-6 h-6 text-[#ffaa00]" />
                </div>
                <CardTitle>Session Recovery</CardTitle>
              </div>
              <CardDescription>
                Found {burnerWallets.length} wallets from a previous session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[#8888aa] text-sm mb-6">
                Would you like to continue with these wallets or start fresh?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    clearWallets();
                    setShowRecoveryModal(false);
                  }}
                >
                  Start Fresh
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    setHasDownloaded(true);
                    setShowRecoveryModal(false);
                  }}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card variant="gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00ff88]/20 to-[#00ff88]/5">
                <Wallet className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div>
                <CardTitle>Burner Wallets</CardTitle>
                <CardDescription>Generate ephemeral wallets for your launch</CardDescription>
              </div>
            </div>
            {burnerWallets.length > 0 && (
              <Badge variant="success">{burnerWallets.length} wallets</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {burnerWallets.length === 0 ? (
            <>
              {/* Wallet Count Input */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Input
                    label="Number of Wallets"
                    type="number"
                    min={MIN_WALLET_COUNT}
                    max={MAX_WALLET_COUNT}
                    value={walletCount}
                    onChange={(e) => setWalletCount(Math.min(MAX_WALLET_COUNT, Math.max(MIN_WALLET_COUNT, parseInt(e.target.value) || MIN_WALLET_COUNT)))}
                    icon={<Wallet className="w-4 h-4" />}
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  size="lg"
                  className="min-w-[160px]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>

              {/* Or Import */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2a2a4a]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[#12121f] text-[#6666aa] uppercase tracking-wider">
                    or import existing
                  </span>
                </div>
              </div>

              <div>
                <label className="w-full">
                  <div className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-[#2a2a4a] rounded-xl cursor-pointer hover:border-[#00ff88]/50 hover:bg-[#00ff88]/5 transition-all duration-200">
                    <Upload className="w-5 h-5 text-[#6666aa]" />
                    <span className="text-[#8888aa]">Import backup file</span>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-[#1a1a2e] rounded-xl border border-[#2a2a4a]">
                <Shield className="w-5 h-5 text-[#00ff88] mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-white font-medium mb-1">Keys Stay Local</p>
                  <p className="text-[#8888aa]">
                    Private keys are generated and stored only in your browser. 
                    They never leave your device.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Backup Warning */}
              {!hasDownloaded && (
                <div className="flex items-start gap-3 p-4 bg-[#ff4444]/10 rounded-xl border border-[#ff4444]/30 animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-[#ff4444] mt-0.5 flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <p className="text-white font-medium mb-1">Backup Required!</p>
                    <p className="text-[#ff8888]">
                      Download your wallet backup before proceeding. 
                      Losing these keys means losing any funds!
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadBackup}
                    variant="danger"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Backup Now
                  </Button>
                </div>
              )}

              {/* Success State */}
              {hasDownloaded && (
                <div className="flex items-center gap-3 p-4 bg-[#00ff88]/10 rounded-xl border border-[#00ff88]/30">
                  <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
                  <span className="text-[#00ff88] text-sm font-medium">
                    Backup downloaded! You can proceed safely.
                  </span>
                </div>
              )}

              {/* Wallet List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#2a2a4a] scrollbar-track-transparent">
                {burnerWallets.map((wallet, index) => (
                  <div
                    key={wallet.publicKey}
                    className="flex items-center justify-between p-3 bg-[#0f0f1a] rounded-xl border border-[#1f1f35] hover:border-[#2a2a4a] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88]/20 to-[#00ff88]/5 flex items-center justify-center text-xs font-mono text-[#00ff88]">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-mono text-sm text-white">
                          {shortenAddress(wallet.publicKey, 6)}
                        </p>
                        <p className="text-xs text-[#6666aa]">
                          {wallet.balance > 0 ? `${formatSOL(wallet.balance)} SOL` : 'Not funded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={wallet.funded ? 'success' : 'default'}>
                        {wallet.funded ? 'Funded' : 'Empty'}
                      </Badge>
                      <button
                        onClick={() => handleCopyAddress(wallet.publicKey, index)}
                        className="p-2 text-[#6666aa] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#1f1f35]">
                <Button
                  onClick={handleDownloadBackup}
                  variant="secondary"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Backup
                </Button>
                <Button
                  onClick={handleClearWallets}
                  variant="ghost"
                  className="text-[#ff4444] hover:bg-[#ff4444]/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

