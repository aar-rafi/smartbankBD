"""
Anomaly Detection Model Training Script (Unsupervised)
======================================================
Uses Isolation Forest for unsupervised anomaly detection.
NO LABELED DATA REQUIRED - learns "normal" patterns from transaction history.

How it works:
1. Connects to PostgreSQL database
2. Extracts 20 features from transactions, customer_profiles, accounts
3. Trains Isolation Forest to learn normal transaction patterns
4. Anomalies are transactions that are easy to isolate (rare/different)
5. Saves model to anomaly_model.pkl

Anomaly Score Interpretation:
- Score close to 1.0 → Highly anomalous (short isolation path)
- Score close to 0.5 → Borderline (average path length)
- Score close to 0.0 → Normal (long path, deep in normal cluster)

Usage:
    python train_fraud_model.py

Requirements:
    pip install pandas numpy psycopg2-binary scikit-learn joblib
"""

import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# ML Libraries - Unsupervised
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.neighbors import LocalOutlierFactor
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
# ANOMALY ANALYSIS (No labels needed!)
# ============================================================

def analyze_data_distribution(df: pd.DataFrame) -> Dict:
    """
    Analyze the distribution of features to understand normal patterns
    This helps interpret anomaly scores later
    """
    print("\n" + "="*60)
    print("DATA DISTRIBUTION ANALYSIS")
    print("="*60)
    
    stats = {}
    
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            stats[col] = {
                'mean': df[col].mean(),
                'std': df[col].std(),
                'min': df[col].min(),
                'max': df[col].max(),
                'median': df[col].median(),
                'q25': df[col].quantile(0.25),
                'q75': df[col].quantile(0.75)
            }
    
    # Print summary for key features
    print("\nKey Feature Statistics:")
    print("-" * 50)
    key_features = ['amount_zscore', 'amount_to_balance_ratio', 'txn_count_24h', 'signature_score']
    for feat in key_features:
        if feat in stats:
            s = stats[feat]
            print(f"  {feat}:")
            print(f"    Mean: {s['mean']:.2f}, Std: {s['std']:.2f}")
            print(f"    Range: [{s['min']:.2f}, {s['max']:.2f}]")
    
    return stats


def compute_feature_contributions(model: IsolationForest, X: np.ndarray, 
                                   feature_names: List[str]) -> pd.DataFrame:
    """
    Compute which features contribute most to anomaly detection
    Uses permutation-based importance for Isolation Forest
    """
    print("\nComputing feature contributions...")
    
    # Get baseline anomaly scores
    baseline_scores = -model.score_samples(X)  # Negative because lower = more anomalous
    
    importances = []
    
    for i, feat_name in enumerate(feature_names):
        # Permute this feature
        X_permuted = X.copy()
        np.random.shuffle(X_permuted[:, i])
        
        # Get new scores
        permuted_scores = -model.score_samples(X_permuted)
        
        # Importance = how much scores change when feature is randomized
        importance = np.mean(np.abs(permuted_scores - baseline_scores))
        importances.append({'feature': feat_name, 'importance': importance})
    
    importance_df = pd.DataFrame(importances).sort_values('importance', ascending=False)
    return importance_df


# ============================================================
# MODEL TRAINING - ISOLATION FOREST (Unsupervised)
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

# Anomaly score thresholds
THRESHOLDS = {
    'high_risk': 0.7,      # Score >= 0.7 → High risk, likely fraud
    'medium_risk': 0.5,    # Score 0.5-0.7 → Medium risk, needs review
    'low_risk': 0.3        # Score 0.3-0.5 → Low risk, probably normal
    # Score < 0.3 → Normal transaction
}


