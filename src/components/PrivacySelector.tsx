'use client';

import { useState } from 'react';
import {
    PrivacyMethod,
    getProviderDisplayName,
    getProviderDescription,
    getPrivacyLevel,
} from '@/lib/privacy';
import { Shield, Zap, Eye, Check } from 'lucide-react';

interface PrivacySelectorProps {
    selected: PrivacyMethod;
    onChange: (method: PrivacyMethod) => void;
    disabled?: boolean;
}

const PRIVACY_OPTIONS: { method: PrivacyMethod; icon: typeof Shield }[] = [
    { method: 'privacy-cash', icon: Shield },
    { method: 'shadowwire', icon: Zap },
    { method: 'none', icon: Eye },
];

export function PrivacySelector({ selected, onChange, disabled }: PrivacySelectorProps) {
    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">
                Privacy Method
            </label>

            <div className="grid grid-cols-1 gap-3">
                {PRIVACY_OPTIONS.map(({ method, icon: Icon }) => {
                    const isSelected = selected === method;
                    const level = getPrivacyLevel(method);

                    return (
                        <button
                            key={method}
                            onClick={() => !disabled && onChange(method)}
                            disabled={disabled}
                            className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`
                  p-2 rounded-lg
                  ${isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-400'}
                `}>
                                    <Icon size={20} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">
                                            {getProviderDisplayName(method)}
                                        </span>
                                        <PrivacyBadge level={level} />
                                    </div>
                                    <p className="text-sm text-zinc-400 mt-1">
                                        {getProviderDescription(method)}
                                    </p>
                                </div>

                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <Check size={18} className="text-purple-400" />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function PrivacyBadge({ level }: { level: 'none' | 'medium' | 'high' }) {
    const config = {
        none: { label: 'No Privacy', color: 'bg-zinc-600 text-zinc-300' },
        medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' },
        high: { label: 'High', color: 'bg-green-500/20 text-green-400' },
    };

    const { label, color } = config[level];

    return (
        <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
            {label}
        </span>
    );
}
