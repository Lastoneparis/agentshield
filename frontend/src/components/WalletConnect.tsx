'use client';

import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut } from 'lucide-react';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {/* Network indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-bg-hover text-[10px] font-mono text-text-secondary border border-card-border">
          <div className={`w-2 h-2 rounded-full ${chain?.id === 11155111 ? 'bg-accent-blue' : 'bg-accent-yellow'}`} />
          {chain?.name || 'Unknown'}
        </div>

        {/* Balance */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-bg-hover text-[10px] font-mono text-white border border-card-border">
          <Wallet className="w-3 h-3 text-accent-green" />
          {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '...'}
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-accent-green/10 text-[10px] font-mono text-accent-green border border-accent-green/20">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          {truncateAddress(address)}
        </div>

        {/* Disconnect */}
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-mono text-text-muted hover:text-accent-red border border-card-border hover:border-accent-red/30 transition-all"
          title="Disconnect wallet"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const metaMask = connectors.find((c) => c.name === 'MetaMask') || connectors[0];
        if (metaMask) {
          connect({ connector: metaMask });
        }
      }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 transition-all"
    >
      <Wallet className="w-3.5 h-3.5" />
      Connect Wallet
    </button>
  );
}
