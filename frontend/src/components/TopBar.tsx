'use client';

import { Wifi, WifiOff } from 'lucide-react';
import WalletConnect from './WalletConnect';

interface TopBarProps {
  connected: boolean;
}

export default function TopBar({ connected }: TopBarProps) {
  return (
    <header className="fixed top-0 left-[220px] right-0 z-30 h-14 bg-bg-card/80 backdrop-blur-xl border-b border-card-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-text-secondary">
          AI Agent Security Monitor
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Wallet Connection */}
        <WalletConnect />

        {/* Connection Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono ${
            connected
              ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
              : 'bg-accent-red/10 text-accent-red border border-accent-red/20'
          }`}
        >
          {connected ? (
            <>
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-accent-green pulse-ring" />
              </div>
              <Wifi className="w-3 h-3" />
              <span>LIVE</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-accent-red" />
              <WifiOff className="w-3 h-3" />
              <span>OFFLINE</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
