"""
Fraud Detection Prediction Service
==================================
Loads the trained Isolation Forest model and provides predictions.
Called from Node.js via subprocess or HTTP API.

Usage:
    python fraud_prediction.py --predict '{"amount": 50000, ...}'
    python fraud_prediction.py --server  (runs Flask API on port 5002)
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

# ML Libraries
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
import joblib

# Database
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
from dotenv import load_dotenv
# Try .env.local first (project root), then .env
env_local = os.path.join(os.path.dirname(__file__), '..', '..', '.env.local')
env_file = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
if os.path.exists(env_local):
    load_dotenv(env_local)
elif os.path.exists(env_file):
    load_dotenv(env_file)

# ============================================================
# CONSTANTS & CONFIGURATION
# ============================================================

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

# Feature columns for model (20 features)
FEATURE_COLUMNS = [
    # Amount features (4)
    'amount_zscore', 'amount_to_max_ratio', 'amount_to_balance_ratio', 'is_above_max',
    # Payee features (3)
    'is_new_payee', 'payee_frequency', 'unique_payee_ratio',
    # Time features (5)
    'hour_of_day', 'day_of_week', 'is_unusual_hour', 'is_weekend', 'is_night_transaction',
    # Velocity features (4)
    'txn_count_24h', 'txn_count_7d', 'days_since_last_txn', 'is_dormant',
    # Account health features (3)
    'account_age_days', 'bounce_rate', 'avg_balance',
    # Signal features (1)
    'signature_score'
]

# Risk thresholds
THRESHOLDS = {
    'high_risk': 0.7,      # Score >= 0.7 → High risk
    'medium_risk': 0.5,    # Score 0.5-0.7 → Medium risk
    'low_risk': 0.3        # Score 0.3-0.5 → Low risk
}

# ============================================================
# MODEL LOADING
# ============================================================

_model = None
_scaler = None
_metadata = None

def load_model():
    """Load trained model, scaler, and metadata (cached)"""
    global _model, _scaler, _metadata
    
    if _model is not None:
        return _model, _scaler, _metadata
    
    model_path = os.path.join(MODEL_DIR, 'anomaly_model.pkl')
    scaler_path = os.path.join(MODEL_DIR, 'anomaly_scaler.pkl')
    metadata_path = os.path.join(MODEL_DIR, 'anomaly_metadata.pkl')
    
    # Check if model files exist
    if not os.path.exists(model_path):
        return None, None, None
    
    try:
        _model = joblib.load(model_path)
        _scaler = joblib.load(scaler_path) if os.path.exists(scaler_path) else None
        _metadata = joblib.load(metadata_path) if os.path.exists(metadata_path) else {}
        return _model, _scaler, _metadata
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        return None, None, None


def is_model_available() -> bool:
    """Check if the fraud detection model is available"""
    model, _, _ = load_model()
    return model is not None


# ============================================================
# DATABASE FUNCTIONS
# ============================================================

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
        database=os.environ.get('DB_NAME', 'chequemate'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', 'postgres')
    )


def get_account_profile(account_number: str) -> Optional[Dict]:
    """Fetch customer profile for an account"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            cp.avg_transaction_amt,
            cp.max_transaction_amt,
            cp.min_transaction_amt,
            cp.stddev_transaction_amt,
            cp.total_transaction_count,
            cp.monthly_avg_count,
            cp.total_cheques_issued,
            cp.bounced_cheques_count,
            cp.bounce_rate,
            cp.usual_hours,
            cp.avg_days_between_txn,
            cp.unique_payee_count,
            cp.risk_score,
            a.account_id,
            a.balance,
            a.created_at as account_created_at
        FROM accounts a
        LEFT JOIN customer_profiles cp ON a.account_id = cp.account_id
        WHERE a.account_number = %s
        """
        
        cursor.execute(query, (account_number,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        print(f"Database error: {e}", file=sys.stderr)
        return None


def get_recent_transactions(account_id: int) -> List[Dict]:
    """Get recent transactions for velocity features"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            txn_type,
            amount,
            receiver_name,
            txn_date,
            txn_time,
            created_at
        FROM transactions
        WHERE account_id = %s
        ORDER BY created_at DESC
        LIMIT 100
        """
        
        cursor.execute(query, (account_id,))
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(r) for r in results]
        
    except Exception as e:
        print(f"Database error: {e}", file=sys.stderr)
        return []


# ============================================================
# FEATURE COMPUTATION
# ============================================================

def compute_features_for_cheque(cheque_data: Dict, profile: Optional[Dict], 
                                 recent_txns: List[Dict], signature_score: float = 85) -> Dict:
    """
    Compute all 20 features for fraud detection from cheque data
    
    Args:
        cheque_data: Extracted cheque information (amount, payee, date, etc.)
        profile: Customer profile from database (may be None)
        recent_txns: Recent transactions for velocity calculation
        signature_score: ML signature verification score (0-100)
    
    Returns:
        Dictionary of feature values
    """
    features = {}
    
    # Get amount from cheque
    amount = float(cheque_data.get('amountDigits') or 0)
    if amount == 0:
        # Try parsing from amountWords if digits not available
        amount = 10000  # Default for demo
    
    # === AMOUNT FEATURES (4) ===
    if profile and profile.get('stddev_transaction_amt'):
        avg_amt = float(profile.get('avg_transaction_amt') or 0)
        std_amt = float(profile.get('stddev_transaction_amt') or 1)
        max_amt = float(profile.get('max_transaction_amt') or amount)
        
        features['amount_zscore'] = (amount - avg_amt) / std_amt if std_amt > 0 else 0
        features['amount_to_max_ratio'] = amount / max_amt if max_amt > 0 else 1
    else:
        # No profile - use defaults
        features['amount_zscore'] = 0
        features['amount_to_max_ratio'] = 1
    
    # Balance ratio
    balance = float(profile.get('balance') or 100000) if profile else 100000
    features['amount_to_balance_ratio'] = amount / balance if balance > 0 else 10
    
    # Is above historical max
    if profile and profile.get('max_transaction_amt'):
        features['is_above_max'] = 1 if amount > float(profile['max_transaction_amt']) else 0
    else:
        features['is_above_max'] = 0
    
    # === PAYEE FEATURES (3) ===
    payee = cheque_data.get('payeeName') or ''
    
    if recent_txns:
        past_receivers = [t.get('receiver_name', '') for t in recent_txns if t.get('receiver_name')]
        features['is_new_payee'] = 0 if payee and payee in past_receivers else 1
        features['payee_frequency'] = past_receivers.count(payee) if payee else 0
        features['unique_payee_ratio'] = len(set(past_receivers)) / len(past_receivers) if past_receivers else 1
    else:
        features['is_new_payee'] = 1
        features['payee_frequency'] = 0
        features['unique_payee_ratio'] = 1
    
    # === TIME FEATURES (5) ===
    # Parse cheque date or use current time
    cheque_date = cheque_data.get('date')
    if cheque_date:
        try:
            dt = datetime.strptime(cheque_date, '%Y-%m-%d')
        except:
            try:
                dt = datetime.strptime(cheque_date, '%d/%m/%Y')
            except:
                dt = datetime.now()
    else:
        dt = datetime.now()
    
    hour = datetime.now().hour  # Processing time
    day_of_week = dt.weekday()
    
    features['hour_of_day'] = hour
    features['day_of_week'] = day_of_week
    features['is_weekend'] = 1 if day_of_week >= 5 else 0
    features['is_night_transaction'] = 1 if hour < 6 or hour > 21 else 0
    
    # Check unusual hour based on profile
    if profile and profile.get('usual_hours'):
        usual_hours = profile['usual_hours'] if isinstance(profile['usual_hours'], list) else []
        features['is_unusual_hour'] = 0 if hour in usual_hours else 1
    else:
        features['is_unusual_hour'] = 0 if 9 <= hour <= 17 else 1
    
    # === VELOCITY FEATURES (4) ===
    now = datetime.now()
    
    if recent_txns:
        # Count transactions in last 24h and 7 days
        txn_24h = 0
        txn_7d = 0
        last_txn_time = None
        
        for txn in recent_txns:
            txn_time = txn.get('created_at')
            if txn_time:
                if isinstance(txn_time, str):
                    txn_time = datetime.fromisoformat(txn_time.replace('Z', '+00:00'))
                
                diff = now - txn_time.replace(tzinfo=None)
                
                if diff.total_seconds() <= 86400:  # 24h
                    txn_24h += 1
                if diff.days <= 7:
                    txn_7d += 1
                
                if last_txn_time is None or txn_time > last_txn_time:
                    last_txn_time = txn_time
        
        features['txn_count_24h'] = txn_24h
        features['txn_count_7d'] = txn_7d
        
        if last_txn_time:
            features['days_since_last_txn'] = (now - last_txn_time.replace(tzinfo=None)).days
        else:
            features['days_since_last_txn'] = 0
        
        features['is_dormant'] = 1 if features['days_since_last_txn'] > 90 else 0
    else:
        features['txn_count_24h'] = 0
        features['txn_count_7d'] = 0
        features['days_since_last_txn'] = 0
        features['is_dormant'] = 0
    
    # === ACCOUNT HEALTH FEATURES (3) ===
    if profile and profile.get('account_created_at'):
        account_created = profile['account_created_at']
        if isinstance(account_created, str):
            account_created = datetime.fromisoformat(account_created.replace('Z', '+00:00'))
        features['account_age_days'] = (now - account_created.replace(tzinfo=None)).days
    else:
        features['account_age_days'] = 365  # Default 1 year
    
    if profile and profile.get('bounce_rate') is not None:
        features['bounce_rate'] = float(profile['bounce_rate']) / 100
    else:
        features['bounce_rate'] = 0
    
    features['avg_balance'] = balance
    
    # === SIGNATURE SCORE (from ML signature verification) ===
    features['signature_score'] = signature_score
    
    return features


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_fraud(cheque_data: Dict, signature_score: float = 85) -> Dict:
    """
    Main prediction function - returns fraud assessment
    
    Args:
        cheque_data: Extracted cheque information from Gemini
        signature_score: ML signature verification score (0-100)
    
    Returns:
        Dictionary with fraud detection results
    """
    result = {
        'modelAvailable': False,
        'fraudScore': None,
        'riskLevel': None,
        'riskFactors': [],
        'featureContributions': [],
        'recommendation': None,
        'profileFound': False,
        'dataAvailable': False
    }
    
    # Check if model is available
    model, scaler, metadata = load_model()
    
    if model is None:
        result['error'] = 'Fraud detection model not trained or not available'
        print_fraud_result(cheque_data, result, {})
        return result
    
    result['modelAvailable'] = True
    result['dataAvailable'] = True
    
    # Try to get account profile from database
    account_number = cheque_data.get('accountNumber')
    profile = None
    recent_txns = []
    
    if account_number:
        profile = get_account_profile(account_number)
        if profile:
            result['profileFound'] = True
            account_id = profile.get('account_id')
            if account_id:
                recent_txns = get_recent_transactions(account_id)
    
    # Compute features
    features = compute_features_for_cheque(cheque_data, profile, recent_txns, signature_score)
    
    # Prepare feature vector
    X = np.array([[features.get(col, 0) for col in FEATURE_COLUMNS]])
    
    # Scale features
    if scaler is not None:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X
    
    # Get raw score and convert to 0-1 scale
    raw_score = model.score_samples(X_scaled)[0]
    
    # Convert raw score to anomaly score (0-1, higher = more suspicious)
    # Isolation Forest: lower raw score = more anomalous
    # Typical range: -0.5 (anomaly) to 0.0 (normal)
    anomaly_score = max(0, min(1, 0.5 - raw_score))
    
    result['fraudScore'] = round(anomaly_score * 100, 1)  # Convert to 0-100
    result['anomalyScore'] = round(anomaly_score, 4)  # Raw 0-1 score
    
    # Determine risk level and decision
    if anomaly_score >= THRESHOLDS['high_risk']:
        result['riskLevel'] = 'critical'
        result['decision'] = 'reject'
    elif anomaly_score >= THRESHOLDS['medium_risk']:
        result['riskLevel'] = 'high'
        result['decision'] = 'review'
    elif anomaly_score >= THRESHOLDS['low_risk']:
        result['riskLevel'] = 'medium'
        result['decision'] = 'review'
    else:
        result['riskLevel'] = 'low'
        result['decision'] = 'approve'
    
    result['confidence'] = round(anomaly_score, 4)
    
    # Build detailed explanations list
    explanations = []
    
    # Amount analysis
    amount = float(cheque_data.get('amountDigits') or 0)
    avg_amt = float(profile.get('avg_transaction_amt') or 0) if profile else 0
    
    if features.get('amount_zscore', 0) > 2:
        zscore = features['amount_zscore']
        explanations.append(f"Amount is unusual ({zscore:.1f} standard deviations from customer's average)")
    
    if features.get('is_new_payee', 0) == 1:
        explanations.append(f"First transaction to this payee (new payee: {cheque_data.get('payeeName', 'Unknown')})")
    
    if avg_amt > 0 and amount > 0:
        ratio = amount / avg_amt
        if ratio > 2:
            explanations.append(f"Amount (৳{amount:,.2f}) is {ratio:.1f}x customer's average (৳{avg_amt:,.2f})")
    
    if features.get('is_night_transaction', 0) == 1:
        explanations.append(f"Transaction processed at unusual hour ({features['hour_of_day']}:00)")
    
    if features.get('txn_count_24h', 0) > 3:
        explanations.append(f"High velocity: {features['txn_count_24h']} transactions in last 24 hours")
    
    if features.get('is_dormant', 0) == 1:
        explanations.append(f"Account was dormant for {features['days_since_last_txn']} days before this transaction")
    
    if features.get('signature_score', 100) < 70:
        explanations.append(f"Low signature verification confidence ({features['signature_score']:.0f}%)")
    
    if features.get('amount_to_balance_ratio', 0) > 0.8:
        balance = features.get('avg_balance', 0)
        explanations.append(f"Transaction is {features['amount_to_balance_ratio']*100:.0f}% of account balance (৳{balance:,.2f})")
    
    if features.get('is_above_max', 0) == 1:
        max_amt = float(profile.get('max_transaction_amt') or 0) if profile else 0
        explanations.append(f"Amount exceeds historical maximum (৳{max_amt:,.2f})")
    
    if features.get('bounce_rate', 0) > 0.1:
        explanations.append(f"Account has {features['bounce_rate']*100:.1f}% cheque bounce rate")
    
    if features.get('is_weekend', 0) == 1:
        explanations.append("Transaction on weekend")
    
    if len(explanations) == 0:
        explanations.append("Transaction appears normal - no anomalies detected")
    
    result['explanations'] = explanations
    
    # Identify risk factors (for UI)
    risk_factors = []
    
    if features.get('amount_zscore', 0) > 2:
        risk_factors.append({
            'factor': 'unusual_amount',
            'severity': 'high' if features['amount_zscore'] > 3 else 'medium',
            'description': f'Transaction amount is {features["amount_zscore"]:.1f} standard deviations above average',
            'value': round(features['amount_zscore'], 2)
        })
    
    if features.get('is_new_payee', 0) == 1:
        severity = 'high' if features.get('amount_to_max_ratio', 0) > 1.5 else 'low'
        risk_factors.append({
            'factor': 'new_payee',
            'severity': severity,
            'description': 'Payment to a new/unknown payee',
            'value': cheque_data.get('payeeName', 'Unknown')
        })
    
    if features.get('is_night_transaction', 0) == 1:
        risk_factors.append({
            'factor': 'unusual_time',
            'severity': 'medium',
            'description': f'Transaction processed at unusual hour ({features["hour_of_day"]}:00)',
            'value': features['hour_of_day']
        })
    
    if features.get('txn_count_24h', 0) > 3:
        risk_factors.append({
            'factor': 'high_velocity',
            'severity': 'medium',
            'description': f'High transaction frequency: {features["txn_count_24h"]} transactions in 24 hours',
            'value': features['txn_count_24h']
        })
    
    if features.get('is_dormant', 0) == 1:
        risk_factors.append({
            'factor': 'dormant_account',
            'severity': 'high',
            'description': f'Account was dormant for {features["days_since_last_txn"]} days',
            'value': features['days_since_last_txn']
        })
    
    if features.get('signature_score', 100) < 70:
        risk_factors.append({
            'factor': 'signature_mismatch',
            'severity': 'high' if features['signature_score'] < 50 else 'medium',
            'description': f'Low signature verification confidence ({features["signature_score"]:.0f}%)',
            'value': features['signature_score']
        })
    
    if features.get('amount_to_balance_ratio', 0) > 0.8:
        risk_factors.append({
            'factor': 'high_balance_ratio',
            'severity': 'high',
            'description': f'Transaction is {features["amount_to_balance_ratio"]*100:.0f}% of account balance',
            'value': round(features['amount_to_balance_ratio'] * 100, 1)
        })
    
    if features.get('is_above_max', 0) == 1:
        risk_factors.append({
            'factor': 'exceeds_max',
            'severity': 'medium',
            'description': 'Amount exceeds historical maximum transaction',
            'value': True
        })
    
    if features.get('bounce_rate', 0) > 0.1:
        risk_factors.append({
            'factor': 'high_bounce_rate',
            'severity': 'medium',
            'description': f'Account has {features["bounce_rate"]*100:.1f}% cheque bounce rate',
            'value': round(features['bounce_rate'] * 100, 1)
        })
    
    result['riskFactors'] = risk_factors
    
    # Feature contributions for transparency
    result['featureContributions'] = [
        {'name': 'Amount Analysis', 'value': features.get('amount_zscore', 0), 'impact': 'high' if abs(features.get('amount_zscore', 0)) > 2 else 'normal'},
        {'name': 'Payee History', 'value': 'New' if features.get('is_new_payee') else 'Known', 'impact': 'medium' if features.get('is_new_payee') else 'normal'},
        {'name': 'Transaction Velocity', 'value': features.get('txn_count_24h', 0), 'impact': 'high' if features.get('txn_count_24h', 0) > 3 else 'normal'},
        {'name': 'Account Health', 'value': f"{features.get('bounce_rate', 0)*100:.1f}% bounce rate", 'impact': 'high' if features.get('bounce_rate', 0) > 0.1 else 'normal'},
        {'name': 'Signature Score', 'value': f"{features.get('signature_score', 0):.0f}%", 'impact': 'high' if features.get('signature_score', 100) < 70 else 'normal'},
    ]
    
    # Generate recommendation
    if result['riskLevel'] == 'critical':
        result['recommendation'] = 'REJECT - Critical fraud risk detected. Do not process this cheque.'
    elif result['riskLevel'] == 'high':
        result['recommendation'] = 'REVIEW - High risk detected. Manual verification required.'
    elif result['riskLevel'] == 'medium':
        result['recommendation'] = 'CAUTION - Medium risk. Additional verification recommended.'
    else:
        result['recommendation'] = 'APPROVE - Transaction appears normal. Safe to process.'
    
    # Print detailed console output
    print_fraud_result(cheque_data, result, features, profile)
    
    return result


def print_fraud_result(cheque_data: Dict, result: Dict, features: Dict, profile: Dict = None):
    """
    Print detailed fraud detection result to console in formatted JSON
    """
    # Build the detailed output structure
    amount = float(cheque_data.get('amountDigits') or 0)
    
    console_output = {
        "cheque_id": cheque_data.get('chequeNumber', 'N/A'),
        "cheque_number": cheque_data.get('chequeNumber', 'N/A'),
        "account_number": cheque_data.get('accountNumber', 'N/A'),
        "amount": amount,
        "payee_name": cheque_data.get('payeeName', 'Unknown'),
        "anomaly_score": result.get('anomalyScore', 0),
        "risk_level": result.get('riskLevel', 'unknown'),
        "decision": result.get('decision', 'unknown'),
        "confidence": result.get('confidence', 0),
        "explanations": result.get('explanations', []),
        "model_available": result.get('modelAvailable', False),
        "profile_found": result.get('profileFound', False),
    }
    
    # Add customer profile info if available
    if profile:
        console_output["customer_profile"] = {
            "avg_transaction_amt": float(profile.get('avg_transaction_amt') or 0),
            "max_transaction_amt": float(profile.get('max_transaction_amt') or 0),
            "total_transactions": int(profile.get('total_transaction_count') or 0),
            "bounce_rate": float(profile.get('bounce_rate') or 0),
            "account_balance": float(profile.get('balance') or 0),
        }
    
    # Add feature details
    if features:
        console_output["computed_features"] = {
            "amount_zscore": round(features.get('amount_zscore', 0), 4),
            "amount_to_balance_ratio": round(features.get('amount_to_balance_ratio', 0), 4),
            "is_new_payee": bool(features.get('is_new_payee', 0)),
            "txn_count_24h": int(features.get('txn_count_24h', 0)),
            "is_dormant": bool(features.get('is_dormant', 0)),
            "signature_score": round(features.get('signature_score', 0), 1),
            "is_night_transaction": bool(features.get('is_night_transaction', 0)),
            "is_weekend": bool(features.get('is_weekend', 0)),
        }
    
    # Print formatted output
    print("\n" + "="*70, file=sys.stderr)
    print("🔍 FRAUD DETECTION ANALYSIS RESULT", file=sys.stderr)
    print("="*70, file=sys.stderr)
    print(json.dumps(console_output, indent=2, ensure_ascii=False), file=sys.stderr)
    print("="*70 + "\n", file=sys.stderr)


# ============================================================
# CLI & SERVER
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='Fraud Detection Prediction Service')
    parser.add_argument('--predict', type=str, help='JSON string of cheque data to predict')
    parser.add_argument('--check', action='store_true', help='Check if model is available')
    parser.add_argument('--server', action='store_true', help='Run as Flask API server')
    parser.add_argument('--port', type=int, default=5002, help='Port for Flask server')
    
    args = parser.parse_args()
    
    if args.check:
        # Just check if model is available
        result = {'modelAvailable': is_model_available()}
        print(json.dumps(result))
        return
    
    if args.predict:
        # Predict fraud for given cheque data
        try:
            cheque_data = json.loads(args.predict)
            signature_score = cheque_data.pop('signatureScore', 85)
            result = predict_fraud(cheque_data, signature_score)
            print(json.dumps(result))
        except json.JSONDecodeError as e:
            print(json.dumps({'error': f'Invalid JSON: {str(e)}'}))
        except Exception as e:
            print(json.dumps({'error': f'Prediction failed: {str(e)}'}))
        return
    
    if args.server:
        # Run Flask API server
        try:
            from flask import Flask, request, jsonify
            from flask_cors import CORS
            
            app = Flask(__name__)
            CORS(app)
            
            @app.route('/health', methods=['GET'])
            def health():
                return jsonify({
                    'status': 'ok',
                    'modelAvailable': is_model_available(),
                    'timestamp': datetime.now().isoformat()
                })
            
            @app.route('/predict', methods=['POST'])
            def predict():
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No data provided'}), 400
                
                cheque_data = data.get('chequeData', {})
                signature_score = data.get('signatureScore', 85)
                
                result = predict_fraud(cheque_data, signature_score)
                return jsonify(result)
            
            print(f"🚀 Fraud Detection API running on http://localhost:{args.port}")
            app.run(host='0.0.0.0', port=args.port, debug=False)
            
        except ImportError:
            print("Flask not installed. Install with: pip install flask flask-cors")
            sys.exit(1)
        return
    
    # Default: Read from stdin (for subprocess call from Node.js)
    try:
        input_data = sys.stdin.read()
        if input_data:
            data = json.loads(input_data)
            cheque_data = data.get('chequeData', data)
            signature_score = data.get('signatureScore', 85)
            result = predict_fraud(cheque_data, signature_score)
            print(json.dumps(result))
        else:
            # No input - just check status
            print(json.dumps({'modelAvailable': is_model_available()}))
    except Exception as e:
        print(json.dumps({'error': str(e)}))


if __name__ == '__main__':
    main()
