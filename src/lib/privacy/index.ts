/**
 * Privacy Module Exports
 * 
 * NOTE: Privacy Cash and ShadowWire SDKs can only be used server-side
 * due to WASM and Node.js dependencies.
 * 
 * For client components, use the display helpers only.
 * Call /api/shield and /api/withdraw endpoints for actual operations.
 */

// Types (safe for SSR)
export * from './types';

// Display helpers only (no SDK imports)
export {
    getProviderDisplayName,
    getProviderDescription,
    getPrivacyLevel,
} from './providerFactory';

// Stealth Distribution (no WASM)
export {
    createDistributionPlan,
    executeStealthDistribution,
    calculatePrivacyScore,
} from './stealthDistributor';

// Mock provider for testing
export { MockPrivacyProvider, createMockPrivacyProvider } from './mockProvider';
