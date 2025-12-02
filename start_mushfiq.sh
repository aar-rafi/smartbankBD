#!/bin/bash

# ChequeMate AI - Startup Script for Mushfiq
# This script starts all three services: ML Service, Backend Server, and Frontend Client

echo "=============================================="
echo "🚀 ChequeMate AI - Starting All Services"
echo "=============================================="

# Hardcoded paths and configuration
PROJECT_DIR="/home/mushfiqur-rahman/SOlVIO HACKATHON/smartbankBD"
MODEL_PATH="/home/mushfiqur-rahman/SOlVIO HACKATHON/smartbankBD/best_siamese_transformer.pth"
CONDA_ENV="chequemate-ml"

# Database configuration (hardcoded)
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="chequemate"
export DB_USER="postgres"
export DB_PASSWORD="postgres"
export DB_SSL="false"

# Server configuration
export SERVER_PORT="3001"
export FRONTEND_URL="http://localhost:5000"
export NODE_ENV="development"

# ML Service configuration
export ML_SERVICE_PORT="5001"
export MODEL_PATH="$MODEL_PATH"

# Gemini API Key (replace with your actual key)
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

cd "$PROJECT_DIR"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chequemate
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Server
SERVER_PORT=3001
FRONTEND_URL=http://localhost:5000
NODE_ENV=development

# ML Service
ML_SERVICE_PORT=5001
MODEL_PATH=$MODEL_PATH

# Gemini API (replace with your key)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
EOF
    echo "✅ .env.local created"
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $ML_PID $SERVER_PID $CLIENT_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo "📦 Starting ML Signature Service (Port $ML_SERVICE_PORT)..."
echo "   Model: $MODEL_PATH"
cd "$PROJECT_DIR/server/ml"

# Activate conda and start ML service
source ~/anaconda3/etc/profile.d/conda.sh 2>/dev/null || source ~/miniconda3/etc/profile.d/conda.sh 2>/dev/null || source /opt/conda/etc/profile.d/conda.sh 2>/dev/null
conda activate $CONDA_ENV
MODEL_PATH="$MODEL_PATH" python signature_service.py &
ML_PID=$!
echo "   PID: $ML_PID"

# Wait a bit for ML service to start
sleep 3

echo ""
echo "🖥️  Starting Backend Server (Port $SERVER_PORT)..."
cd "$PROJECT_DIR"
npm run start:server &
SERVER_PID=$!
echo "   PID: $SERVER_PID"

# Wait a bit for server to start
sleep 2

echo ""
echo "🌐 Starting Frontend Client (Port 5000)..."
cd "$PROJECT_DIR"
npm run dev:client &
CLIENT_PID=$!
echo "   PID: $CLIENT_PID"

echo ""
echo "=============================================="
echo "✅ All services started!"
echo "=============================================="
echo ""
echo "📡 Services:"
echo "   - Frontend:   http://localhost:5000"
echo "   - Backend:    http://localhost:$SERVER_PORT"
echo "   - ML Service: http://localhost:$ML_SERVICE_PORT"
echo ""
echo "🔗 API Endpoints:"
echo "   - Health:     http://localhost:$SERVER_PORT/api/health"
echo "   - Validate:   http://localhost:$SERVER_PORT/api/validate-cheque"
echo "   - Signature:  http://localhost:$ML_SERVICE_PORT/verify-signature"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=============================================="

# Wait for all background processes
wait
