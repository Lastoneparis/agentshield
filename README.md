```
     _                    _   ____  _     _      _     _
    / \   __ _  ___ _ __ | |_/ ___|| |__ (_) ___| | __| |
   / _ \ / _` |/ _ \ '_ \| __\___ \| '_ \| |/ _ \ |/ _` |
  / ___ \ (_| |  __/ | | | |_ ___) | | | | |  __/ | (_| |
 /_/   \_\__, |\___|_| |_|\__|____/|_| |_|_|\___|_|\__,_|
         |___/
```

# AgentShield

> **AI Agent Security Middleware for Web3 Wallets**
> Protect autonomous AI agents from making catastrophic on-chain transactions.

<p align="center">
  <a href="#features">Features</a> &#8226;
  <a href="#architecture">Architecture</a> &#8226;
  <a href="#quick-start">Quick Start</a> &#8226;
  <a href="#demo">Demo</a> &#8226;
  <a href="#tech-stack">Tech Stack</a> &#8226;
  <a href="#security-policies">Security Policies</a> &#8226;
  <a href="#sponsor-integrations">Sponsors</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/ETHGlobal-Cannes%202026-blue?style=for-the-badge" alt="ETHGlobal Cannes 2026" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI-Claude%20API-cc785c?style=for-the-badge" alt="Claude" />
  <img src="https://img.shields.io/badge/Network-Sepolia-6B46C1?style=for-the-badge&logo=ethereum" alt="Sepolia" />
</p>

---

## The Problem

AI agents are increasingly managing wallets and executing on-chain transactions autonomously. But what happens when an agent:
- Drains a wallet by sending funds to a malicious contract?
- Approves unlimited token spending to an unverified spender?
- Executes a swap on a rug-pull token?
- Gets prompt-injected into making harmful transactions?

**There is no security layer between AI agents and the blockchain.** Until now.

## The Solution

**AgentShield** is a security middleware that sits between AI agents and the blockchain, enforcing configurable policies, simulating transactions before execution, and providing real-time risk analysis — all without removing the agent's autonomy.

Think of it as a **firewall for AI agent wallets**.

---

## Features

- **Policy Engine** — Configurable rules: spending limits, address blocklists, approval guards, contract filters
- **Transaction Simulator** — Dry-run every transaction before on-chain execution to catch failures and unexpected state changes
- **Risk Analyzer** — Real-time risk scoring (0-100) with multi-factor analysis: destination reputation, value anomaly detection, calldata inspection
- **Smart Contract Wallet** — On-chain enforcement via a custom Solidity wallet with admin controls and emergency pause
- **Real-time Dashboard** — Monitor all agent activity, review blocked transactions, manage policies, receive alerts
- **WebSocket Alerts** — Instant notifications when high-risk transactions are detected or blocked
- **AI-Powered Analysis** — Claude API integration for natural language risk explanations and transaction summaries
- **Multi-Agent Support** — Register and manage multiple AI agents, each with their own policies

---

## Architecture

```
┌──────────────┐     ┌──────────────────────────────┐     ┌─────────────┐
│              │     │      AgentShield              │     │             │
│  AI Agent    │────▶│      Security Middleware      │────▶│  Blockchain │
│  (Claude)    │     │                               │     │  (Sepolia)  │
│              │◀────│  ┌──────────┐ ┌────────────┐  │     │             │
└──────────────┘     │  │ Policy   │ │ TX         │  │     └─────────────┘
                     │  │ Engine   │ │ Simulator  │  │
                     │  └──────────┘ └────────────┘  │
                     │  ┌──────────┐ ┌────────────┐  │
                     │  │ Risk     │ │ Alert      │  │
                     │  │ Analyzer │ │ System     │  │
                     │  └──────────┘ └────────────┘  │
                     └───────────────┬────────────────┘
                                    │
                             ┌──────┴───────┐
                             │  Dashboard   │
                             │  (Next.js)   │
                             └──────────────┘
```

**Flow:**
1. AI Agent wants to execute a transaction
2. AgentShield intercepts the request via REST API
3. Policy Engine checks against all active rules
4. Transaction Simulator dry-runs the transaction
5. Risk Analyzer computes a composite risk score
6. If approved: transaction is forwarded to the on-chain wallet contract
7. If blocked: agent receives the rejection reason + the dashboard shows an alert
8. Everything is logged and visible in real-time on the dashboard

---

## Screenshots

> _Screenshots of the live dashboard will be added during the demo._

| Dashboard Overview | Transaction Detail | Policy Manager |
|---|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![TX Detail](docs/screenshots/tx-detail.png) | ![Policies](docs/screenshots/policies.png) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contracts** | Solidity 0.8.24, Hardhat, OpenZeppelin |
| **Backend** | Node.js, Express, TypeScript, SQLite |
| **Frontend** | Next.js 14, React, TailwindCSS, shadcn/ui |
| **AI Agent** | Claude API (Anthropic), TypeScript agent framework |
| **Blockchain** | Ethereum Sepolia testnet, ethers.js v6 |
| **Real-time** | WebSocket (ws) for live alerts |
| **DevOps** | Docker, Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9
- An Anthropic API key (for AI features)
- Sepolia ETH (for on-chain transactions)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-team/agentshield.git
cd agentshield

