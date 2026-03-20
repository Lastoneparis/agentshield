'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import TransactionCard from './TransactionCard';
import { Transaction } from '@/lib/types';

interface LiveFeedProps {
  transactions: Transaction[];
  maxItems?: number;
}

export default function LiveFeed({ transactions, maxItems = 10 }: LiveFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayed = transactions.slice(0, maxItems);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [transactions.length]);

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-green" />
          <h3 className="text-sm font-medium text-white">Live Transaction Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-accent-green" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-accent-green pulse-ring" />
          </div>
          <span className="text-[10px] font-mono text-accent-green">STREAMING</span>
        </div>
      </div>

      {/* Feed */}
      <div ref={containerRef} className="max-h-[500px] overflow-y-auto p-3 space-y-2">
        <AnimatePresence>
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Activity className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">Waiting for transactions...</p>
              <p className="text-xs mt-1">Connect the backend to see live data</p>
            </div>
          ) : (
            displayed.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} compact />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
