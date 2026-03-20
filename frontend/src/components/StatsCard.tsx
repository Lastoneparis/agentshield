'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color: 'green' | 'red' | 'blue' | 'amber';
  suffix?: string;
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
    glow: 'glow-blue',
  },
  amber: {
    bg: 'bg-accent-amber/10',
    text: 'text-accent-amber',
    border: 'border-accent-amber/20',
    glow: '',
  },
};

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
}

export default function StatsCard({ title, value, icon: Icon, trend, color, suffix }: StatsCardProps) {
  const c = colorMap[color];
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const isNumeric = !isNaN(numericValue);
  const animatedValue = useCountUp(isNumeric ? numericValue : 0);

  const displayValue = isNumeric
    ? typeof value === 'number' && Number.isInteger(value)
      ? animatedValue
      : animatedValue.toFixed(1)
    : value;

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
          <p className={`text-3xl font-bold font-mono mt-2 ${c.text}`}>
            {displayValue}{suffix || ''}
          </p>
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
