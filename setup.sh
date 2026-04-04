#!/bin/bash
# ─────────────────────────────────────────────────────────────
# TaxAgent.ai — First-time setup script
# Run this once after unzipping the project folder.
# Usage: bash setup.sh
# ─────────────────────────────────────────────────────────────

set -e  # Stop on any error

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}   TaxAgent.ai — Project Setup            ${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""

# ── 1. Check Node.js ──────────────────────────────────────────
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js is not installed.${NC}"
  echo "  → Download it from https://nodejs.org (choose the LTS version)"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Node.js 18 or higher is required. You have $(node -v).${NC}"
  echo "  → Download the latest LTS from https://nodejs.org"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── 2. Install dependencies ───────────────────────────────────
echo ""
echo "Installing dependencies (this takes ~1 minute)..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── 3. Check for .env.local ───────────────────────────────────
echo ""
if [ ! -f .env.local ]; then
  echo -e "${RED}✗ .env.local not found.${NC}"
  echo "  → Copy .env.local.example to .env.local and fill in your keys."
  exit 1
fi

if grep -q "your_supabase_url" .env.local; then
  echo -e "${RED}⚠  .env.local still has placeholder values.${NC}"
  echo "   The app will start but Supabase features won't work until you fill them in."
  echo "   See README.md for instructions."
fi
echo -e "${GREEN}✓ .env.local found${NC}"

# ── 4. Done ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}   Setup complete!                        ${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  Start the development server:"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo "  Then open your browser to:"
echo -e "  ${BLUE}http://localhost:3000${NC}"
echo ""
