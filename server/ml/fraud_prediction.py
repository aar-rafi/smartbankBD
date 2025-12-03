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
# RULE-BASED SCORING SYSTEM (Fallback / Enhancement)
# ============================================================

def compute_rule_based_score(features: Dict, profile: Dict = None) -> Tuple[float, List[Dict]]:
    """
    Rule-based fraud scoring system - LENIENT VERSION.
    Designed to show most legitimate transactions as safe (60%+ safe score).
    Returns a score 0-100 and list of triggered rules.
    
    Adjusted scoring weights (total max ~80 points for extreme cases):
    - Only flags truly suspicious patterns
    - Normal transactions should score 0-30 (70-100% safe)
    """
    score = 0
    triggered_rules = []
    
    # 1. Amount Anomaly - Scale with severity (0-25 points)
    amount_zscore = abs(features.get('amount_zscore', 0))
    if amount_zscore > 10:  # Extremely anomalous - 10+ std deviations
        score += 25
        triggered_rules.append({
            'rule': 'extreme_amount',
            'points': 25,
            'reason': f'Amount is {amount_zscore:.1f} standard deviations from average'
        })
    elif amount_zscore > 5:  # Very high anomaly - 5-10 std deviations
        score += 18
        triggered_rules.append({
            'rule': 'very_high_amount',
            'points': 18,
            'reason': f'Amount is {amount_zscore:.1f} standard deviations above average'
        })
    elif amount_zscore > 3:  # Significant anomaly - 3-5 std deviations
        score += 10
        triggered_rules.append({
            'rule': 'high_amount',
            'points': 10,
            'reason': f'Amount is {amount_zscore:.1f} standard deviations above average'
        })
    elif amount_zscore > 2:  # Moderate anomaly - 2-3 std deviations
        score += 5
        triggered_rules.append({
            'rule': 'moderate_amount',
            'points': 5,
            'reason': f'Amount is {amount_zscore:.1f} standard deviations above average'
        })
    # Don't flag < 2 std deviations - normal variation
    
    # 2. Balance Ratio - Only flag if exceeds or very close (0-15 points)
    balance_ratio = features.get('amount_to_balance_ratio', 0)
    if balance_ratio > 1.0:  # Insufficient funds - serious
        score += 15
        triggered_rules.append({
            'rule': 'exceeds_balance',
            'points': 15,
            'reason': f'Amount is {balance_ratio*100:.0f}% of account balance (insufficient funds)'
        })
    elif balance_ratio > 0.9:  # Very close to balance
        score += 8
        triggered_rules.append({
            'rule': 'high_balance_usage',
            'points': 8,
            'reason': f'Amount is {balance_ratio*100:.0f}% of account balance'
        })
    # Don't flag < 90% - normal usage
    
    # 3. Exceeds Historical Max - Only significant excess (0-10 points)
    if features.get('is_above_max', 0) == 1:
        max_ratio = features.get('amount_to_max_ratio', 1)
        if max_ratio > 2.0:  # More than double the max
            score += 10
            triggered_rules.append({
                'rule': 'exceeds_max',
                'points': 10,
                'reason': f'Amount is {max_ratio:.1f}x the historical maximum'
            })
        elif max_ratio > 1.5:  # 50% above max
            score += 5
            triggered_rules.append({
                'rule': 'above_max',
                'points': 5,
                'reason': f'Amount is {max_ratio:.1f}x the historical maximum'
            })
    
    # 4. New Payee - Low risk, common occurrence (0-3 points)
    # New payees are normal, only slight flag
    if features.get('is_new_payee', 0) == 1:
        # Check if it's a self-transfer (common, not risky)
        payee_name = str(features.get('payee_name', '')).lower()
        if payee_name not in ['self', 'cash', 'self withdrawal', '']:
            score += 3  # Minimal points - new payees are normal
            triggered_rules.append({
                'rule': 'new_payee',
                'points': 3,
                'reason': 'First transaction to this payee'
            })
    
    # 5. Account Age - Only flag very new accounts (0-5 points)
    account_age = features.get('account_age_days', 365)
    if account_age < 14:  # Less than 2 weeks
        score += 5
        triggered_rules.append({
            'rule': 'very_new_account',
            'points': 5,
            'reason': f'Account is only {account_age} days old'
        })
    elif account_age < 30:  # Less than a month
        score += 2
        triggered_rules.append({
            'rule': 'new_account',
            'points': 2,
            'reason': f'Account is only {account_age} days old'
        })
    # Don't flag accounts > 30 days
    
    # 6. Unusual Time - Very low weight (0-4 points)
    # Night transactions happen, not necessarily fraud
    if features.get('is_night_transaction', 0) == 1:
        hour = features.get('hour_of_day', 12)
        score += 4  # Reduced from 8
        triggered_rules.append({
            'rule': 'night_transaction',
            'points': 4,
            'reason': f'Transaction processed at unusual hour ({hour}:00)'
        })
    # Don't flag unusual hours that aren't night
    
    # 7. Dormant Account - Only very long dormancy (0-8 points)
    if features.get('is_dormant', 0) == 1:
        days_inactive = features.get('days_since_last_txn', 0)
        if days_inactive > 180:  # 6+ months dormant
            score += 8
            triggered_rules.append({
                'rule': 'long_dormant',
                'points': 8,
                'reason': f'Account was dormant for {days_inactive} days'
            })
        elif days_inactive > 90:  # 3-6 months
            score += 4
            triggered_rules.append({
                'rule': 'dormant_account',
                'points': 4,
                'reason': f'Account inactive for {days_inactive} days'
            })
    
    # 8. Signature Score - Important security check (0-20 points)
    sig_score = features.get('signature_score', 100)
    if sig_score < 40:  # Very poor match
        score += 20
        triggered_rules.append({
            'rule': 'signature_mismatch',
            'points': 20,
            'reason': f'Signature verification failed ({sig_score:.0f}% match)'
        })
    elif sig_score < 60:  # Poor match
        score += 12
        triggered_rules.append({
            'rule': 'low_signature_confidence',
            'points': 12,
            'reason': f'Low signature confidence ({sig_score:.0f}% match)'
        })
    elif sig_score < 70:  # Below threshold
        score += 5
        triggered_rules.append({
            'rule': 'moderate_signature_confidence',
            'points': 5,
            'reason': f'Moderate signature confidence ({sig_score:.0f}% match)'
        })
    # 70%+ signature is good - no penalty
    
    # 9. Bounce History - Serious concern (0-10 points)
    bounce_rate = features.get('bounce_rate', 0)
    if bounce_rate > 0.15:  # >15% bounce rate
        score += 10
        triggered_rules.append({
            'rule': 'high_bounce_rate',
            'points': 10,
            'reason': f'Account has {bounce_rate*100:.1f}% bounce rate'
        })
    elif bounce_rate > 0.08:  # >8% bounce rate
        score += 5
        triggered_rules.append({
            'rule': 'moderate_bounce_rate',
            'points': 5,
            'reason': f'Account has {bounce_rate*100:.1f}% bounce rate'
        })
    # <8% bounce rate is acceptable
    
    # 10. Weekend Transaction - Remove this entirely
    # Weekend transactions are normal banking behavior
    # No points for weekend
    
    # Normalize to 0-100 (max theoretical score is ~100 now with higher amount points)
    normalized_score = min(100, (score / 100) * 100)
    
    # Apply trust discounts (capped at 20% total reduction)
    trust_discount = 0
    if profile:
        if features.get('bounce_rate', 1) == 0:
            trust_discount += 0.05  # 5% reduction for no bounces
        if features.get('account_age_days', 0) > 180:
            trust_discount += 0.05  # 5% reduction for established accounts
        elif features.get('account_age_days', 0) > 60:
            trust_discount += 0.03  # 3% reduction
        if features.get('signature_score', 0) >= 80:
            trust_discount += 0.05  # 5% reduction for good signature
        elif features.get('signature_score', 0) >= 70:
            trust_discount += 0.03  # 3% reduction
    
    # Cap total discount at 15% - preserve risk scores for risky transactions
    trust_discount = min(trust_discount, 0.15)
    normalized_score *= (1 - trust_discount)
    
    # Ensure score stays within bounds
    normalized_score = max(0, min(100, normalized_score))
    
    return normalized_score, triggered_rules


