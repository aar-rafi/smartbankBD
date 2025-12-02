# Fraud Detection Integration

## Overview

The ChequeMate AI system now includes ML-based fraud detection using an **Isolation Forest** anomaly detection model. The system analyzes cheque transactions against historical patterns to identify potentially fraudulent activity.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Frontend UI   │────▶│  Node.js Server  │────▶│  Python ML Service  │
│  (React + TS)   │     │   (Express API)  │     │ (Isolation Forest)  │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
         │                       │                         │
         │                       │                         ▼
         │                       │              ┌─────────────────────┐
         │                       └─────────────▶│    PostgreSQL DB    │
         │                                      │ (Account Profiles)  │
         ▼                                      └─────────────────────┘
┌─────────────────┐
│ FraudDetection  │
│   Component     │
└─────────────────┘
```

## Components

### 1. Python ML Service (`server/ml/fraud_prediction.py`)

Loads the trained Isolation Forest model and computes fraud scores:

- **20 Features** analyzed:
  - Amount features (zscore, max ratio, balance ratio)
  - Payee features (new payee, frequency, unique ratio)
  - Time features (hour, day, weekend, night transactions)
  - Velocity features (24h/7d transaction counts, dormancy)
  - Account health (age, bounce rate, balance)
  - Signature score from ML verification

- **Risk Levels**:
  - `normal` (< 30%): Safe to process
  - `low` (30-50%): Minor anomalies
  - `medium` (50-70%): Needs review
  - `high` (≥ 70%): Likely fraud

### 2. TypeScript Service (`server/services/fraudDetectionService.ts`)

Bridge between Node.js and Python:

```typescript
// Check model status
const status = await checkModelStatus();

// Run fraud detection
const result = await detectFraud(chequeData, signatureScore);
```

### 3. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fraud-detection/status` | GET | Check if ML model is loaded |
| `/api/fraud-detection` | POST | Run fraud detection analysis |

### 4. Frontend Component (`client/src/components/FraudDetection.tsx`)

Displays:
- Risk score meter (0-100%)
- Risk level badge (Normal/Low/Medium/High)
- Risk factors detected with severity
- Feature analysis breakdown
- Recommendation for action

## Setup & Usage

### 1. Install Python Dependencies

```bash
cd server/ml
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train_fraud_model.py
```

This creates:
- `anomaly_model.pkl` - Trained Isolation Forest
- `anomaly_scaler.pkl` - Feature scaler
- `anomaly_metadata.pkl` - Model metadata
- `anomaly_features.txt` - Feature list

### 3. Run the Application

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

### 4. Test the API

```bash
# Check model status
curl http://localhost:3001/api/fraud-detection/status

# Run fraud detection
curl -X POST http://localhost:3001/api/fraud-detection \
  -H "Content-Type: application/json" \
  -d '{
    "chequeData": {
      "accountNumber": "1234567890",
      "amountDigits": 50000,
      "payeeName": "John Doe",
      "date": "2025-12-03",
      "hasSignature": true
    },
    "signatureScore": 85
  }'
```

## Demo Mode

When the ML model is not trained/available:
- System automatically falls back to **demo mode**
- Shows simulated risk scores based on basic heuristics
- UI clearly indicates "Demo Mode" with a warning badge

## Response Format

```json
{
  "success": true,
  "fraudDetection": {
    "modelAvailable": true,
    "dataAvailable": true,
    "profileFound": true,
    "fraudScore": 35.5,
    "riskLevel": "low",
    "riskFactors": [
      {
        "factor": "new_payee",
        "severity": "low",
        "description": "Payment to a new/unknown payee",
        "value": "John Doe"
      }
    ],
    "featureContributions": [
      {"name": "Amount Analysis", "value": 0.5, "impact": "normal"},
      {"name": "Payee History", "value": "New", "impact": "medium"}
    ],
    "recommendation": "CAUTION - Minor anomalies detected. Proceed with standard verification."
  }
}
```

## Risk Factors Detected

| Factor | Severity | Description |
|--------|----------|-------------|
| `unusual_amount` | medium/high | Amount significantly above average |
| `new_payee` | low/high | First-time payee (higher if large amount) |
| `unusual_time` | medium | Transaction outside business hours |
| `high_velocity` | medium | Multiple transactions in short period |
| `dormant_account` | high | Account inactive for 90+ days |
| `signature_mismatch` | medium/high | Low ML signature verification score |
| `high_balance_ratio` | high | Transaction > 80% of balance |
| `exceeds_max` | medium | Amount exceeds historical maximum |
| `high_bounce_rate` | medium | Account has high cheque bounce rate |

## Extending the System

### Adding New Risk Factors

Edit `server/ml/fraud_prediction.py`:

```python
# In predict_fraud() function
if some_condition:
    risk_factors.append({
        'factor': 'new_factor_name',
        'severity': 'high',
        'description': 'Human-readable description',
        'value': actual_value
    })
```

### Adjusting Thresholds

Edit `THRESHOLDS` in `fraud_prediction.py`:

```python
THRESHOLDS = {
    'high_risk': 0.7,      # Adjust as needed
    'medium_risk': 0.5,
    'low_risk': 0.3
}
```

### Retraining the Model

```bash
# After adding new transaction data
cd server/ml
python train_fraud_model.py
```

The model automatically:
1. Fetches data from PostgreSQL
2. Extracts features from transactions
3. Trains Isolation Forest (unsupervised - no labels needed)
4. Saves updated model files