def train_isolation_forest(df: pd.DataFrame, contamination: float = 0.05) -> Tuple[IsolationForest, RobustScaler, Dict]:
    """
    Train Isolation Forest for unsupervised anomaly detection
    
    How Isolation Forest works:
    1. Randomly selects a feature and a split value
    2. Recursively partitions data until each point is isolated
    3. Anomalies require fewer splits (shorter path length)
    4. Normal points require more splits (longer path length)
    
    Args:
        df: DataFrame with transaction features
        contamination: Expected proportion of anomalies (default 5%)
                      This helps calibrate the decision threshold
    
    Returns:
        model: Trained Isolation Forest
        scaler: Fitted RobustScaler (better for outliers than StandardScaler)
        metrics: Dictionary of model statistics
    """
    print("\n" + "="*60)
    print("TRAINING ISOLATION FOREST (Unsupervised Anomaly Detection)")
    print("="*60)
    
    # Prepare features
    X = df[FEATURE_COLUMNS].copy()
    
    # Handle any NaN values
    X = X.fillna(0)
    
    print(f"\nDataset size: {len(X)} transactions")
    print(f"Features: {len(FEATURE_COLUMNS)}")
    print(f"Expected contamination rate: {contamination:.1%}")
    
    # Use RobustScaler - better for data with outliers
    # It uses median and IQR instead of mean and std
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    # Key parameters:
    # - n_estimators: Number of isolation trees (more = more stable)
    # - max_samples: Samples per tree (smaller = more diverse trees)
    # - contamination: Expected anomaly rate (affects threshold only)
    # - max_features: Features per tree (more randomness = better isolation)
    # - random_state: For reproducibility
    
    print("\nTraining Isolation Forest...")
    print("  - Building 200 isolation trees")
    print("  - Each tree uses 256 samples (or all if less)")
    print("  - Using all 20 features per tree")
    
    model = IsolationForest(
        n_estimators=200,           # Number of trees in the forest
        max_samples='auto',          # Use 256 or n_samples, whichever is smaller
        contamination=contamination, # Expected proportion of outliers
        max_features=1.0,            # Use all features
        bootstrap=False,             # Sample without replacement
        n_jobs=-1,                   # Use all CPU cores
        random_state=42,
        verbose=0
    )
    
    model.fit(X_scaled)
    
    # Get anomaly scores for training data
    # score_samples returns negative values (lower = more anomalous)
    # We convert to 0-1 scale where higher = more anomalous
    raw_scores = model.score_samples(X_scaled)
    
    # Convert to 0-1 anomaly score
    # Raw scores typically range from -0.5 (anomaly) to 0.0 (normal)
    # We transform: anomaly_score = 1 - (raw_score - min) / (max - min)
    min_score = raw_scores.min()
    max_score = raw_scores.max()
    anomaly_scores = (max_score - raw_scores) / (max_score - min_score)
    
    # Add scores to dataframe for analysis
    df_with_scores = df.copy()
    df_with_scores['anomaly_score'] = anomaly_scores
    df_with_scores['is_anomaly'] = model.predict(X_scaled) == -1  # -1 = anomaly
    
    # Analyze results
    n_anomalies = df_with_scores['is_anomaly'].sum()
    actual_contamination = n_anomalies / len(df_with_scores)
    
    print("\n" + "-"*50)
    print("TRAINING RESULTS")
    print("-"*50)
    print(f"\nAnomalies detected: {n_anomalies} ({actual_contamination:.1%})")
    print(f"Normal transactions: {len(df_with_scores) - n_anomalies}")
    
    # Score distribution
    print(f"\nAnomaly Score Distribution:")
    print(f"  Min:    {anomaly_scores.min():.4f}")
    print(f"  25%:    {np.percentile(anomaly_scores, 25):.4f}")
    print(f"  Median: {np.percentile(anomaly_scores, 50):.4f}")
    print(f"  75%:    {np.percentile(anomaly_scores, 75):.4f}")
    print(f"  Max:    {anomaly_scores.max():.4f}")
    
    # Risk categories
    high_risk = (anomaly_scores >= THRESHOLDS['high_risk']).sum()
    medium_risk = ((anomaly_scores >= THRESHOLDS['medium_risk']) & 
                   (anomaly_scores < THRESHOLDS['high_risk'])).sum()
    low_risk = ((anomaly_scores >= THRESHOLDS['low_risk']) & 
                (anomaly_scores < THRESHOLDS['medium_risk'])).sum()
    normal = (anomaly_scores < THRESHOLDS['low_risk']).sum()
    
    print(f"\nRisk Categories:")
    print(f"  🔴 High Risk (≥{THRESHOLDS['high_risk']}):    {high_risk} ({high_risk/len(df)*100:.1f}%)")
    print(f"  🟠 Medium Risk ({THRESHOLDS['medium_risk']}-{THRESHOLDS['high_risk']}): {medium_risk} ({medium_risk/len(df)*100:.1f}%)")
    print(f"  🟡 Low Risk ({THRESHOLDS['low_risk']}-{THRESHOLDS['medium_risk']}):    {low_risk} ({low_risk/len(df)*100:.1f}%)")
    print(f"  🟢 Normal (<{THRESHOLDS['low_risk']}):       {normal} ({normal/len(df)*100:.1f}%)")
    
    # Feature importance via permutation
    importance_df = compute_feature_contributions(model, X_scaled, FEATURE_COLUMNS)
    
    print(f"\nTop 10 Most Important Features for Anomaly Detection:")
    for i, (_, row) in enumerate(importance_df.head(10).iterrows()):
        bar = "█" * int(row['importance'] * 50)
        print(f"  {i+1}. {row['feature']}: {row['importance']:.4f} {bar}")
    
    # Analyze what makes anomalies different
    if n_anomalies > 0:
        print(f"\nAnomaly Characteristics (comparing anomalies vs normal):")
        anomaly_data = df_with_scores[df_with_scores['is_anomaly']]
        normal_data = df_with_scores[~df_with_scores['is_anomaly']]
        
        for feat in ['amount_zscore', 'amount_to_balance_ratio', 'is_new_payee', 
                     'txn_count_24h', 'is_night_transaction', 'signature_score']:
            if feat in df.columns:
                anom_mean = anomaly_data[feat].mean()
                norm_mean = normal_data[feat].mean()
                diff = anom_mean - norm_mean
                direction = "↑" if diff > 0 else "↓"
                print(f"  {feat}: Anomaly={anom_mean:.2f}, Normal={norm_mean:.2f} ({direction}{abs(diff):.2f})")
    
    metrics = {
        'n_samples': len(df),
        'n_anomalies': n_anomalies,
        'contamination_rate': actual_contamination,
        'score_min': float(anomaly_scores.min()),
        'score_max': float(anomaly_scores.max()),
        'score_mean': float(anomaly_scores.mean()),
        'score_std': float(anomaly_scores.std()),
        'high_risk_count': high_risk,
        'medium_risk_count': medium_risk,
        'thresholds': THRESHOLDS,
        'feature_importance': importance_df.to_dict('records')
    }
    
    return model, scaler, metrics


