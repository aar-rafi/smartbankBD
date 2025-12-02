"""
Fraud Detection Model Training Script
=====================================
1. Connects to PostgreSQL database
2. Extracts features from transactions, customer_profiles, accounts
3. Creates synthetic fraud labels based on anomaly rules
4. Trains XGBoost classifier
5. Saves model to fraud_model.pkl

Usage:
    python train_fraud_model.py

Requirements:
    pip install xgboost pandas numpy psycopg2-binary scikit-learn joblib
"""

import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import xgboost as xgb
import joblib

# Database
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db_connection():
    """Create database connection using environment variables"""
    return psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
        database=os.environ.get('DB_NAME', 'chequemate'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', 'postgres')
    )

# ============================================================
# FEATURE EXTRACTION
# ============================================================

class FeatureExtractor:
    """Extract features from database for fraud detection"""
    
    def __init__(self, conn):
        self.conn = conn
    
    def get_all_transactions(self) -> pd.DataFrame:
        """Fetch all transactions with account info"""
        query = """
        SELECT 
            t.transaction_id,
            t.account_id,
            t.txn_type,
            t.amount,
            t.balance_after,
            t.receiver_name,
            t.receiver_account,
            t.receiver_label,
            t.txn_date,
            t.txn_time,
            t.branch_code,
            t.txn_number,
            t.created_at,
            a.account_number,
            a.holder_name,
            a.balance as current_balance,
            a.status as account_status,
            a.created_at as account_created_at
        FROM transactions t
        JOIN accounts a ON t.account_id = a.account_id
        ORDER BY t.account_id, t.created_at
        """
        return pd.read_sql(query, self.conn)
    
    def get_customer_profiles(self) -> pd.DataFrame:
        """Fetch customer profile statistics"""
        query = """
        SELECT 
            cp.account_id,
            cp.avg_transaction_amt,
            cp.max_transaction_amt,
            cp.min_transaction_amt,
            cp.stddev_transaction_amt,
            cp.total_transaction_count,
            cp.monthly_avg_count,
            cp.total_cheques_issued,
            cp.bounced_cheques_count,
            cp.bounce_rate,
            cp.usual_days_of_week,
            cp.usual_hours,
            cp.avg_days_between_txn,
            cp.unique_payee_count,
            cp.risk_score
        FROM customer_profiles cp
        """
        return pd.read_sql(query, self.conn)
    
    def get_cheque_bounces(self) -> pd.DataFrame:
        """Get bounce history per account"""
        query = """
        SELECT 
            c.drawer_account_id as account_id,
            COUNT(cb.bounce_id) as bounce_count
        FROM cheque_bounces cb
        JOIN cheques c ON cb.cheque_id = c.cheque_id
        GROUP BY c.drawer_account_id
        """
        return pd.read_sql(query, self.conn)
    
    def compute_features_for_transaction(self, txn: pd.Series, 
                                          profile: Optional[pd.Series],
                                          txn_history: pd.DataFrame) -> Dict:
        """
        Compute all 20 features for a single transaction
        
        Args:
            txn: Single transaction row
            profile: Customer profile row (may be None)
            txn_history: All previous transactions for this account
        
        Returns:
            Dictionary of feature values
        """
        features = {}
        
        # === AMOUNT FEATURES (4) ===
        amount = float(txn['amount'])
        
        if profile is not None and profile['stddev_transaction_amt'] > 0:
            avg_amt = float(profile['avg_transaction_amt'])
            std_amt = float(profile['stddev_transaction_amt'])
            max_amt = float(profile['max_transaction_amt'])
            
            features['amount_zscore'] = (amount - avg_amt) / std_amt if std_amt > 0 else 0
            features['amount_to_max_ratio'] = amount / max_amt if max_amt > 0 else 1
        else:
            # Compute from history if no profile
            if len(txn_history) > 0:
                avg_amt = txn_history['amount'].mean()
                std_amt = txn_history['amount'].std()
                max_amt = txn_history['amount'].max()
                features['amount_zscore'] = (amount - avg_amt) / std_amt if std_amt > 0 else 0
                features['amount_to_max_ratio'] = amount / max_amt if max_amt > 0 else 1
            else:
                features['amount_zscore'] = 0
                features['amount_to_max_ratio'] = 1
        
        # Balance ratio
        balance = float(txn['current_balance']) if txn['current_balance'] else 0
        features['amount_to_balance_ratio'] = amount / balance if balance > 0 else 10
        
        # Is above historical max
        if profile is not None:
            features['is_above_max'] = 1 if amount > float(profile['max_transaction_amt']) else 0
        elif len(txn_history) > 0:
            features['is_above_max'] = 1 if amount > txn_history['amount'].max() else 0
        else:
            features['is_above_max'] = 0
        
        # === PAYEE FEATURES (3) ===
        receiver = txn['receiver_name']
        
        if len(txn_history) > 0 and receiver:
            past_receivers = txn_history['receiver_name'].dropna().tolist()
            features['is_new_payee'] = 0 if receiver in past_receivers else 1
            features['payee_frequency'] = past_receivers.count(receiver)
            features['unique_payee_ratio'] = len(set(past_receivers)) / len(past_receivers) if past_receivers else 0
        else:
            features['is_new_payee'] = 1  # First transaction = new payee
            features['payee_frequency'] = 0
            features['unique_payee_ratio'] = 1
        
        # === TIME FEATURES (5) ===
        # Extract hour and day
        if txn['txn_time']:
            if isinstance(txn['txn_time'], str):
                hour = int(txn['txn_time'].split(':')[0])
            else:
                hour = txn['txn_time'].hour
        elif txn['created_at']:
            created = pd.to_datetime(txn['created_at'])
            hour = created.hour
        else:
            hour = 12  # Default to noon
        
        if txn['txn_date']:
            if isinstance(txn['txn_date'], str):
                day_of_week = pd.to_datetime(txn['txn_date']).dayofweek
            else:
                day_of_week = txn['txn_date'].weekday()
        elif txn['created_at']:
            day_of_week = pd.to_datetime(txn['created_at']).dayofweek
        else:
            day_of_week = 2  # Default to Wednesday
        
        features['hour_of_day'] = hour
        features['day_of_week'] = day_of_week
        features['is_weekend'] = 1 if day_of_week >= 5 else 0
        features['is_night_transaction'] = 1 if hour < 6 or hour > 21 else 0
        
        # Check if unusual hour based on profile
        if profile is not None and profile['usual_hours']:
            usual_hours = profile['usual_hours'] if isinstance(profile['usual_hours'], list) else []
            features['is_unusual_hour'] = 0 if hour in usual_hours else 1
        else:
            # Business hours: 9am-5pm
            features['is_unusual_hour'] = 0 if 9 <= hour <= 17 else 1
        
        # === VELOCITY FEATURES (4) ===
        if len(txn_history) > 0:
            txn_time = pd.to_datetime(txn['created_at'])
            history_times = pd.to_datetime(txn_history['created_at'])
            
            # Transactions in last 24h
            last_24h = txn_time - timedelta(hours=24)
            features['txn_count_24h'] = len(history_times[history_times >= last_24h])
            
            # Transactions in last 7 days
            last_7d = txn_time - timedelta(days=7)
            features['txn_count_7d'] = len(history_times[history_times >= last_7d])
            
            # Days since last transaction
            if len(history_times) > 0:
                last_txn = history_times.max()
                features['days_since_last_txn'] = (txn_time - last_txn).days
            else:
                features['days_since_last_txn'] = 0
            
            # Is dormant (no activity > 90 days)
            features['is_dormant'] = 1 if features['days_since_last_txn'] > 90 else 0
        else:
            features['txn_count_24h'] = 0
            features['txn_count_7d'] = 0
            features['days_since_last_txn'] = 0
            features['is_dormant'] = 0
        
        # === ACCOUNT HEALTH FEATURES (3) ===
        # Account age
        if txn['account_created_at']:
            account_created = pd.to_datetime(txn['account_created_at'])
            txn_time = pd.to_datetime(txn['created_at'])
            features['account_age_days'] = (txn_time - account_created).days
        else:
            features['account_age_days'] = 365  # Default 1 year
        
        # Bounce rate
        if profile is not None:
            features['bounce_rate'] = float(profile['bounce_rate']) / 100 if profile['bounce_rate'] else 0
        else:
            features['bounce_rate'] = 0
        
        # Average balance (use current as approximation)
        features['avg_balance'] = float(txn['current_balance']) if txn['current_balance'] else 0
        
        # === SIGNATURE SCORE (placeholder - will be filled during inference) ===
        features['signature_score'] = 85  # Default good score for training data
        
        return features
    
    def extract_all_features(self) -> pd.DataFrame:
        """Extract features for all transactions in database"""
        print("Loading data from database...")
        transactions = self.get_all_transactions()
        profiles = self.get_customer_profiles()
        
        print(f"Found {len(transactions)} transactions, {len(profiles)} customer profiles")
        
        # Create profile lookup
        profile_dict = profiles.set_index('account_id').to_dict('index')
        
        all_features = []
        
        for account_id in transactions['account_id'].unique():
            account_txns = transactions[transactions['account_id'] == account_id].sort_values('created_at')
            profile = pd.Series(profile_dict.get(account_id, {})) if account_id in profile_dict else None
            
            for idx, (_, txn) in enumerate(account_txns.iterrows()):
                # Get history (all transactions before this one)
                history = account_txns.iloc[:idx]
                
                # Extract features
                features = self.compute_features_for_transaction(txn, profile, history)
                features['transaction_id'] = txn['transaction_id']
                features['account_id'] = account_id
                features['amount'] = float(txn['amount'])
                features['receiver_name'] = txn['receiver_name']
                
                all_features.append(features)
        
        return pd.DataFrame(all_features)


