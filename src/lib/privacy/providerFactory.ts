/**
 * Privacy Provider Factory
 * Display helpers only - no SDK imports to avoid WASM issues
 * 
 * For actual SDK usage, use the usePrivacy() hook
 */

import { PrivacyMethod } from './types';

/**
 * Get provider name for display
 */
export function getProviderDisplayName(method: PrivacyMethod): string {
    switch (method) {
        case 'privacy-cash':
            return 'Privacy Cash (ZK Proofs)';
        case 'shadowwire':
            return 'ShadowWire (Bulletproofs)';
        case 'none':
            return 'No Privacy';
        default:
            return 'Unknown';
    }
}

/**
 * Get provider description
 */
export function getProviderDescription(method: PrivacyMethod): string {
    switch (method) {
        case 'privacy-cash':
            return 'Shield SOL into a private pool, then withdraw to burners with ZK proofs. Breaks all on-chain links.';
        case 'shadowwire':
            return 'Transfer with hidden amounts using Bulletproofs. Sender is anonymous but link may exist.';
        case 'none':
            return 'Standard Solana transfers. Fully visible on-chain.';
        default:
            return '';
    }
}

/**
 * Get privacy level (for UI display)
 */
export function getPrivacyLevel(method: PrivacyMethod): 'none' | 'medium' | 'high' {
    switch (method) {
        case 'privacy-cash':
            return 'high';
        case 'shadowwire':
            return 'medium';
        case 'none':
        default:
            return 'none';
    }
}
