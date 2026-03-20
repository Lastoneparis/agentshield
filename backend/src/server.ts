import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { initDatabase } from './database';
import { initWebSocket } from './websocket';
import apiRoutes from './api/routes';

const PORT = parseInt(process.env.PORT || '3001', 10);

// Initialize database
initDatabase();

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for hackathon demo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'AgentShield',
    description: 'AI Agent Security Middleware for Web3 Wallets',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      agent_execute: 'POST /api/agent/execute',
      security_check: 'POST /api/security/check',
      simulate: 'POST /api/simulate',
      execute: 'POST /api/execute',
      alerts: 'GET /api/alerts',
      alert_stats: 'GET /api/alerts/stats',
      transactions: 'GET /api/transactions',
      transaction_detail: 'GET /api/transactions/:id',
      policies: 'GET /api/policies',
      update_policy: 'PUT /api/policies/:id',
      agents: 'GET /api/agents',
      agent_stats: 'GET /api/agents/:id/stats',
      dashboard: 'GET /api/dashboard/stats',
      attack_sim_run: 'POST /api/attack-sim/run',
      attack_sim_run_single: 'POST /api/attack-sim/run/:id',
      attack_sim_scenarios: 'GET /api/attack-sim/scenarios',
      attack_sim_reports: 'GET /api/attack-sim/reports',
      attack_sim_report: 'GET /api/attack-sim/reports/:id',
      websocket: 'WS /ws',
    },
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
initWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║           AgentShield Backend              ║');
  console.log('  ║   AI Agent Security Middleware for Web3    ║');
  console.log(`  ║   HTTP + WS running on port ${PORT}          ║`);
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');
  console.log(`  API:       http://localhost:${PORT}/api`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  Dashboard: http://localhost:${PORT}/api/dashboard/stats`);
  console.log('');
});

export default app;