# ============================================================
# SYNTHETIC LABELING
# ============================================================

def create_synthetic_labels(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create synthetic fraud labels based on anomaly rules
    
    Rules for FRAUD (label=1):
    1. amount_zscore > 3 (3+ standard deviations)
    2. is_new_payee=1 AND amount_to_max_ratio > 2 (new payee + 2x usual max)
    3. is_night_transaction=1 AND is_new_payee=1 (night + new payee)
    4. txn_count_24h > 5 (high velocity - more than 5 in 24h)
    5. is_dormant=1 AND is_above_max=1 (dormant account + above max amount)
    6. bounce_rate > 0.2 AND amount_to_balance_ratio > 0.8 (risky account + high amount)
    """
    
    df = df.copy()
    
    # Initialize all as legitimate
    df['is_fraud'] = 0
    
    # Rule 1: Extreme amount deviation
    rule1 = df['amount_zscore'] > 3
    df.loc[rule1, 'is_fraud'] = 1
    df.loc[rule1, 'fraud_reason'] = 'extreme_amount_deviation'
    
    # Rule 2: New payee with unusually high amount
    rule2 = (df['is_new_payee'] == 1) & (df['amount_to_max_ratio'] > 2)
    df.loc[rule2, 'is_fraud'] = 1
    df.loc[rule2, 'fraud_reason'] = 'new_payee_high_amount'
    
    # Rule 3: Night transaction to new payee
    rule3 = (df['is_night_transaction'] == 1) & (df['is_new_payee'] == 1)
    df.loc[rule3, 'is_fraud'] = 1
    df.loc[rule3, 'fraud_reason'] = 'night_new_payee'
    
    # Rule 4: High velocity
    rule4 = df['txn_count_24h'] > 5
    df.loc[rule4, 'is_fraud'] = 1
    df.loc[rule4, 'fraud_reason'] = 'high_velocity'
    
    # Rule 5: Dormant account with above-max amount
    rule5 = (df['is_dormant'] == 1) & (df['is_above_max'] == 1)
    df.loc[rule5, 'is_fraud'] = 1
    df.loc[rule5, 'fraud_reason'] = 'dormant_high_amount'
    
    # Rule 6: Risky account draining balance
    rule6 = (df['bounce_rate'] > 0.2) & (df['amount_to_balance_ratio'] > 0.8)
    df.loc[rule6, 'is_fraud'] = 1
    df.loc[rule6, 'fraud_reason'] = 'risky_account_drain'
    
    # Fill NaN fraud reasons
    df['fraud_reason'] = df['fraud_reason'].fillna('legitimate')
    
    print(f"\nSynthetic Labels Created:")
    print(f"  Legitimate: {len(df[df['is_fraud'] == 0])}")
    print(f"  Fraudulent: {len(df[df['is_fraud'] == 1])}")
    print(f"\nFraud by reason:")
    print(df[df['is_fraud'] == 1]['fraud_reason'].value_counts())
    
    return df


# ============================================================
# AUGMENT DATA (if too few fraud samples)
# ============================================================

def augment_fraud_samples(df: pd.DataFrame, target_fraud_ratio: float = 0.3) -> pd.DataFrame:
    """
    Augment dataset with synthetic fraud samples if needed
    
    Creates artificial fraud cases by modifying legitimate transactions
    """
    current_fraud_ratio = df['is_fraud'].mean()
    
    if current_fraud_ratio >= target_fraud_ratio:
        print(f"Current fraud ratio {current_fraud_ratio:.2%} >= target {target_fraud_ratio:.2%}, no augmentation needed")
        return df
    
    # Calculate how many fraud samples we need
    n_legitimate = len(df[df['is_fraud'] == 0])
    n_fraud_needed = int(n_legitimate * target_fraud_ratio / (1 - target_fraud_ratio))
    n_current_fraud = len(df[df['is_fraud'] == 1])
    n_to_create = n_fraud_needed - n_current_fraud
    
    print(f"\nAugmenting: Creating {n_to_create} synthetic fraud samples...")
    
    # Sample from legitimate transactions and modify them to look fraudulent
    legitimate = df[df['is_fraud'] == 0].copy()
    
    if len(legitimate) == 0:
        return df
    
    synthetic_fraud = []
    
    for i in range(n_to_create):
        # Pick a random legitimate transaction
        base = legitimate.sample(1).iloc[0].copy()
        
        # Randomly apply fraud patterns
        fraud_type = np.random.choice(['high_amount', 'night_new_payee', 'velocity', 'dormant'])
        
        if fraud_type == 'high_amount':
            base['amount_zscore'] = np.random.uniform(3.5, 6)
            base['amount_to_max_ratio'] = np.random.uniform(2.5, 5)
            base['is_above_max'] = 1
            base['fraud_reason'] = 'synthetic_high_amount'
        
        elif fraud_type == 'night_new_payee':
            base['is_night_transaction'] = 1
            base['is_new_payee'] = 1
            base['hour_of_day'] = np.random.choice([2, 3, 4, 22, 23])
            base['is_unusual_hour'] = 1
            base['fraud_reason'] = 'synthetic_night_new_payee'
        
        elif fraud_type == 'velocity':
            base['txn_count_24h'] = np.random.randint(6, 15)
            base['txn_count_7d'] = np.random.randint(20, 40)
            base['fraud_reason'] = 'synthetic_velocity'
        
        elif fraud_type == 'dormant':
            base['is_dormant'] = 1
            base['days_since_last_txn'] = np.random.randint(100, 365)
            base['is_above_max'] = 1
            base['amount_zscore'] = np.random.uniform(2, 4)
            base['fraud_reason'] = 'synthetic_dormant'
        
        base['is_fraud'] = 1
        synthetic_fraud.append(base)
    
    # Combine original and synthetic
    synthetic_df = pd.DataFrame(synthetic_fraud)
    augmented = pd.concat([df, synthetic_df], ignore_index=True)
    
    print(f"After augmentation: {len(augmented)} total, {augmented['is_fraud'].sum()} fraud ({augmented['is_fraud'].mean():.2%})")
    
    return augmented


# ============================================================
# MODEL TRAINING
# ============================================================

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


def train_xgboost_model(df: pd.DataFrame) -> Tuple[xgb.XGBClassifier, StandardScaler, Dict]:
    """
    Train XGBoost classifier for fraud detection
    
    Returns:
        model: Trained XGBoost classifier
        scaler: Fitted StandardScaler
        metrics: Dictionary of evaluation metrics
    """
    print("\n" + "="*60)
    print("TRAINING XGBOOST MODEL")
    print("="*60)
    
    # Prepare features and target
    X = df[FEATURE_COLUMNS].copy()
    y = df['is_fraud'].copy()
    
    # Handle any NaN values
    X = X.fillna(0)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\nTraining set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    print(f"Fraud ratio in training: {y_train.mean():.2%}")
    
    # Calculate class weight for imbalanced data
    scale_pos_weight = len(y_train[y_train == 0]) / max(len(y_train[y_train == 1]), 1)
    
    # Train XGBoost
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    print("\n" + "-"*40)
    print("MODEL EVALUATION")
    print("-"*40)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Fraud']))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0][0]}, FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}, TP={cm[1][1]}")
    
    # ROC-AUC
    if len(set(y_test)) > 1:
        auc_score = roc_auc_score(y_test, y_prob)
        print(f"\nROC-AUC Score: {auc_score:.4f}")
    else:
        auc_score = 0.5
    
    # Feature importance
    print("\nTop 10 Feature Importances:")
    importance_df = pd.DataFrame({
        'feature': FEATURE_COLUMNS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    for _, row in importance_df.head(10).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")
    
    metrics = {
        'accuracy': (y_pred == y_test).mean(),
        'auc_roc': auc_score,
        'n_train': len(X_train),
        'n_test': len(X_test)
    }
    
    return model, scaler, metrics


# ============================================================
# SAVE MODEL
# ============================================================

def save_model(model: xgb.XGBClassifier, scaler: StandardScaler, output_dir: str):
    """Save trained model and scaler"""
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, 'fraud_model.pkl')
    scaler_path = os.path.join(output_dir, 'fraud_scaler.pkl')
    features_path = os.path.join(output_dir, 'fraud_features.txt')
    
    # Save model
    joblib.dump(model, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Save scaler
    joblib.dump(scaler, scaler_path)
    print(f"Scaler saved to: {scaler_path}")
    
    # Save feature list
    with open(features_path, 'w') as f:
        f.write('\n'.join(FEATURE_COLUMNS))
    print(f"Features saved to: {features_path}")


# ============================================================
# MAIN
# ============================================================

def main():
    print("="*60)
    print("FRAUD DETECTION MODEL TRAINING")
    print("="*60)
    print(f"Started at: {datetime.now()}")
    
    # Connect to database
    try:
        conn = get_db_connection()
        print("\n✓ Connected to database")
    except Exception as e:
        print(f"\n✗ Database connection failed: {e}")
        print("\nUsing synthetic data for training...")
        conn = None
    
    if conn:
        # Extract features from database
        extractor = FeatureExtractor(conn)
        df = extractor.extract_all_features()
        conn.close()
        
        if len(df) == 0:
            print("No transactions found in database. Creating synthetic dataset...")
            df = create_synthetic_dataset()
    else:
        # Create synthetic dataset for demo
        df = create_synthetic_dataset()
    
    print(f"\nDataset shape: {df.shape}")
    print(f"Features: {FEATURE_COLUMNS}")
    
    # Create synthetic labels
    df = create_synthetic_labels(df)
    
    # Augment if needed (ensure at least 30% fraud for balanced training)
    df = augment_fraud_samples(df, target_fraud_ratio=0.3)
    
    # Train model
    model, scaler, metrics = train_xgboost_model(df)
    
    # Save model
    output_dir = os.path.dirname(os.path.abspath(__file__))
    save_model(model, scaler, output_dir)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"Finished at: {datetime.now()}")
    print(f"Model accuracy: {metrics['accuracy']:.2%}")
    print(f"ROC-AUC: {metrics['auc_roc']:.4f}")


def create_synthetic_dataset(n_samples: int = 200) -> pd.DataFrame:
    """
    Create synthetic dataset when database is not available
    
    Generates realistic transaction patterns for demo/testing
    """
    print(f"\nGenerating {n_samples} synthetic transactions...")
    
    np.random.seed(42)
    
    data = []
    
    for i in range(n_samples):
        # Random account characteristics
        account_id = np.random.randint(1, 6)
        avg_amount = np.random.uniform(10000, 100000)
        std_amount = avg_amount * 0.3
        
        # Transaction amount
        amount = np.random.normal(avg_amount, std_amount)
        amount = max(1000, amount)  # Minimum 1000
        
        # Calculate features
        features = {
            'transaction_id': i + 1,
            'account_id': account_id,
            'amount': amount,
            'receiver_name': f'Receiver_{np.random.randint(1, 20)}',
            
            # Amount features
            'amount_zscore': np.random.normal(0, 1),
            'amount_to_max_ratio': np.random.uniform(0.3, 1.5),
            'amount_to_balance_ratio': np.random.uniform(0.05, 0.5),
            'is_above_max': np.random.choice([0, 1], p=[0.9, 0.1]),
            
            # Payee features
            'is_new_payee': np.random.choice([0, 1], p=[0.7, 0.3]),
            'payee_frequency': np.random.randint(0, 10),
            'unique_payee_ratio': np.random.uniform(0.3, 0.8),
            
            # Time features
            'hour_of_day': np.random.randint(0, 24),
            'day_of_week': np.random.randint(0, 7),
            'is_unusual_hour': np.random.choice([0, 1], p=[0.8, 0.2]),
            'is_weekend': np.random.choice([0, 1], p=[0.7, 0.3]),
            'is_night_transaction': np.random.choice([0, 1], p=[0.9, 0.1]),
            
            # Velocity features
            'txn_count_24h': np.random.poisson(1),
            'txn_count_7d': np.random.poisson(5),
            'days_since_last_txn': np.random.randint(0, 30),
            'is_dormant': np.random.choice([0, 1], p=[0.95, 0.05]),
            
            # Account health
            'account_age_days': np.random.randint(30, 1000),
            'bounce_rate': np.random.uniform(0, 0.1),
            'avg_balance': np.random.uniform(50000, 500000),
            
            # Signature score
            'signature_score': np.random.uniform(70, 100)
        }
        
        data.append(features)
    
    return pd.DataFrame(data)


if __name__ == '__main__':
    main()
