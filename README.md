# SmartBank BD

An intelligent cheque processing system with AI-powered validation, signature verification, and fraud detection for Bangladesh's banking sector.

## Features

- **Local OCR Engine**: Advanced on-premise OCR model for secure cheque data extraction
- **Signature Verification**: Siamese Transformer model for signature matching (local deployment)
- **ML Fraud Detection**: Isolation Forest anomaly detection model (local processing)
- **Multi-Bank Support**: Presenting bank and drawer bank workflows
- **BACH Integration**: Automated cheque clearing house processing
- **Real-time Validation**: Field checks, date validation, MICR reading, funds verification
- **Dashboard**: Comprehensive cheque tracking and management
- **Privacy-First**: All AI/ML models run locally - no external API calls for sensitive banking data
- **Privacy-First**: All AI/ML models run locally - no external API calls for sensitive banking data

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **ML Services**: Python (Flask), PyTorch, OpenCV, PIL
- **OCR**: Local on-premise OCR model for secure data extraction
- **AI/ML**: All models deployed locally for maximum security and privacy

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Python 3.9+ (for ML services)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smartbankbd
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your database and API credentials
```

4. Set up database:
```bash
cd server/database
# Follow instructions in SETUP_GUIDE.md
```

5. Start all services:
```bash
./start-demo.sh
```

The script will start all required services:
- **ML Fraud Detection Service**: Port 5002 (Python Flask)
- **ML Signature Service**: Port 5005 (Python Flask)
- **Backend API Server**: Port 3001 (Node.js/Express)
- **Frontend - Islami Bank**: Port 5000
- **Frontend - Sonali Bank**: Port 5001

Once started, open these URLs in separate browser windows:
- **Islami Bank**: http://localhost:5000
- **Sonali Bank**: http://localhost:5001

Each bank has two login options:
- **Employee**: Can process cheques & view dashboard
- **Manager**: Can review flagged cheques & assign reviewers

Press `Ctrl+C` to stop all services gracefully.

## Test Cheque Image

For testing purposes, use this sample cheque image:

**Path**: `/home/torr20/Documents/script dataset/cheque_process/dummy/valid.jpg`

You can upload this image through the "Process Cheque" interface to test the complete workflow.

## Project Structure

```
smartbankbd/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── services/       # API services
│   │   └── lib/           # Utilities and contexts
├── server/                 # Node.js backend
│   ├── services/          # Business logic services
│   ├── ml/                # Python ML services
│   └── database/          # Database schemas and migrations
├── shared/                # Shared TypeScript types
└── deploy/                # Deployment scripts
```

## Key Components

- **Process Cheque**: Upload and analyze cheque images
- **Dashboard**: View all cheques (inward/outward)
- **Cheque Details**: Deep verification and fraud analysis
- **Manager Dashboard**: Analytics and reporting
- **Customer Analysis**: Behavior profiling and risk assessment

## Development

### Frontend
```bash
cd client
npm run dev
```

### Backend
```bash
cd server
npm run start
```

### ML Services
```bash
cd server/ml
python fraud_prediction.py --server --port 5002
```

## Documentation

- [Database Setup Guide](./server/database/SETUP_GUIDE.md)
- [ML Integration](./ML_INTEGRATION.md)
- [Fraud Detection](./FRAUD_DETECTION.md)
- [Deployment Guide](./deploy/DEPLOY_QUICK.md)

## License

Private - Hackathon Project
