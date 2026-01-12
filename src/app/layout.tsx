import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Atomic Launch | Jito-Powered Pump.fun Bundler",
  description: "Deploy tokens on Pump.fun and snipe across 20-50 wallets in a single atomic block. The ultimate launchpad for Solana tokens.",
  keywords: ["Solana", "Pump.fun", "Jito", "Token Launch", "Bundler", "Memecoin"],
  openGraph: {
    title: "Atomic Launch | Jito-Powered Pump.fun Bundler",
    description: "Deploy tokens on Pump.fun and snipe across 20-50 wallets atomically",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