def predict_anomaly_score(model: IsolationForest, scaler: RobustScaler, 
                          features: Dict) -> Tuple[float, str, List[str]]:
    """
    Predict anomaly score for a single transaction
    
    Args:
        model: Trained Isolation Forest model
        scaler: Fitted scaler
        features: Dictionary of feature values
    
    Returns:
        score: Anomaly score (0-1, higher = more anomalous)
        risk_level: 'high_risk', 'medium_risk', 'low_risk', or 'normal'
        reasons: List of features contributing to anomaly
    """
    # Prepare feature vector
    X = np.array([[features.get(col, 0) for col in FEATURE_COLUMNS]])
    X_scaled = scaler.transform(X)
    
    # Get raw score and convert to 0-1 scale
    raw_score = model.score_samples(X_scaled)[0]
    
    # Convert raw score to anomaly score
    # Isolation Forest scores: more negative = more anomalous
    # Typical range: -0.5 (anomaly) to 0.0 (normal)
    # We map to 0-1 where 1 = most anomalous
    anomaly_score = max(0, min(1, 0.5 - raw_score))
    
    # Determine risk level
    if anomaly_score >= THRESHOLDS['high_risk']:
        risk_level = 'high_risk'
    elif anomaly_score >= THRESHOLDS['medium_risk']:
        risk_level = 'medium_risk'
    elif anomaly_score >= THRESHOLDS['low_risk']:
        risk_level = 'low_risk'
    else:
        risk_level = 'normal'
    
    # Find contributing factors (features with extreme values)
    reasons = []
    if features.get('amount_zscore', 0) > 2:
        reasons.append(f"Unusual amount (z-score: {features['amount_zscore']:.2f})")
    if features.get('is_new_payee', 0) == 1 and features.get('amount_to_max_ratio', 0) > 1.5:
        reasons.append("Large payment to new payee")
    if features.get('is_night_transaction', 0) == 1:
        reasons.append("Night-time transaction")
    if features.get('txn_count_24h', 0) > 3:
        reasons.append(f"High velocity ({features['txn_count_24h']} txns in 24h)")
    if features.get('is_dormant', 0) == 1:
        reasons.append("Previously dormant account")
    if features.get('signature_score', 100) < 70:
        reasons.append(f"Low signature confidence ({features['signature_score']:.0f}%)")
    if features.get('amount_to_balance_ratio', 0) > 0.8:
        reasons.append(f"High amount relative to balance ({features['amount_to_balance_ratio']*100:.0f}%)")
    
    return anomaly_score, risk_level, reasons


