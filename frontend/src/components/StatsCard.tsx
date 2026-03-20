'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color: 'green' | 'red' | 'blue' | 'amber';
}

const colorMap = {
  green: {
    bg: 'bg-accent-green/10',
    text: 'text-accent-green',
    border: 'border-accent-green/20',
    glow: 'glow-green',
  },
  red: {
    bg: 'bg-accent-red/10',
    text: 'text-accent-red',
    border: 'border-accent-red/20',
    glow: 'glow-red',
  },
  blue: {
    bg: 'bg-accent-blue/10',
    text: 'text-accent-blue',
    border: 'border-accent-blue/20',
    glow: '',
  },
  amber: {
    bg: 'bg-accent-amber/10',
    text: 'text-accent-amber',
    border: 'border-accent-amber/20',
    glow: '',
  },
};

export default function StatsCard({ title, value, icon: Icon, trend, color }: StatsCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-bg-card border ${c.border} rounded-xl p-5 ${c.glow} transition-all duration-300 hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</p>
          <p className={`text-3xl font-bold font-mono mt-2 ${c.text}`}>{value}</p>
          {trend && (
            <p className="text-xs text-text-muted mt-1 font-mono">{trend}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </motion.div>
  );
}
