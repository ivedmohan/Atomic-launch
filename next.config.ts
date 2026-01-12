import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile Solana packages for client-side
  transpilePackages: [
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
  ],
  
  // Empty turbopack config to allow build
  turbopack: {},
};

export default nextConfig;
