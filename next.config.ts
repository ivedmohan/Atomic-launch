import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile Solana packages for client-side
  transpilePackages: [
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
  ],

  // DISABLE Turbopack - it doesn't support WASM properly
  // The Privacy Cash SDK uses WASM for ZK proofs
  // turbopack: {}, // REMOVED - using webpack instead

  // Enable WASM support via Webpack
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // For server-side, externalize WASM packages
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'privacycash': 'commonjs privacycash',
          '@lightprotocol/hasher.rs': 'commonjs @lightprotocol/hasher.rs',
          '@radr/shadowwire': 'commonjs @radr/shadowwire',
        });
      }
    }

    return config;
  },
};

export default nextConfig;
