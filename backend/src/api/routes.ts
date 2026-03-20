import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

function paramStr(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
}
function queryInt(val: any, fallback: number): number {
  return parseInt(String(val), 10) || fallback;
}
import {
  getTransactions,
  getTransaction,
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  getPolicies,
  updatePolicy,
  getAgents,
  getAgent,
  getAgentStats,
  getDashboardStats,
} from '../database';
import { evaluateTransaction } from '../policy-engine';
import { simulateTransaction } from '../transaction-simulator';
import { processTransaction, executeApprovedTransaction, TransactionRequest } from '../middleware/security';
import {
  getScenarios,
  getScenarioById,
  runAllAttacks,
  runSingleAttack,
  getReports,
  getReportById,
} from '../attack-simulation';

const router = Router();

// ── Agent Execute (main entry point for AI agents) ──

router.post('/agent/execute', async (req: Request, res: Response) => {
  try {
    const { agent_id, to, value, token, data, from, balance } = req.body;

    if (!agent_id || !to || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: agent_id, to, value',
      });
    }

    const request: TransactionRequest = {
      agent_id,
      to,
      value: String(value),
      token,
      data,
      from,
      balance: balance !== undefined ? parseFloat(balance) : undefined,
    };

    const decision = await processTransaction(request);
    return res.status(decision.approved ? 200 : 403).json(decision);
  } catch (err: any) {
    console.error('[API] /agent/execute error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ── Security Check (policy check only, no persistence) ──

router.post('/security/check', async (req: Request, res: Response) => {
  try {
    const { agent_id, to, value, data, balance } = req.body;

    if (!agent_id || !to || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: agent_id, to, value',
      });
    }

    const result = await evaluateTransaction({
      agentId: agent_id,
      toAddress: to,
      value: parseFloat(value),
      balance: balance !== undefined ? parseFloat(balance) : 10.0,
      data,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[API] /security/check error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ── Simulate Transaction ──

router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { from, to, value, data } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Missing required field: to' });
    }

    const result = await simulateTransaction({
      from: from || process.env.AGENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
      to,
      value: String(value || '0'),
      data,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[API] /simulate error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ── Execute Approved Transaction ──

router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: 'Missing required field: transaction_id' });
    }

    const result = executeApprovedTransaction(transaction_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, transaction_id, status: 'executed' });
  } catch (err: any) {
    console.error('[API] /execute error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ── Alerts ──

router.get('/alerts', (req: Request, res: Response) => {
  try {
    const limit = queryInt(req.query.limit, 50);
    const offset = queryInt(req.query.offset, 0);
    const alerts = getAlerts(limit, offset);
    return res.json({ alerts, count: alerts.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/alerts/stats', (_req: Request, res: Response) => {
  try {
    const stats = getAlertStats();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/alerts/:id/acknowledge', (req: Request, res: Response) => {
  try {
    acknowledgeAlert(paramStr(req.params.id));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Transactions ──

router.get('/transactions', (req: Request, res: Response) => {
  try {
    const limit = queryInt(req.query.limit, 50);
    const offset = queryInt(req.query.offset, 0);
    const transactions = getTransactions(limit, offset);
    return res.json({ transactions, count: transactions.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/transactions/:id', (req: Request, res: Response) => {
  try {
    const tx = getTransaction(paramStr(req.params.id));
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    // Parse simulation_json if present
    if (tx.simulation_json) {
      try {
        tx.simulation = JSON.parse(tx.simulation_json);
      } catch {
        tx.simulation = null;
      }
    }
    return res.json(tx);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Policies ──

router.get('/policies', (_req: Request, res: Response) => {
  try {
    const policies = getPolicies().map((p: any) => ({
      ...p,
      value: JSON.parse(p.value_json),
    }));
    return res.json({ policies });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/policies/:id', (req: Request, res: Response) => {
  try {
    const { value, enabled } = req.body;
    const updates: { value_json?: string; enabled?: number } = {};

    if (value !== undefined) {
      updates.value_json = JSON.stringify(value);
    }
    if (enabled !== undefined) {
      updates.enabled = enabled ? 1 : 0;
    }

    const policyId = paramStr(req.params.id);
    updatePolicy(policyId, updates);
    return res.json({ success: true, id: policyId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Agents ──

router.get('/agents', (_req: Request, res: Response) => {
  try {
    const agents = getAgents();
    return res.json({ agents });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/agents/:id/stats', (req: Request, res: Response) => {
  try {
    const agentId = paramStr(req.params.id);
    const agent = getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const stats = getAgentStats(agentId);
    return res.json({ agent, stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ──

router.get('/dashboard/stats', (_req: Request, res: Response) => {
  try {
    const stats = getDashboardStats();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Attack Simulation ──

router.post('/attack-sim/run', async (req: Request, res: Response) => {
  try {
    const { agent_id } = req.body;
    if (!agent_id) {
      return res.status(400).json({ error: 'Missing required field: agent_id' });
    }

    const report = await runAllAttacks(agent_id);
    return res.json(report);
  } catch (err: any) {
    console.error('[API] /attack-sim/run error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/attack-sim/run/:id', async (req: Request, res: Response) => {
  try {
    const scenarioId = paramStr(req.params.id);
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'Missing required field: agent_id' });
    }

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return res.status(404).json({ error: `Attack scenario '${scenarioId}' not found` });
    }

    const result = await runSingleAttack(scenario, agent_id);
    return res.json(result);
  } catch (err: any) {
    console.error('[API] /attack-sim/run/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/attack-sim/scenarios', (_req: Request, res: Response) => {
  try {
    const scenarios = getScenarios();
    return res.json({ scenarios, count: scenarios.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/attack-sim/reports', (req: Request, res: Response) => {
  try {
    const limit = queryInt(req.query.limit, 20);
    const offset = queryInt(req.query.offset, 0);
    const reports = getReports(limit, offset);
    return res.json({ reports, count: reports.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/attack-sim/reports/:id', (req: Request, res: Response) => {
  try {
    const reportId = paramStr(req.params.id);
    const report = getReportById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Health Check ──

router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'AgentShield',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
