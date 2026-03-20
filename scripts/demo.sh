#!/bin/bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║         AgentShield Demo                 ║"
echo "  ║   AI Agent Security Middleware for Web3  ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[1/3] Starting backend..."
cd "$PROJECT_ROOT/backend" && npm run dev &
BACKEND_PID=$!
sleep 3

echo "[2/3] Starting frontend..."
cd "$PROJECT_ROOT/frontend" && npm run dev &
FRONTEND_PID=$!
sleep 5

echo ""
echo "  Dashboard:  http://localhost:3000"
echo "  API:        http://localhost:3001"
echo ""

echo "[3/3] Running demo scenarios..."
cd "$PROJECT_ROOT/agents" && npx ts-node demo.ts

echo ""
echo "Demo complete. Services still running."
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
