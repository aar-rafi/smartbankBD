#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ChequeMate AI - Service Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Check Python dependencies
echo -e "${YELLOW}🔍 Checking Python dependencies...${NC}"
cd server/ml
if ! python3 -c "import flask" &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    pip install -r requirements.txt
fi
cd ../..

echo ""
echo -e "${GREEN}✓ Prerequisites check complete${NC}"
echo ""
echo -e "${BLUE}Starting services...${NC}"
echo -e "${YELLOW}Note: This will open 3 terminal windows${NC}"
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Check ports
check_port 5001 || echo -e "${YELLOW}   ML Service port occupied${NC}"
check_port 3001 || echo -e "${YELLOW}   Backend port occupied${NC}"
check_port 5000 || echo -e "${YELLOW}   Frontend port occupied${NC}"

echo ""
echo -e "${GREEN}To start services manually:${NC}"
echo ""
echo -e "${BLUE}Terminal 1 - ML Service:${NC}"
echo "  cd server/ml && python3 signature_service.py"
echo ""
echo -e "${BLUE}Terminal 2 - Backend:${NC}"
echo "  npm run start:server"
echo ""
echo -e "${BLUE}Terminal 3 - Frontend:${NC}"
echo "  npm run dev"
echo ""
echo -e "${YELLOW}Or use tmux/screen for background processes${NC}"