# ============================================================
# SAVE MODEL
# ============================================================

def save_model(model: IsolationForest, scaler: RobustScaler, metrics: Dict, output_dir: str):
    """Save trained model, scaler, and metadata"""
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, 'anomaly_model.pkl')
    scaler_path = os.path.join(output_dir, 'anomaly_scaler.pkl')
    features_path = os.path.join(output_dir, 'anomaly_features.txt')
    metadata_path = os.path.join(output_dir, 'anomaly_metadata.pkl')
    
    # Save model
    joblib.dump(model, model_path)
    print(f"\n✓ Model saved to: {model_path}")
    
    # Save scaler
    joblib.dump(scaler, scaler_path)
    print(f"✓ Scaler saved to: {scaler_path}")
    
    # Save feature list
    with open(features_path, 'w') as f:
        f.write('\n'.join(FEATURE_COLUMNS))
    print(f"✓ Features saved to: {features_path}")
    
    # Save metadata (thresholds, metrics, etc.)
    metadata = {
        'model_type': 'IsolationForest',
        'feature_columns': FEATURE_COLUMNS,
        'thresholds': THRESHOLDS,
        'metrics': metrics,
        'trained_at': datetime.now().isoformat()
    }
    joblib.dump(metadata, metadata_path)
    print(f"✓ Metadata saved to: {metadata_path}")


def load_model(model_dir: str) -> Tuple[IsolationForest, RobustScaler, Dict]:
    """Load trained model, scaler, and metadata"""
    model_path = os.path.join(model_dir, 'anomaly_model.pkl')
    scaler_path = os.path.join(model_dir, 'anomaly_scaler.pkl')
    metadata_path = os.path.join(model_dir, 'anomaly_metadata.pkl')
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    metadata = joblib.load(metadata_path)
    
    return model, scaler, metadata


# ============================================================
# MAIN
# ============================================================

