#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  SmartBank BD - Hackathon Demo Launcher"
echo "============================================"
echo ""
echo "Working directory: $SCRIPT_DIR"
echo ""

# Kill any existing processes on these ports
echo "Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5002 | xargs kill -9 2>/dev/null
lsof -ti:5005 | xargs kill -9 2>/dev/null

sleep 1

# Load environment variables
if [ -f "$SCRIPT_DIR/.env.local" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env.local" | xargs)
    echo "Environment variables loaded from .env.local"
fi

# Start ML Fraud Detection Service (Python Flask on port 5002)
echo ""
echo "Starting ML Fraud Detection Service (port 5002)..."
cd "$SCRIPT_DIR/server/ml"
export MODEL_PATH="$SCRIPT_DIR/server/best_siamese_transformer.pth"

if [ -f "$SCRIPT_DIR/server/database/venv/bin/activate" ]; then
    # Using venv
    source "$SCRIPT_DIR/server/database/venv/bin/activate"
    python fraud_prediction.py --server --port 5002 &
    FRAUD_PID=$!
    echo "  ✓ Fraud Detection Service started with venv (PID: $FRAUD_PID)"
elif command -v conda &> /dev/null; then
    # Using conda
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate chequemate-ml 2>/dev/null || conda activate base
    python fraud_prediction.py --server --port 5002 &
    FRAUD_PID=$!
    echo "  ✓ Fraud Detection Service started with conda (PID: $FRAUD_PID)"
else
    echo "  ⚠ No Python environment found, skipping fraud detection service"
    FRAUD_PID=""
fi
cd "$SCRIPT_DIR"

sleep 2

# Start ML Signature Service (Python Flask on port 5005)
echo ""
echo "Starting ML Signature Service (port 5005)..."
cd "$SCRIPT_DIR/server/ml"
export MODEL_PATH="$SCRIPT_DIR/server/best_siamese_transformer.pth"

if [ -f "$SCRIPT_DIR/server/database/venv/bin/activate" ]; then
    # Using venv
    source "$SCRIPT_DIR/server/database/venv/bin/activate"
    python signature_service.py &
    ML_PID=$!
    echo "  ✓ Signature Service started with venv (PID: $ML_PID)"
elif command -v conda &> /dev/null; then
    # Using conda
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate chequemate-ml 2>/dev/null || conda activate base
    python signature_service.py &
    ML_PID=$!
    echo "  ✓ Signature Service started with conda (PID: $ML_PID)"
else
    echo "  ⚠ No Python environment found, skipping signature service"
    ML_PID=""
fi
cd "$SCRIPT_DIR"

sleep 2

# Start backend
echo ""
echo "Starting Backend Server (port 3001)..."
cd "$SCRIPT_DIR/server" && npm start &
BACKEND_PID=$!

sleep 3

# Start frontend instances
cd "$SCRIPT_DIR/client"

echo "Starting Islami Bank (port 5000)..."
npm run dev:ibbl &
IBBL_PID=$!

sleep 1

echo "Starting Sonali Bank (port 5001)..."
npm run dev:sonali &
SONALI_PID=$!

cd "$SCRIPT_DIR"

echo ""
echo "============================================"
echo "  All services started!"
echo "============================================"
echo ""
echo "  Open these URLs in separate browser windows:"
echo ""
echo "  ISLAMI BANK:  http://localhost:5000"
echo "  SONALI BANK:  http://localhost:5001"
echo ""
echo "  Each bank has two login options:"
echo "    - Employee: Can process cheques & view dashboard"
echo "    - Manager: Can review flagged cheques & assign reviewers"
echo ""
echo "  Backend API:           http://localhost:3001"
echo "  ML Signature Service:  http://localhost:5005"
echo "  ML Fraud Detection:    http://localhost:5002"
echo ""
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Handle Ctrl+C to kill all processes
trap "echo 'Stopping all services...'; kill $FRAUD_PID $ML_PID $BACKEND_PID $IBBL_PID $SONALI_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for all processes
wait
