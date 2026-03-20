'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Transaction, Alert, DashboardStats } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface WebSocketData {
  transactions: Transaction[];
  alerts: Alert[];
  stats: DashboardStats | null;
  connected: boolean;
  error: string | null;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [data, setData] = useState<WebSocketData>({
    transactions: [],
    alerts: [],
    stats: null,
    connected: false,
    error: null,
  });

  const addTransaction = useCallback((tx: Transaction) => {
    setData((prev) => ({
      ...prev,
      transactions: [tx, ...prev.transactions].slice(0, 100),
    }));
  }, []);

  const addAlert = useCallback((alert: Alert) => {
    setData((prev) => ({
      ...prev,
      alerts: [alert, ...prev.alerts].slice(0, 50),
    }));
  }, []);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setData((prev) => ({ ...prev, connected: true, error: null }));
    });

    socket.on('disconnect', () => {
      setData((prev) => ({ ...prev, connected: false }));
    });

    socket.on('connect_error', (err) => {
      setData((prev) => ({
        ...prev,
        connected: false,
        error: `Connection failed: ${err.message}`,
      }));
    });

    socket.on('transaction', (tx: Transaction) => {
      addTransaction(tx);
    });

    socket.on('alert', (alert: Alert) => {
      addAlert(alert);
    });

    socket.on('stats', (stats: DashboardStats) => {
      setData((prev) => ({ ...prev, stats }));
    });

    return () => {
      socket.disconnect();
    };
  }, [addTransaction, addAlert]);

  return data;
}
