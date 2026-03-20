#!/bin/bash
# AgentShield — One Command Setup & Demo
# Usage: ./scripts/demo.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${GREEN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║         AgentShield Setup              ║"
echo "  ║  AI Agent Security Middleware          ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${CYAN}[0/3]${NC} Checking prerequisites..."
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is required. Install from https://nodejs.org${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Error: Node.js >= 18 required (found v${NODE_VERSION})${NC}"
  exit 1
fi
echo -e "  Node.js $(node -v) ${GREEN}✓${NC}"
echo -e "  npm $(npm -v) ${GREEN}✓${NC}"

# Install all dependencies
echo ""
echo -e "${BLUE}[1/3]${NC} Installing dependencies..."
cd "$PROJECT_ROOT"
npm run install:all 2>&1 | tail -1
echo -e "  Dependencies installed ${GREEN}✓${NC}"

# Start backend
echo ""
echo -e "${BLUE}[2/3]${NC} Starting backend on port 3001..."
cd "$PROJECT_ROOT/backend" && npx ts-node src/server.ts &
BACKEND_PID=$!
sleep 5

# Verify backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "  Backend running (PID $BACKEND_PID) ${GREEN}✓${NC}"
else
  echo -e "${RED}  Backend failed to start. Check logs above.${NC}"
  exit 1
fi

# Start frontend
echo ""
echo -e "${BLUE}[3/3]${NC} Starting frontend on port 3000..."
cd "$PROJECT_ROOT/frontend" && npm run dev &
FRONTEND_PID=$!
sleep 5

# Verify frontend is running
if kill -0 $FRONTEND_PID 2>/dev/null; then
  echo -e "  Frontend running (PID $FRONTEND_PID) ${GREEN}✓${NC}"
else
  echo -e "${RED}  Frontend failed to start. Check logs above.${NC}"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

echo ""
echo -e "${GREEN}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║              AgentShield is LIVE                  ║"
echo "  ║                                                   ║"
echo "  ║  Dashboard:  http://localhost:3000                 ║"
echo "  ║  API:        http://localhost:3001                 ║"
echo "  ║  Pitch Deck: http://localhost:3000/pitch-deck.html ║"
echo "  ║                                                   ║"
echo "  ║  Press Ctrl+C to stop all services                ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Handle Ctrl+C gracefully
cleanup() {
  echo ""
  echo -e "${CYAN}Shutting down AgentShield...${NC}"
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}Stopped.${NC}"
  exit 0
}

trap cleanup INT TERM
wait