def main():
    print("="*60)
    print("UNSUPERVISED ANOMALY DETECTION MODEL TRAINING")
    print("Using Isolation Forest - No labeled data required!")
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
    print(f"Features: {len(FEATURE_COLUMNS)}")
    
    # Analyze data distribution
    stats = analyze_data_distribution(df)
    
    # Train Isolation Forest (unsupervised - no labels!)
    # contamination=0.05 means we expect ~5% anomalies
    # Adjust based on your domain knowledge
    model, scaler, metrics = train_isolation_forest(df, contamination=0.05)
    
    # Save model
    output_dir = os.path.dirname(os.path.abspath(__file__))
    save_model(model, scaler, metrics, output_dir)
    
    # Demo: Test prediction on a sample transaction
    print("\n" + "="*60)
    print("DEMO: Testing anomaly detection")
    print("="*60)
    
    # Test a normal transaction
    normal_txn = {
        'amount_zscore': 0.5,
        'amount_to_max_ratio': 0.6,
        'amount_to_balance_ratio': 0.2,
        'is_above_max': 0,
        'is_new_payee': 0,
        'payee_frequency': 5,
        'unique_payee_ratio': 0.4,
        'hour_of_day': 14,
        'day_of_week': 2,
        'is_unusual_hour': 0,
        'is_weekend': 0,
        'is_night_transaction': 0,
        'txn_count_24h': 1,
        'txn_count_7d': 3,
        'days_since_last_txn': 2,
        'is_dormant': 0,
        'account_age_days': 500,
        'bounce_rate': 0.01,
        'avg_balance': 100000,
        'signature_score': 92
    }
    
    score, risk, reasons = predict_anomaly_score(model, scaler, normal_txn)
    print(f"\nNormal Transaction Test:")
    print(f"  Anomaly Score: {score:.3f}")
    print(f"  Risk Level: {risk}")
    print(f"  Reasons: {reasons if reasons else 'None - appears normal'}")
    
    # Test a suspicious transaction
    suspicious_txn = {
        'amount_zscore': 4.5,
        'amount_to_max_ratio': 2.5,
        'amount_to_balance_ratio': 0.9,
        'is_above_max': 1,
        'is_new_payee': 1,
        'payee_frequency': 0,
        'unique_payee_ratio': 1.0,
        'hour_of_day': 3,
        'day_of_week': 0,
        'is_unusual_hour': 1,
        'is_weekend': 0,
        'is_night_transaction': 1,
        'txn_count_24h': 5,
        'txn_count_7d': 8,
        'days_since_last_txn': 95,
        'is_dormant': 1,
        'account_age_days': 100,
        'bounce_rate': 0.15,
        'avg_balance': 50000,
        'signature_score': 55
    }
    
    score, risk, reasons = predict_anomaly_score(model, scaler, suspicious_txn)
    print(f"\nSuspicious Transaction Test:")
    print(f"  Anomaly Score: {score:.3f}")
    print(f"  Risk Level: {risk}")
    print(f"  Reasons: {', '.join(reasons)}")
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"Finished at: {datetime.now()}")
    print(f"\nModel files saved in: {output_dir}")
    print(f"  - anomaly_model.pkl (Isolation Forest)")
    print(f"  - anomaly_scaler.pkl (RobustScaler)")
    print(f"  - anomaly_features.txt (Feature list)")
    print(f"  - anomaly_metadata.pkl (Thresholds & metrics)")
    
    print("\n📊 Key Metrics:")
    print(f"  - Samples trained on: {metrics['n_samples']}")
    print(f"  - Anomalies detected: {metrics['n_anomalies']} ({metrics['contamination_rate']:.1%})")
    print(f"  - High-risk transactions: {metrics['high_risk_count']}")
    
    print("\n🎯 Next Steps:")
    print("  1. Use load_model() to load the trained model")
    print("  2. Extract features for new transactions")
    print("  3. Call predict_anomaly_score() to get risk assessment")
    print("  4. Integrate with validationService.ts for real-time scoring")


