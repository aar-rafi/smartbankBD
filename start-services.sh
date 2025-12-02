#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
CONDA_ENV="chequemate-ml"
MODEL_PATH="${PROJECT_ROOT}/best_siamese_transformer.pth"
ML_SERVICE_PORT=5001
BACKEND_PORT=3001
FRONTEND_PORT=5000

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ChequeMate AI - Service Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Project Root: ${PROJECT_ROOT}${NC}"
echo -e "${YELLOW}Model Path: ${MODEL_PATH}${NC}"
echo -e "${YELLOW}Conda Environment: ${CONDA_ENV}${NC}"
echo ""

# Check if conda is installed
if ! command -v conda &> /dev/null; then
    echo -e "${RED}❌ Conda is not installed${NC}"
    exit 1
fi

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

# Check if model file exists
if [ ! -f "${MODEL_PATH}" ]; then
    echo -e "${RED}❌ Model file not found at ${MODEL_PATH}${NC}"
    echo -e "${YELLOW}Please ensure best_siamese_transformer.pth is in the project root${NC}"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Check Python dependencies in conda env
echo -e "${YELLOW}🔍 Checking Python dependencies in conda env ${CONDA_ENV}...${NC}"
if ! conda run -n ${CONDA_ENV} python -c "import flask, torch" &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    conda run -n ${CONDA_ENV} pip install -r server/ml/requirements.txt
fi

echo ""
echo -e "${GREEN}✓ Prerequisites check complete${NC}"
echo ""
echo -e "${BLUE}Starting services...${NC}"
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
check_port ${ML_SERVICE_PORT} || echo -e "${YELLOW}   ML Service port occupied${NC}"
check_port ${BACKEND_PORT} || echo -e "${YELLOW}   Backend port occupied${NC}"
check_port ${FRONTEND_PORT} || echo -e "${YELLOW}   Frontend port occupied${NC}"

echo ""
echo -e "${GREEN}To start services manually:${NC}"
echo ""
echo -e "${BLUE}Terminal 1 - ML Service (with conda env & trained model):${NC}"
echo "  cd ${PROJECT_ROOT}/server/ml"
echo "  conda activate ${CONDA_ENV}"
echo "  MODEL_PATH=\"${MODEL_PATH}\" python signature_service.py"
echo ""
echo -e "${BLUE}Terminal 2 - Backend:${NC}"
echo "  cd ${PROJECT_ROOT}"
echo "  npm run start:server"
echo ""
echo -e "${BLUE}Terminal 3 - Frontend:${NC}"
echo "  cd ${PROJECT_ROOT}"
echo "  npm run dev:client"
echo ""
echo -e "${YELLOW}Or use tmux/screen for background processes${NC}"
echo ""

# Ask user if they want to start services automatically
read -p "Start all services now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Starting services in background...${NC}"
    
    # Kill existing processes on these ports
    echo -e "${YELLOW}Cleaning up existing processes...${NC}"
    lsof -ti:${ML_SERVICE_PORT} | xargs kill -9 2>/dev/null
    lsof -ti:${BACKEND_PORT} | xargs kill -9 2>/dev/null
    lsof -ti:${FRONTEND_PORT} | xargs kill -9 2>/dev/null
    sleep 1
    
    # Start ML service
    echo -e "${GREEN}🚀 Starting ML Service...${NC}"
    cd "${PROJECT_ROOT}/server/ml"
    conda run -n ${CONDA_ENV} --no-capture-output env MODEL_PATH="${MODEL_PATH}" python signature_service.py &
    ML_PID=$!
    cd "${PROJECT_ROOT}"
    sleep 3
    
    # Start backend
    echo -e "${GREEN}🚀 Starting Backend Server...${NC}"
    npm run start:server &
    BACKEND_PID=$!
    sleep 2
    
    # Start frontend
    echo -e "${GREEN}🚀 Starting Frontend...${NC}"
    npm run dev:client &
    FRONTEND_PID=$!
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  All services started!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo "  📊 ML Service:  http://localhost:${ML_SERVICE_PORT}/health"
    echo "  🔧 Backend:     http://localhost:${BACKEND_PORT}/api/health"
    echo "  🌐 Frontend:    http://localhost:${FRONTEND_PORT}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    
    # Wait for any background process to exit
    wait
fi