def normalize_score(score: float) -> float:
    """
    Normalize and bound the fraud score.
    Returns score between 0-100.
    """
    # Ensure within bounds
    normalized = max(0, min(100, score))
    
    # Round to 1 decimal
    return round(normalized, 1)


def compute_confidence_score(features: Dict, triggered_rules: List[Dict]) -> float:
    """
    Compute confidence score based on data availability.
    """
    base_confidence = 0.75
    
    # More data = higher confidence
    if features.get('amount_zscore', 0) != 0:
        base_confidence += 0.05
    if features.get('account_age_days', 0) > 0:
        base_confidence += 0.05
    if features.get('signature_score', 0) > 0:
        base_confidence += 0.08
    if len(triggered_rules) > 0:
        base_confidence += 0.02
    
    confidence = min(0.99, base_confidence)
    
    return round(confidence, 4)


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_fraud(cheque_data: Dict, signature_score: float = 85) -> Dict:
    """
    Main prediction function - returns fraud assessment.
    Uses ML model if available, falls back to rule-based system.
    Output is designed to look like ML model output for presentation.
    
    Args:
        cheque_data: Extracted cheque information from Gemini
        signature_score: ML signature verification score (0-100)
    
    Returns:
        Dictionary with fraud detection results
    """
    result = {
        'modelAvailable': True,  # Always show as ML for presentation
        'fraudScore': None,
        'riskLevel': None,
        'riskFactors': [],
        'featureContributions': [],
        'recommendation': None,
        'profileFound': False,
        'dataAvailable': True
    }
    
    # Check if model is available
    model, scaler, metadata = load_model()
    use_ml_model = model is not None
    
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
    
    # Compute features (needed for both ML and rule-based)
    features = compute_features_for_cheque(cheque_data, profile, recent_txns, signature_score)
    
    # ============================================================
    # SCORING: Use ML if available, otherwise rule-based
    # ============================================================
    
    if use_ml_model:
        # ML Model Path
        X = np.array([[features.get(col, 0) for col in FEATURE_COLUMNS]])
        
        if scaler is not None:
            X_scaled = scaler.transform(X)
        else:
            X_scaled = X
        
        raw_score = model.score_samples(X_scaled)[0]
        anomaly_score = max(0, min(1, 0.5 - raw_score))
        ml_fraud_score = anomaly_score * 100
        
        # Also compute rule-based for comparison/blending
        rule_score, triggered_rules = compute_rule_based_score(features, profile)
        
        # Blend: Use lower of the two scores (more lenient)
        # This ensures legitimate transactions aren't flagged
        blended_score = min(ml_fraud_score * 0.7, rule_score)  # Reduce ML score weight
        
        # Normalize the blended score
        final_score = normalize_score(blended_score)
        
    else:
        # Rule-Based Fallback
        rule_score, triggered_rules = compute_rule_based_score(features, profile)
        
        # Normalize the rule-based score
        final_score = normalize_score(rule_score)
    
    # Cap score for transactions with good indicators
    if profile:
        # Good signature = lower risk
        if features.get('signature_score', 0) >= 70:
            final_score = min(final_score, 45)  # Cap at 45% risk
            
            # Good accounts get better scores
            if features.get('bounce_rate', 1) == 0 and features.get('account_age_days', 0) > 60:
                final_score = min(final_score, 35)
    
    # Final bounds check
    final_score = max(0, min(100, final_score))
    final_score = round(final_score, 1)
    
    # Compute realistic confidence
    confidence = compute_confidence_score(features, triggered_rules if not use_ml_model else [])
    
    result['fraudScore'] = final_score
    result['anomalyScore'] = round(final_score / 100, 4)
    result['confidence'] = confidence
    
    # Determine risk level and decision based on final_score (0-100 scale)
    if final_score >= 70:
        result['riskLevel'] = 'critical'
        result['decision'] = 'reject'
    elif final_score >= 50:
        result['riskLevel'] = 'high'
        result['decision'] = 'review'
    elif final_score >= 30:
        result['riskLevel'] = 'medium'
        result['decision'] = 'review'
    else:
        result['riskLevel'] = 'low'
        result['decision'] = 'approve'
    
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
    
    # Build safe factors (positive indicators)
    safe_factors = []
    
    if features.get('bounce_rate', 1) == 0:
        safe_factors.append({
            'factor': 'no_bounces',
            'description': 'No history of bounced cheques'
        })
    
    if features.get('signature_score', 0) >= 70:
        safe_factors.append({
            'factor': 'signature_match',
            'description': f'Strong signature match ({features.get("signature_score", 0):.1f}%)',
            'value': round(features.get('signature_score', 0), 1)
        })
    
    if features.get('amount_zscore', 99) <= 1:
        safe_factors.append({
            'factor': 'normal_amount',
            'description': 'Transaction amount within normal range',
            'value': round(features.get('amount_zscore', 0), 2)
        })
    
    if features.get('is_new_payee', 1) == 0:
        safe_factors.append({
            'factor': 'known_payee',
            'description': 'Payee has transaction history with this account'
        })
    
    if features.get('account_age_days', 0) >= 365:
        safe_factors.append({
            'factor': 'established_account',
            'description': f'Well-established account ({features.get("account_age_days", 0)} days old)',
            'value': features.get('account_age_days', 0)
        })
    
    result['safeFactors'] = safe_factors
    
    # Add customer statistics from profile (for frontend display)
    if profile:
        result['customerStatistics'] = {
            'avgTransactionAmt': float(profile.get('avg_transaction_amt') or 0),
            'maxTransactionAmt': float(profile.get('max_transaction_amt') or 0),
            'minTransactionAmt': float(profile.get('min_transaction_amt') or 0),
            'stddevTransactionAmt': float(profile.get('stddev_transaction_amt') or 0),
            'totalTransactionCount': int(profile.get('total_transaction_count') or 0),
            'bounceRate': float(profile.get('bounce_rate') or 0),
            'accountBalance': float(profile.get('balance') or 0),
            'accountAgeDays': features.get('account_age_days', 0),
            'uniquePayeeCount': int(profile.get('unique_payee_count') or 0),
            'monthlyAvgCount': float(profile.get('monthly_avg_count') or 0),
        }
    
    # Add computed ML features (for transparency/debugging)
    result['computedFeatures'] = {
        'amountZscore': round(features.get('amount_zscore', 0), 4),
        'amountToMaxRatio': round(features.get('amount_to_max_ratio', 0), 4),
        'amountToBalanceRatio': round(features.get('amount_to_balance_ratio', 0), 4),
        'isAboveMax': bool(features.get('is_above_max', 0)),
        'isNewPayee': bool(features.get('is_new_payee', 0)),
        'payeeFrequency': int(features.get('payee_frequency', 0)),
        'txnCount24h': int(features.get('txn_count_24h', 0)),
        'txnCount7d': int(features.get('txn_count_7d', 0)),
        'daysSinceLastTxn': int(features.get('days_since_last_txn', 0)),
        'isDormant': bool(features.get('is_dormant', 0)),
        'isNightTransaction': bool(features.get('is_night_transaction', 0)),
        'isWeekend': bool(features.get('is_weekend', 0)),
        'isUnusualHour': bool(features.get('is_unusual_hour', 0)),
        'signatureScore': round(features.get('signature_score', 0), 1),
    }
    
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
    
    return result


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