# Install all dependencies
npm run install:all

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development servers
npm run dev
```

The dashboard will be available at **http://localhost:3000** and the API at **http://localhost:3001**.

### Seed Demo Data

```bash
npx ts-node scripts/seed.ts
```

### Run the Full Demo

```bash
npm run demo
# or
bash scripts/demo.sh
```

### Docker

```bash
docker-compose up --build
```

---

## Demo

### Step-by-step walkthrough:

1. **Start the app** — `npm run dev` launches both backend and frontend
2. **Open the dashboard** — Navigate to `http://localhost:3000`
3. **View the agent** — See the registered DeFi Trading Agent and its activity
4. **Run the demo agent** — `npm run demo` triggers the AI agent to attempt several transactions:
   - A normal Uniswap swap (approved, low risk)
   - A large ETH transfer (flagged, medium risk)
   - A transfer to a known burn address (blocked, critical risk)
   - An unlimited token approval (blocked by Approval Guard policy)
5. **Watch real-time** — See transactions appear on the dashboard with risk scores and status
6. **Review alerts** — Check the alerts panel for blocked transaction details
7. **Manage policies** — Toggle policies on/off, adjust spending limits, update blocklists

---

## Project Structure

```
agentshield/
├── contracts/              # Solidity smart contracts
│   ├── contracts/
│   │   └── AgentWallet.sol # On-chain agent wallet with policy enforcement
│   ├── test/               # Contract tests
│   └── hardhat.config.ts
├── backend/                # Security middleware API
│   ├── src/
│   │   ├── server.ts       # Express server + WebSocket
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Policy engine, risk analyzer, simulator
│   │   └── db/             # SQLite schema and queries
│   └── package.json
├── frontend/               # Next.js dashboard
│   ├── app/                # App router pages
│   ├── components/         # React components
│   └── package.json
├── agents/                 # AI agent implementation
│   ├── agent.ts            # Claude-powered autonomous agent
│   ├── demo.ts             # Demo scenario runner
│   └── package.json
├── scripts/
│   ├── demo.sh             # Full demo launcher
│   └── seed.ts             # Database seeder
├── database/               # SQLite database files
├── docker-compose.yml
├── package.json            # Root workspace config
├── .env.example
└── README.md
```

---

## Security Policies

AgentShield ships with four configurable policy types:

### 1. Spending Limit
Prevents agents from exceeding daily or per-transaction ETH limits.
```json
{
  "max_daily_eth": 5.0,
  "max_single_tx_eth": 2.0
}
```

### 2. Address Blocklist
Blocks transactions to known malicious addresses, burn addresses, and unverified contracts.
```json
{
  "blocked_addresses": ["0x000...dEaD"],
  "block_unverified_contracts": true
}
```

### 3. Approval Guard
Prevents unlimited token approvals — one of the most common attack vectors in DeFi.
```json
{
  "block_unlimited_approvals": true,
  "max_approval_amount": "1000000000000000000000"
}
```

### 4. Contract Interaction Filter
Only allows interaction with verified, audited smart contracts above a minimum age.
```json
{
  "require_verified": true,
  "min_contract_age_days": 30,
  "whitelisted_protocols": ["uniswap", "aave", "compound"]
}
```

Policies are composable and enforced in sequence. A transaction must pass **all** active policies to be approved.

---

## How the AI Agents Work

AgentShield's demo agent is built with the Claude API and operates autonomously:

1. **Planning** — The agent receives a high-level goal (e.g., "Swap 0.5 ETH for USDC on Uniswap")
2. **Transaction Construction** — It builds the raw transaction (to, value, calldata)
3. **Submission** — The transaction is submitted to the AgentShield API (not directly to the blockchain)
4. **Middleware Processing** — AgentShield evaluates the transaction through all security layers
5. **Result Handling** — The agent receives either an approval (with tx hash) or a rejection (with reason)
6. **Adaptation** — If rejected, the agent can adjust its strategy and retry within policy bounds

The agent never has direct access to the private key. All transactions go through the on-chain AgentWallet contract, which enforces a final layer of protection via admin-controlled guards.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/transactions` | Submit a transaction for evaluation |
| `GET` | `/api/transactions` | List all transactions |
| `GET` | `/api/transactions/:id` | Get transaction details |
| `GET` | `/api/agents` | List registered agents |
| `POST` | `/api/agents` | Register a new agent |
| `GET` | `/api/policies` | List all policies |
| `PUT` | `/api/policies/:id` | Update a policy |
| `GET` | `/api/alerts` | List alerts |
| `GET` | `/api/stats` | Dashboard statistics |
| `WS` | `/ws` | Real-time transaction and alert feed |

---

## Sponsor Integrations

| Sponsor | Integration |
|---|---|
| **Chainlink** | Price feeds for accurate ETH/USD valuation in spending limit policies |
| **Flare** | Cross-chain data attestation for multi-chain agent wallet verification |
| **World** | World ID verification to prove human oversight of AI agent registration |
| **0G** | Decentralized AI model serving for on-chain risk analysis inference |
| **Ledger** | Hardware wallet co-signing for high-value transactions above policy thresholds |
| **Reown** | WalletConnect integration for connecting external wallets to the dashboard |
| **Dynamic** | Embedded wallet onboarding for seamless agent wallet creation |

---

## Why This Matters

As AI agents become more autonomous, security infrastructure must evolve. AgentShield addresses a critical gap: **there is no standard security layer for AI agents interacting with blockchains.**

- **For users**: Sleep at night knowing your AI agent cannot drain your wallet
- **For developers**: Drop-in middleware that adds security without changing your agent's logic
- **For the ecosystem**: A protocol-level standard for safe AI-blockchain interaction

---

## Team

Built with intensity at **ETHGlobal Cannes 2026**.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <img src="https://img.shields.io/badge/Built%20at-ETHGlobal%20Cannes%202026-blue?style=for-the-badge" alt="ETHGlobal" />
  <br/>
  <sub>Securing the autonomous agent economy, one transaction at a time.</sub>
</p>