def create_synthetic_dataset(n_samples: int = 500) -> pd.DataFrame:
    """
    Create synthetic dataset when database is not available
    
    Generates realistic transaction patterns for training Isolation Forest.
    Most transactions are "normal" with a few naturally occurring outliers.
    No fraud labels needed - the model learns what's normal and flags deviations.
    """
    print(f"\nGenerating {n_samples} synthetic transactions...")
    print("(Creating realistic patterns with natural variation)")
    
    np.random.seed(42)
    
    data = []
    
    # Create 5 different customer profiles (different "normal" behaviors)
    customer_profiles = [
        {'avg_amt': 25000, 'std_amt': 5000, 'usual_hour': 10, 'txn_freq': 2},   # Low-value, morning
        {'avg_amt': 75000, 'std_amt': 15000, 'usual_hour': 14, 'txn_freq': 3},  # Medium-value, afternoon
        {'avg_amt': 150000, 'std_amt': 30000, 'usual_hour': 11, 'txn_freq': 1}, # High-value, less frequent
        {'avg_amt': 50000, 'std_amt': 20000, 'usual_hour': 15, 'txn_freq': 5},  # Variable, high frequency
        {'avg_amt': 100000, 'std_amt': 10000, 'usual_hour': 9, 'txn_freq': 2},  # Consistent, morning
    ]
    
    for i in range(n_samples):
        # Assign to a customer profile
        account_id = np.random.randint(1, 6)
        profile = customer_profiles[account_id - 1]
        
        # Generate mostly normal transactions with occasional natural outliers
        is_outlier = np.random.random() < 0.03  # ~3% natural outliers
        
        if is_outlier:
            # Natural outlier (not fraud, just unusual)
            amount = np.random.uniform(profile['avg_amt'] * 2, profile['avg_amt'] * 4)
            hour = np.random.choice([2, 3, 4, 22, 23])  # Unusual hours
            is_new_payee = 1
        else:
            # Normal transaction
            amount = np.random.normal(profile['avg_amt'], profile['std_amt'])
            amount = max(1000, amount)  # Minimum 1000
            hour = int(np.random.normal(profile['usual_hour'], 2)) % 24
            is_new_payee = np.random.choice([0, 1], p=[0.8, 0.2])
        
        # Calculate features based on profile
        amount_zscore = (amount - profile['avg_amt']) / profile['std_amt']
        
        features = {
            'transaction_id': i + 1,
            'account_id': account_id,
            'amount': amount,
            'receiver_name': f'Receiver_{np.random.randint(1, 20)}',
            
            # Amount features (4)
            'amount_zscore': amount_zscore,
            'amount_to_max_ratio': amount / (profile['avg_amt'] + 2 * profile['std_amt']),
            'amount_to_balance_ratio': amount / np.random.uniform(200000, 500000),
            'is_above_max': 1 if amount_zscore > 2 else 0,
            
            # Payee features (3)
            'is_new_payee': is_new_payee,
            'payee_frequency': np.random.randint(0, 10) if not is_new_payee else 0,
            'unique_payee_ratio': np.random.uniform(0.3, 0.7),
            
            # Time features (5)
            'hour_of_day': hour,
            'day_of_week': np.random.randint(0, 7),
            'is_unusual_hour': 1 if hour < 6 or hour > 20 else 0,
            'is_weekend': 1 if np.random.random() < 0.3 else 0,
            'is_night_transaction': 1 if hour < 6 or hour > 21 else 0,
            
            # Velocity features (4)
            'txn_count_24h': np.random.poisson(profile['txn_freq']),
            'txn_count_7d': np.random.poisson(profile['txn_freq'] * 5),
            'days_since_last_txn': np.random.randint(0, 15),
            'is_dormant': 1 if np.random.random() < 0.02 else 0,
            
            # Account health (3)
            'account_age_days': np.random.randint(100, 1500),
            'bounce_rate': np.random.uniform(0, 0.05),
            'avg_balance': np.random.uniform(100000, 500000),
            
            # Signature score (1) - most are good
            'signature_score': np.random.normal(88, 8)
        }
        
        # Clip signature score to valid range
        features['signature_score'] = np.clip(features['signature_score'], 40, 100)
        
        data.append(features)
    
    df = pd.DataFrame(data)
    
    print(f"Generated {len(df)} transactions across {df['account_id'].nunique()} accounts")
    print(f"Natural outliers (amount_zscore > 2): {(df['amount_zscore'] > 2).sum()}")
    
    return df


if __name__ == '__main__':
    main()
