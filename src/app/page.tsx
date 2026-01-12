'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { WalletGenerator } from '@/components/WalletGenerator';
import { FundingPanel } from '@/components/FundingPanel';
import { LaunchPanel } from '@/components/LaunchPanel';
import { Dashboard } from '@/components/Dashboard';
import { ReclaimPanel } from '@/components/ReclaimPanel';
import { DevnetFaucet } from '@/components/DevnetFaucet';
import { PrivacySelector } from '@/components/PrivacySelector';
import { PrivacyScore } from '@/components/PrivacyScore';
import { useWalletStore } from '@/stores/walletStore';
import { getConfig } from '@/lib/config';
import { PrivacyMethod } from '@/lib/privacy';
import {
  Rocket,
  Wallet,
  Coins,
  PieChart,
  ChevronRight,
  Zap,
  Shield,
  Users,
  Timer,
} from 'lucide-react';

type TabType = 'wallets' | 'funding' | 'launch' | 'dashboard';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('wallets');
  const [privacyMethod, setPrivacyMethod] = useState<PrivacyMethod>('none');
  const { burnerWallets, launchState } = useWalletStore();

  const allFunded = burnerWallets.length > 0 && burnerWallets.every(w => w.funded);

  const tabs = [
    {
      id: 'wallets' as const,
      label: 'Wallets',
      icon: Wallet,
      description: 'Generate burner wallets',
      completed: burnerWallets.length > 0,
    },
    {
      id: 'funding' as const,
      label: 'Funding',
      icon: Coins,
      description: 'Fund your wallets',
      completed: allFunded,
      disabled: burnerWallets.length === 0,
    },
    {
      id: 'launch' as const,
      label: 'Launch',
      icon: Rocket,
      description: 'Deploy your token',
      completed: launchState.step === 'completed',
      disabled: !allFunded,
    },
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: PieChart,
      description: 'Manage holdings',
      completed: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-[#1f1f35]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#00ff88]/5 to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 mb-6">
                <Zap className="w-4 h-4 text-[#00ff88]" />
                <span className="text-sm text-[#00ff88] font-medium">Powered by Jito Block Engine</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                Launch Tokens <span className="text-[#00ff88]">Atomically</span>
              </h1>
              <p className="text-lg text-[#8888aa] mb-8 max-w-2xl mx-auto">
                Deploy on Pump.fun and snipe with 20-50 wallets in a single block.
                Maximum holders, instant distribution, zero sandwich attacks.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="p-4 rounded-xl bg-[#12121f] border border-[#1f1f35]">
                  <Users className="w-5 h-5 text-[#00ff88] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">20-50</p>
                  <p className="text-xs text-[#6666aa]">Wallets</p>
                </div>
                <div className="p-4 rounded-xl bg-[#12121f] border border-[#1f1f35]">
                  <Timer className="w-5 h-5 text-[#ffaa00] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">~400ms</p>
                  <p className="text-xs text-[#6666aa]">Block Time</p>
                </div>
                <div className="p-4 rounded-xl bg-[#12121f] border border-[#1f1f35]">
                  <Shield className="w-5 h-5 text-[#ff44aa] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-xs text-[#6666aa]">Atomic</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 mb-8 p-2 bg-[#0f0f1a] rounded-2xl border border-[#1f1f35]">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = tab.disabled;

              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-[#00ff88]/20 to-[#00ff88]/10 text-white border border-[#00ff88]/30'
                      : isDisabled
                        ? 'text-[#4a4a6a] cursor-not-allowed'
                        : 'text-[#8888aa] hover:text-white hover:bg-[#1a1a2e]'
                    }
                  `}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#00ff88]' : ''}`} />
                    {tab.completed && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#00ff88]" />
                    )}
                  </div>
                  <span className="font-medium">{tab.label}</span>
                  {index < tabs.length - 1 && !isActive && (
                    <ChevronRight className="w-4 h-4 text-[#2a2a4a] hidden sm:block" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeTab === 'wallets' && (
              <>
                <div className="lg:col-span-2">
                  <WalletGenerator />
                </div>
              </>
            )}

            {activeTab === 'funding' && (
              <>
                <div className="space-y-6">
                  <FundingPanel privacyMethod={privacyMethod} />

                  {/* Privacy Selection */}
                  <div className="bg-[#12121f] rounded-2xl p-6 border border-[#1f1f35]">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      Stealth Mode (Optional)
                    </h3>
                    <PrivacySelector
                      selected={privacyMethod}
                      onChange={setPrivacyMethod}
                    />
                    <p className="text-xs text-zinc-500 mt-3">
                      Enable privacy to shield your identity as the token creator.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Privacy Score - only show if privacy enabled */}
                  {privacyMethod !== 'none' && (
                    <PrivacyScore
                      privacyMethod={privacyMethod}
                      walletCount={burnerWallets.length}
                      estimatedDurationMs={burnerWallets.length * 60000}
                    />
                  )}

                  {/* Devnet Faucet - Only shows on devnet */}
                  <DevnetFaucet />

                  {/* Info Card */}
                  <div className="bg-[#12121f] rounded-2xl p-6 border border-[#1f1f35]">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#ffaa00]" />
                      How Funding Works
                    </h3>
                    <ol className="space-y-3 text-sm text-[#8888aa]">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs text-[#00ff88]">1</span>
                        <span>Connect your main wallet with sufficient SOL</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs text-[#00ff88]">2</span>
                        <span>Sign a single transaction to distribute SOL to all burner wallets</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs text-[#00ff88]">3</span>
                        <span>Each wallet receives an equal share for buying + gas fees</span>
                      </li>
                    </ol>
                  </div>

                  {/* Warning */}
                  <div className="bg-[#ffaa00]/5 rounded-2xl p-6 border border-[#ffaa00]/20">
                    <h3 className="text-lg font-semibold text-[#ffaa00] mb-2 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Notice
                    </h3>
                    <p className="text-sm text-[#aa8844]">
                      Never fund wallets with more SOL than you're willing to lose.
                      These are disposable wallets for launch operations only.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'launch' && (
              <>
                <LaunchPanel />
                <div className="space-y-6">
                  {/* Launch Flow Info */}
                  <div className="bg-[#12121f] rounded-2xl p-6 border border-[#1f1f35]">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-[#ff44aa]" />
                      Atomic Launch Flow
                    </h3>
                    <ol className="space-y-3 text-sm text-[#8888aa]">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs text-[#ff44aa]">1</span>
                        <span>Token creation transaction is prepared</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs text-[#ff44aa]">2</span>
                        <span>Buy transactions for each wallet are bundled</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs text-[#ff44aa]">3</span>
                        <span>Bundle is submitted to Jito Block Engine</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xs text-[#ff44aa]">4</span>
                        <span>All transactions execute in the same block - or none do</span>
                      </li>
                    </ol>
                  </div>

                  {/* Fee Notice */}
                  <div className="bg-[#00ff88]/5 rounded-2xl p-6 border border-[#00ff88]/20">
                    <h3 className="text-lg font-semibold text-[#00ff88] mb-2">
                      Platform Fee: 0.5 SOL
                    </h3>
                    <p className="text-sm text-[#88aa88]">
                      This fee is included in the atomic bundle. It ensures bundle integrity
                      and funds continued development of this tool.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'dashboard' && (
              <>
                <Dashboard />
                <ReclaimPanel />
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#1f1f35] mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#00ff88]/10">
                  <Rocket className="w-4 h-4 text-[#00ff88]" />
                </div>
                <span className="text-sm text-[#6666aa]">
                  Atomic Launch © 2026
                </span>
              </div>
              <div className="flex items-center gap-6">
                <a href="#" className="text-sm text-[#6666aa] hover:text-white transition-colors">
                  Documentation
                </a>
                <a href="#" className="text-sm text-[#6666aa] hover:text-white transition-colors">
                  Twitter
                </a>
                <a href="#" className="text-sm text-[#6666aa] hover:text-white transition-colors">
                  Discord
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
