/**
 * Customer Behaviour Profile Service
 * ===================================
 * Automatically manages customer behaviour profiles based on transaction patterns.
 * 
 * Features:
 * - Auto-updates profile statistics after each cheque transaction
 * - Full profile recalculation from transaction history
 * - Behaviour anomaly detection for fraud prevention
 * - Risk score calculation based on deviation from normal patterns
 */

import pool from './db.js';

// ============================================================
// TYPES
// ============================================================

export interface CustomerProfile {
  profileId: number;
  accountId: number;
  nationalId: string | null;
  phone: string | null;
  kycStatus: string;
  kycVerifiedAt: Date | null;
  
  // Transaction patterns
  avgTransactionAmt: number;
  maxTransactionAmt: number;
  minTransactionAmt: number;
  stddevTransactionAmt: number;
  totalTransactionCount: number;
  monthlyAvgCount: number;
  
  // Cheque patterns
  totalChequesIssued: number;
  bouncedChequesCount: number;
  bounceRate: number;
  cancelledChequesCount: number;
  
  // Time patterns
  usualDaysOfWeek: number[];
  usualHours: number[];
  avgDaysBetweenTxn: number;
  lastActivityAt: Date | null;
  daysSinceLastActivity: number;
  
  // Payee patterns
  uniquePayeeCount: number;
  regularPayees: string[];
  newPayeeRate: number;
  
  // Risk
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  
  updatedAt: Date;
}

export interface BehaviourAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  deviation: number;
  threshold: number;
  value: number | string | boolean;
}

export interface BehaviourAnalysisResult {
  profileFound: boolean;
  profile: CustomerProfile | null;
  anomalies: BehaviourAnomaly[];
  behaviourScore: number;  // 0-100 (100 = normal, 0 = highly anomalous)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface TransactionData {
  accountNumber: string;
  amount: number;
  payeeName: string;
  chequeNumber?: string;
  transactionDate?: Date;
  transactionHour?: number;
  dayOfWeek?: number;
}

// ============================================================
// PROFILE QUERY FUNCTIONS
// ============================================================

/**
 * Get customer profile by account number
 */
export const getCustomerProfile = async (accountNumber: string): Promise<CustomerProfile | null> => {
  try {
    const result = await pool.query(
      `SELECT 
        cp.profile_id, cp.account_id, cp.national_id, cp.phone,
        cp.kyc_status, cp.kyc_verified_at,
        cp.avg_transaction_amt, cp.max_transaction_amt, cp.min_transaction_amt,
        cp.stddev_transaction_amt, cp.total_transaction_count, cp.monthly_avg_count,
        cp.total_cheques_issued, cp.bounced_cheques_count, cp.bounce_rate, cp.cancelled_cheques_count,
        cp.usual_days_of_week, cp.usual_hours, cp.avg_days_between_txn,
        cp.last_activity_at, cp.days_since_last_activity,
        cp.unique_payee_count, cp.regular_payees, cp.new_payee_rate,
        cp.risk_category, cp.risk_score, cp.updated_at
       FROM customer_profiles cp
       JOIN accounts a ON cp.account_id = a.account_id
       WHERE a.account_number = $1`,
      [accountNumber]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      profileId: row.profile_id,
      accountId: row.account_id,
      nationalId: row.national_id,
      phone: row.phone,
      kycStatus: row.kyc_status,
      kycVerifiedAt: row.kyc_verified_at,
      avgTransactionAmt: parseFloat(row.avg_transaction_amt) || 0,
      maxTransactionAmt: parseFloat(row.max_transaction_amt) || 0,
      minTransactionAmt: parseFloat(row.min_transaction_amt) || 0,
      stddevTransactionAmt: parseFloat(row.stddev_transaction_amt) || 0,
      totalTransactionCount: parseInt(row.total_transaction_count) || 0,
      monthlyAvgCount: parseFloat(row.monthly_avg_count) || 0,
      totalChequesIssued: parseInt(row.total_cheques_issued) || 0,
      bouncedChequesCount: parseInt(row.bounced_cheques_count) || 0,
      bounceRate: parseFloat(row.bounce_rate) || 0,
      cancelledChequesCount: parseInt(row.cancelled_cheques_count) || 0,
      usualDaysOfWeek: row.usual_days_of_week || [],
      usualHours: row.usual_hours || [],
      avgDaysBetweenTxn: parseFloat(row.avg_days_between_txn) || 0,
      lastActivityAt: row.last_activity_at,
      daysSinceLastActivity: parseInt(row.days_since_last_activity) || 0,
      uniquePayeeCount: parseInt(row.unique_payee_count) || 0,
      regularPayees: row.regular_payees || [],
      newPayeeRate: parseFloat(row.new_payee_rate) || 0,
      riskCategory: row.risk_category || 'medium',
      riskScore: parseFloat(row.risk_score) || 50,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('[CustomerBehaviour] Error fetching profile:', error);
    throw error;
  }
};

/**
 * Get customer profile by account ID
 */
export const getCustomerProfileById = async (accountId: number): Promise<CustomerProfile | null> => {
  try {
    const result = await pool.query(
      `SELECT 
        profile_id, account_id, national_id, phone,
        kyc_status, kyc_verified_at,
        avg_transaction_amt, max_transaction_amt, min_transaction_amt,
        stddev_transaction_amt, total_transaction_count, monthly_avg_count,
        total_cheques_issued, bounced_cheques_count, bounce_rate, cancelled_cheques_count,
        usual_days_of_week, usual_hours, avg_days_between_txn,
        last_activity_at, days_since_last_activity,
        unique_payee_count, regular_payees, new_payee_rate,
        risk_category, risk_score, updated_at
       FROM customer_profiles
       WHERE account_id = $1`,
      [accountId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      profileId: row.profile_id,
      accountId: row.account_id,
      nationalId: row.national_id,
      phone: row.phone,
      kycStatus: row.kyc_status,
      kycVerifiedAt: row.kyc_verified_at,
      avgTransactionAmt: parseFloat(row.avg_transaction_amt) || 0,
      maxTransactionAmt: parseFloat(row.max_transaction_amt) || 0,
      minTransactionAmt: parseFloat(row.min_transaction_amt) || 0,
      stddevTransactionAmt: parseFloat(row.stddev_transaction_amt) || 0,
      totalTransactionCount: parseInt(row.total_transaction_count) || 0,
      monthlyAvgCount: parseFloat(row.monthly_avg_count) || 0,
      totalChequesIssued: parseInt(row.total_cheques_issued) || 0,
      bouncedChequesCount: parseInt(row.bounced_cheques_count) || 0,
      bounceRate: parseFloat(row.bounce_rate) || 0,
      cancelledChequesCount: parseInt(row.cancelled_cheques_count) || 0,
      usualDaysOfWeek: row.usual_days_of_week || [],
      usualHours: row.usual_hours || [],
      avgDaysBetweenTxn: parseFloat(row.avg_days_between_txn) || 0,
      lastActivityAt: row.last_activity_at,
      daysSinceLastActivity: parseInt(row.days_since_last_activity) || 0,
      uniquePayeeCount: parseInt(row.unique_payee_count) || 0,
      regularPayees: row.regular_payees || [],
      newPayeeRate: parseFloat(row.new_payee_rate) || 0,
      riskCategory: row.risk_category || 'medium',
      riskScore: parseFloat(row.risk_score) || 50,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('[CustomerBehaviour] Error fetching profile by ID:', error);
    throw error;
  }
};

// ============================================================
// PROFILE UPDATE FUNCTIONS
// ============================================================

/**
 * Update profile statistics after a cheque transaction is processed
 * This is called automatically after each successful cheque validation
 */
export const updateProfileAfterTransaction = async (
  accountNumber: string,
  transactionData: TransactionData
): Promise<{ success: boolean; profileUpdated: boolean; error?: string }> => {
  console.log('\n========================================');
  console.log('[CustomerBehaviour] 📊 UPDATING PROFILE AFTER TRANSACTION');
  console.log('========================================');
  console.log('Account:', accountNumber);
  console.log('Amount:', transactionData.amount);
  console.log('Payee:', transactionData.payeeName);

  try {
    // Get account_id
    const accountResult = await pool.query(
      'SELECT account_id FROM accounts WHERE account_number = $1',
      [accountNumber]
    );

    if (accountResult.rows.length === 0) {
      console.warn('[CustomerBehaviour] Account not found:', accountNumber);
      return { success: false, profileUpdated: false, error: 'Account not found' };
    }

    const accountId = accountResult.rows[0].account_id;

    // Check if profile exists
    const profileExists = await pool.query(
      'SELECT profile_id FROM customer_profiles WHERE account_id = $1',
      [accountId]
    );

    if (profileExists.rows.length === 0) {
      // Create new profile if doesn't exist
      console.log('[CustomerBehaviour] Creating new profile for account:', accountId);
      await createNewProfile(accountId, transactionData);
    } else {
      // Update existing profile with incremental statistics
      console.log('[CustomerBehaviour] Updating existing profile for account:', accountId);
      await updateExistingProfile(accountId, transactionData);
    }

    // Recalculate risk score
    await calculateAndUpdateRiskScore(accountId);

    console.log('[CustomerBehaviour] ✅ Profile updated successfully');
    return { success: true, profileUpdated: true };

  } catch (error) {
    console.error('[CustomerBehaviour] Error updating profile:', error);
    return { success: false, profileUpdated: false, error: String(error) };
  }
};

/**
 * Create a new customer profile
 */
const createNewProfile = async (accountId: number, txn: TransactionData): Promise<void> => {
  const now = new Date();
  const hour = txn.transactionHour ?? now.getHours();
  const dayOfWeek = txn.dayOfWeek ?? now.getDay();

  await pool.query(
    `INSERT INTO customer_profiles (
      account_id,
      avg_transaction_amt, max_transaction_amt, min_transaction_amt, stddev_transaction_amt,
      total_transaction_count, monthly_avg_count,
      total_cheques_issued, bounced_cheques_count, bounce_rate, cancelled_cheques_count,
      usual_days_of_week, usual_hours, avg_days_between_txn,
      last_activity_at, days_since_last_activity,
      unique_payee_count, regular_payees, new_payee_rate,
      risk_category, risk_score, updated_at
    ) VALUES (
      $1,
      $2, $2, $2, 0,
      1, 1,
      1, 0, 0, 0,
      ARRAY[$3]::INT[], ARRAY[$4]::INT[], 0,
      NOW(), 0,
      1, ARRAY[$5]::TEXT[], 100,
      'low', 20, NOW()
    )`,
    [accountId, txn.amount, dayOfWeek, hour, txn.payeeName || 'Unknown']
  );
};

/**
 * Update existing profile with new transaction data using incremental statistics
 */
const updateExistingProfile = async (accountId: number, txn: TransactionData): Promise<void> => {
  const now = new Date();
  const hour = txn.transactionHour ?? now.getHours();
  const dayOfWeek = txn.dayOfWeek ?? now.getDay();
  const amount = txn.amount;
  const payeeName = txn.payeeName || 'Unknown';

  // Get current profile stats for incremental update
  const current = await pool.query(
    `SELECT 
      avg_transaction_amt, max_transaction_amt, min_transaction_amt,
      stddev_transaction_amt, total_transaction_count,
      total_cheques_issued, usual_days_of_week, usual_hours,
      last_activity_at, unique_payee_count, regular_payees
     FROM customer_profiles WHERE account_id = $1`,
    [accountId]
  );

  if (current.rows.length === 0) return;

  const profile = current.rows[0];
  const oldCount = parseInt(profile.total_transaction_count) || 0;
  const newCount = oldCount + 1;
  const oldAvg = parseFloat(profile.avg_transaction_amt) || 0;
  const oldStdDev = parseFloat(profile.stddev_transaction_amt) || 0;

  // Calculate new average using incremental formula
  const newAvg = oldAvg + (amount - oldAvg) / newCount;

  // Calculate new standard deviation using Welford's algorithm
  // variance = old_variance + ((x - old_avg) * (x - new_avg) - old_variance) / n
  const oldVariance = oldStdDev * oldStdDev;
  const newVariance = oldCount === 0 
    ? 0 
    : oldVariance + ((amount - oldAvg) * (amount - newAvg) - oldVariance) / newCount;
  const newStdDev = Math.sqrt(Math.max(0, newVariance));

  // Update max/min
  const newMax = Math.max(parseFloat(profile.max_transaction_amt) || 0, amount);
  const newMin = oldCount === 0 ? amount : Math.min(parseFloat(profile.min_transaction_amt) || amount, amount);

  // Update usual days and hours (keep unique values, limit to reasonable size)
  const usualDays = profile.usual_days_of_week || [];
  if (!usualDays.includes(dayOfWeek)) {
    usualDays.push(dayOfWeek);
  }

  const usualHours = profile.usual_hours || [];
  if (!usualHours.includes(hour)) {
    usualHours.push(hour);
  }

  // Update payee tracking
  const regularPayees: string[] = profile.regular_payees || [];
  const isNewPayee = !regularPayees.includes(payeeName);
  let uniquePayeeCount = parseInt(profile.unique_payee_count) || 0;

  if (isNewPayee && payeeName !== 'Unknown') {
    uniquePayeeCount++;
    // Keep top 10 regular payees
    if (regularPayees.length < 10) {
      regularPayees.push(payeeName);
    }
  }

  // Calculate new payee rate (% of transactions to new payees)
  // We track this as a rolling approximation
  const oldNewPayeeRate = parseFloat(profile.new_payee_rate) || 0;
  const newPayeeRate = isNewPayee 
    ? oldNewPayeeRate + (100 - oldNewPayeeRate) / newCount
    : oldNewPayeeRate - oldNewPayeeRate / newCount;

  // Calculate days since last activity
  const lastActivity = profile.last_activity_at ? new Date(profile.last_activity_at) : now;
  const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate monthly average (approximate based on account activity)
  const accountAgeResult = await pool.query(
    'SELECT created_at FROM accounts WHERE account_id = $1',
    [accountId]
  );
  let monthlyAvg = newCount;
  if (accountAgeResult.rows.length > 0 && accountAgeResult.rows[0].created_at) {
    const accountAge = new Date(accountAgeResult.rows[0].created_at);
    const monthsOld = Math.max(1, (now.getTime() - accountAge.getTime()) / (1000 * 60 * 60 * 24 * 30));
    monthlyAvg = newCount / monthsOld;
  }

  // Update the profile
  await pool.query(
    `UPDATE customer_profiles SET
      avg_transaction_amt = $1,
      max_transaction_amt = $2,
      min_transaction_amt = $3,
      stddev_transaction_amt = $4,
      total_transaction_count = $5,
      monthly_avg_count = $6,
      total_cheques_issued = total_cheques_issued + 1,
      usual_days_of_week = $7,
      usual_hours = $8,
      last_activity_at = NOW(),
      days_since_last_activity = 0,
      unique_payee_count = $9,
      regular_payees = $10,
      new_payee_rate = $11,
      updated_at = NOW()
     WHERE account_id = $12`,
    [
      newAvg.toFixed(2),
      newMax.toFixed(2),
      newMin.toFixed(2),
      newStdDev.toFixed(2),
      newCount,
      monthlyAvg.toFixed(2),
      usualDays,
      usualHours,
      uniquePayeeCount,
      regularPayees,
      newPayeeRate.toFixed(2),
      accountId
    ]
  );
};

/**
 * Full recalculation of customer profile from transaction history
 * Use this for batch processing or fixing inconsistent data
 */
export const recalculateProfile = async (accountId: number): Promise<{ success: boolean; error?: string }> => {
  console.log('\n========================================');
  console.log('[CustomerBehaviour] 🔄 FULL PROFILE RECALCULATION');
  console.log('========================================');
  console.log('Account ID:', accountId);

  try {
    // Get all transactions for this account
    const txnResult = await pool.query(
      `SELECT 
        amount, receiver_name, txn_date, txn_time,
        EXTRACT(DOW FROM txn_date) as day_of_week,
        EXTRACT(HOUR FROM txn_time) as hour_of_day,
        created_at
       FROM transactions 
       WHERE account_id = $1 
       ORDER BY created_at ASC`,
      [accountId]
    );

    // Get all cheques issued by this account
    const chequeResult = await pool.query(
      `SELECT 
        c.amount, c.payee_name, c.status, c.issue_date, c.created_at
       FROM cheques c
       WHERE c.drawer_account_id = $1
       ORDER BY c.created_at ASC`,
      [accountId]
    );

    const transactions = txnResult.rows;
    const cheques = chequeResult.rows;

    // Combine both sources for analysis
    const allTxns = [
      ...transactions.map(t => ({
        amount: parseFloat(t.amount) || 0,
        payee: t.receiver_name || 'Unknown',
        dayOfWeek: parseInt(t.day_of_week) || 0,
        hour: parseInt(t.hour_of_day) || 12,
        date: new Date(t.created_at || t.txn_date)
      })),
      ...cheques.map(c => ({
        amount: parseFloat(c.amount) || 0,
        payee: c.payee_name || 'Unknown',
        dayOfWeek: c.issue_date ? new Date(c.issue_date).getDay() : 0,
        hour: 12, // Default for cheques
        date: new Date(c.created_at || c.issue_date)
      }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    if (allTxns.length === 0) {
      console.log('[CustomerBehaviour] No transactions found for recalculation');
      return { success: true };
    }

    // Calculate statistics
    const amounts = allTxns.map(t => t.amount);
    const totalCount = amounts.length;
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / totalCount;
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    
    // Standard deviation
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / totalCount;
    const stdDev = Math.sqrt(variance);

    // Time patterns
    const daysOfWeek = [...new Set(allTxns.map(t => t.dayOfWeek))];
    const hours = [...new Set(allTxns.map(t => t.hour))];

    // Payee patterns
    const payees = allTxns.map(t => t.payee).filter(p => p !== 'Unknown');
    const uniquePayees = [...new Set(payees)];
    const payeeCounts: Record<string, number> = payees.reduce((acc, p) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Top 10 regular payees (by frequency)
    const regularPayees = (Object.entries(payeeCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    // New payee rate (transactions to first-time payees)
    let newPayeeCount = 0;
    const seenPayees = new Set<string>();
    allTxns.forEach(t => {
      if (t.payee !== 'Unknown' && !seenPayees.has(t.payee)) {
        newPayeeCount++;
        seenPayees.add(t.payee);
      }
    });
    const newPayeeRate = totalCount > 0 ? (newPayeeCount / totalCount) * 100 : 0;

    // Average days between transactions
    let avgDaysBetween = 0;
    if (allTxns.length > 1) {
      const dayGaps: number[] = [];
      for (let i = 1; i < allTxns.length; i++) {
        const gap = (allTxns[i].date.getTime() - allTxns[i-1].date.getTime()) / (1000 * 60 * 60 * 24);
        dayGaps.push(gap);
      }
      avgDaysBetween = dayGaps.reduce((a, b) => a + b, 0) / dayGaps.length;
    }

    // Cheque-specific stats
    const bouncedCount = cheques.filter(c => c.status === 'bounced' || c.status === 'rejected').length;
    const cancelledCount = cheques.filter(c => c.status === 'cancelled').length;
    const bounceRate = cheques.length > 0 ? (bouncedCount / cheques.length) * 100 : 0;

    // Monthly average
    const accountAgeResult = await pool.query(
      'SELECT created_at FROM accounts WHERE account_id = $1',
      [accountId]
    );
    let monthlyAvg = totalCount;
    if (accountAgeResult.rows.length > 0 && accountAgeResult.rows[0].created_at) {
      const accountAge = new Date(accountAgeResult.rows[0].created_at);
      const monthsOld = Math.max(1, (Date.now() - accountAge.getTime()) / (1000 * 60 * 60 * 24 * 30));
      monthlyAvg = totalCount / monthsOld;
    }

    // Days since last activity
    const lastTxn = allTxns[allTxns.length - 1];
    const daysSinceLastActivity = Math.floor((Date.now() - lastTxn.date.getTime()) / (1000 * 60 * 60 * 24));

    // Update or insert profile
    await pool.query(
      `INSERT INTO customer_profiles (
        account_id,
        avg_transaction_amt, max_transaction_amt, min_transaction_amt, stddev_transaction_amt,
        total_transaction_count, monthly_avg_count,
        total_cheques_issued, bounced_cheques_count, bounce_rate, cancelled_cheques_count,
        usual_days_of_week, usual_hours, avg_days_between_txn,
        last_activity_at, days_since_last_activity,
        unique_payee_count, regular_payees, new_payee_rate,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
      )
      ON CONFLICT (account_id) DO UPDATE SET
        avg_transaction_amt = EXCLUDED.avg_transaction_amt,
        max_transaction_amt = EXCLUDED.max_transaction_amt,
        min_transaction_amt = EXCLUDED.min_transaction_amt,
        stddev_transaction_amt = EXCLUDED.stddev_transaction_amt,
        total_transaction_count = EXCLUDED.total_transaction_count,
        monthly_avg_count = EXCLUDED.monthly_avg_count,
        total_cheques_issued = EXCLUDED.total_cheques_issued,
        bounced_cheques_count = EXCLUDED.bounced_cheques_count,
        bounce_rate = EXCLUDED.bounce_rate,
        cancelled_cheques_count = EXCLUDED.cancelled_cheques_count,
        usual_days_of_week = EXCLUDED.usual_days_of_week,
        usual_hours = EXCLUDED.usual_hours,
        avg_days_between_txn = EXCLUDED.avg_days_between_txn,
        last_activity_at = EXCLUDED.last_activity_at,
        days_since_last_activity = EXCLUDED.days_since_last_activity,
        unique_payee_count = EXCLUDED.unique_payee_count,
        regular_payees = EXCLUDED.regular_payees,
        new_payee_rate = EXCLUDED.new_payee_rate,
        updated_at = NOW()`,
      [
        accountId,
        avgAmount.toFixed(2),
        maxAmount.toFixed(2),
        minAmount.toFixed(2),
        stdDev.toFixed(2),
        totalCount,
        monthlyAvg.toFixed(2),
        cheques.length,
        bouncedCount,
        bounceRate.toFixed(2),
        cancelledCount,
        daysOfWeek,
        hours,
        avgDaysBetween.toFixed(2),
        lastTxn.date,
        daysSinceLastActivity,
        uniquePayees.length,
        regularPayees,
        newPayeeRate.toFixed(2)
      ]
    );

    // Recalculate risk score
    await calculateAndUpdateRiskScore(accountId);

    console.log('[CustomerBehaviour] ✅ Profile recalculation complete');
    console.log(`  - Total transactions: ${totalCount}`);
    console.log(`  - Average amount: ${avgAmount.toFixed(2)}`);
    console.log(`  - Bounce rate: ${bounceRate.toFixed(2)}%`);

    return { success: true };

  } catch (error) {
    console.error('[CustomerBehaviour] Error recalculating profile:', error);
    return { success: false, error: String(error) };
  }
};

// ============================================================
// BEHAVIOUR ANOMALY DETECTION
// ============================================================

/**
 * Detect behaviour anomalies by comparing current transaction against profile
 * Returns list of detected anomalies with severity levels
 */
export const detectBehaviourAnomalies = async (
  accountNumber: string,
  currentTransaction: TransactionData
): Promise<BehaviourAnalysisResult> => {
  console.log('\n========================================');
  console.log('[CustomerBehaviour] 🔍 DETECTING BEHAVIOUR ANOMALIES');
  console.log('========================================');

  try {
    const profile = await getCustomerProfile(accountNumber);

    if (!profile) {
      console.log('[CustomerBehaviour] No profile found - cannot detect anomalies');
      return {
        profileFound: false,
        profile: null,
        anomalies: [],
        behaviourScore: 50, // Neutral score for new customers
        riskLevel: 'medium',
        recommendation: 'New customer - no transaction history available for comparison'
      };
    }

    const anomalies: BehaviourAnomaly[] = [];
    const amount = currentTransaction.amount;
    const payeeName = currentTransaction.payeeName;
    const now = new Date();
    const hour = currentTransaction.transactionHour ?? now.getHours();
    const dayOfWeek = currentTransaction.dayOfWeek ?? now.getDay();

    // 1. AMOUNT ANOMALY - Check if amount deviates significantly from average
    if (profile.stddevTransactionAmt > 0 && profile.totalTransactionCount >= 3) {
      const zScore = Math.abs((amount - profile.avgTransactionAmt) / profile.stddevTransactionAmt);
      
      if (zScore > 3) {
        anomalies.push({
          type: 'extreme_amount',
          severity: 'high',
          description: `Amount ৳${amount.toLocaleString()} is ${zScore.toFixed(1)} standard deviations from average ৳${profile.avgTransactionAmt.toLocaleString()}`,
          deviation: zScore,
          threshold: 3,
          value: amount
        });
      } else if (zScore > 2) {
        anomalies.push({
          type: 'unusual_amount',
          severity: 'medium',
          description: `Amount ৳${amount.toLocaleString()} is ${zScore.toFixed(1)} standard deviations from average`,
          deviation: zScore,
          threshold: 2,
          value: amount
        });
      }
    }

    // 2. EXCEEDS HISTORICAL MAX
    if (profile.maxTransactionAmt > 0 && amount > profile.maxTransactionAmt) {
      const ratio = amount / profile.maxTransactionAmt;
      anomalies.push({
        type: 'exceeds_max',
        severity: ratio > 2 ? 'high' : 'medium',
        description: `Amount ৳${amount.toLocaleString()} exceeds historical maximum of ৳${profile.maxTransactionAmt.toLocaleString()} (${(ratio * 100).toFixed(0)}%)`,
        deviation: ratio,
        threshold: 1,
        value: amount
      });
    }

    // 3. NEW PAYEE CHECK
    const isNewPayee = payeeName && !profile.regularPayees.includes(payeeName);
    if (isNewPayee && profile.totalTransactionCount >= 5) {
      // Only flag if the new payee rate is already low (customer usually transacts with same payees)
      if (profile.newPayeeRate < 20) {
        anomalies.push({
          type: 'new_payee',
          severity: 'low',
          description: `First transaction to payee "${payeeName}" - customer typically transacts with known payees`,
          deviation: 100 - profile.newPayeeRate,
          threshold: 80,
          value: payeeName
        });
      }
    }

    // 4. UNUSUAL DAY OF WEEK
    if (profile.usualDaysOfWeek.length > 0 && !profile.usualDaysOfWeek.includes(dayOfWeek)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      anomalies.push({
        type: 'unusual_day',
        severity: 'low',
        description: `Transaction on ${dayNames[dayOfWeek]} - customer usually transacts on ${profile.usualDaysOfWeek.map(d => dayNames[d]).join(', ')}`,
        deviation: 1,
        threshold: 0,
        value: dayNames[dayOfWeek]
      });
    }

    // 5. UNUSUAL HOUR
    if (profile.usualHours.length > 0) {
      const isUnusualHour = !profile.usualHours.some(h => Math.abs(h - hour) <= 2);
      if (isUnusualHour) {
        // Night transactions (11 PM - 5 AM) are more suspicious
        const isNight = hour >= 23 || hour <= 5;
        anomalies.push({
          type: 'unusual_time',
          severity: isNight ? 'medium' : 'low',
          description: `Transaction at ${hour}:00 - ${isNight ? 'night transaction' : 'outside usual hours'} (usual: ${profile.usualHours.join(', ')}:00)`,
          deviation: Math.min(...profile.usualHours.map(h => Math.abs(h - hour))),
          threshold: 2,
          value: hour
        });
      }
    }

    // 6. DORMANT ACCOUNT ACTIVITY
    if (profile.daysSinceLastActivity > 90) {
      anomalies.push({
        type: 'dormant_reactivation',
        severity: profile.daysSinceLastActivity > 180 ? 'high' : 'medium',
        description: `Account dormant for ${profile.daysSinceLastActivity} days - sudden activity detected`,
        deviation: profile.daysSinceLastActivity,
        threshold: 90,
        value: profile.daysSinceLastActivity
      });
    }

    // 7. HIGH BOUNCE RATE WARNING
    if (profile.bounceRate > 10 && profile.totalChequesIssued >= 5) {
      anomalies.push({
        type: 'high_bounce_history',
        severity: profile.bounceRate > 20 ? 'high' : 'medium',
        description: `Customer has ${profile.bounceRate.toFixed(1)}% cheque bounce rate (${profile.bouncedChequesCount}/${profile.totalChequesIssued} cheques)`,
        deviation: profile.bounceRate,
        threshold: 10,
        value: profile.bounceRate
      });
    }

    // Calculate behaviour score (100 = normal, 0 = highly anomalous)
    const behaviourScore = calculateBehaviourScore(anomalies);
    const riskLevel = determineRiskLevel(behaviourScore, anomalies);
    const recommendation = generateRecommendation(anomalies, behaviourScore, riskLevel);

    console.log('[CustomerBehaviour] Analysis complete:');
    console.log(`  - Anomalies found: ${anomalies.length}`);
    console.log(`  - Behaviour score: ${behaviourScore}`);
    console.log(`  - Risk level: ${riskLevel}`);

    return {
      profileFound: true,
      profile,
      anomalies,
      behaviourScore,
      riskLevel,
      recommendation
    };

  } catch (error) {
    console.error('[CustomerBehaviour] Error detecting anomalies:', error);
    return {
      profileFound: false,
      profile: null,
      anomalies: [],
      behaviourScore: 50,
      riskLevel: 'medium',
      recommendation: 'Error analyzing behaviour profile'
    };
  }
};

/**
 * Calculate behaviour score based on detected anomalies
 * Returns 0-100 where 100 = completely normal, 0 = highly suspicious
 */
export const calculateBehaviourScore = (anomalies: BehaviourAnomaly[]): number => {
  if (anomalies.length === 0) return 100;

  // Severity weights
  const weights: Record<string, number> = {
    high: 25,
    medium: 15,
    low: 5
  };

  // Calculate penalty
  let penalty = 0;
  for (const anomaly of anomalies) {
    penalty += weights[anomaly.severity] || 10;
  }

  // Cap the score at 0 minimum
  return Math.max(0, 100 - penalty);
};

/**
 * Determine overall risk level based on behaviour score and anomalies
 */
const determineRiskLevel = (
  behaviourScore: number, 
  anomalies: BehaviourAnomaly[]
): 'low' | 'medium' | 'high' | 'critical' => {
  // Check for critical anomalies first
  const hasHighSeverity = anomalies.some(a => a.severity === 'high');
  const highCount = anomalies.filter(a => a.severity === 'high').length;

  if (highCount >= 2 || behaviourScore < 30) return 'critical';
  if (hasHighSeverity || behaviourScore < 50) return 'high';
  if (behaviourScore < 70) return 'medium';
  return 'low';
};

/**
 * Generate human-readable recommendation based on analysis
 */
const generateRecommendation = (
  anomalies: BehaviourAnomaly[], 
  behaviourScore: number,
  riskLevel: string
): string => {
  if (anomalies.length === 0) {
    return 'Transaction matches customer\'s normal behaviour pattern. Proceed with standard verification.';
  }

  const highSeverity = anomalies.filter(a => a.severity === 'high');
  const mediumSeverity = anomalies.filter(a => a.severity === 'medium');

  if (highSeverity.length >= 2) {
    return `CRITICAL: Multiple high-risk anomalies detected. Manual review required. Issues: ${highSeverity.map(a => a.type).join(', ')}`;
  }

  if (highSeverity.length === 1) {
    return `HIGH RISK: ${highSeverity[0].description}. Recommend enhanced verification.`;
  }

  if (mediumSeverity.length >= 2) {
    return `ELEVATED RISK: Multiple unusual patterns detected. Consider additional verification.`;
  }

  if (mediumSeverity.length === 1) {
    return `MODERATE RISK: ${mediumSeverity[0].description}. Standard verification with attention.`;
  }

  return `LOW RISK: Minor deviations from normal pattern. Proceed with standard verification.`;
};

// ============================================================
// RISK SCORE CALCULATION
// ============================================================

/**
 * Calculate and update the overall risk score for a customer profile
 * This considers historical behaviour, bounce rate, and transaction patterns
 */
export const calculateAndUpdateRiskScore = async (accountId: number): Promise<number> => {
  try {
    const profile = await getCustomerProfileById(accountId);
    if (!profile) return 50; // Default medium risk for unknown profiles

    let riskScore = 20; // Base score (low risk)

    // Factor 1: Bounce rate (0-25 points)
    if (profile.bounceRate > 0) {
      riskScore += Math.min(25, profile.bounceRate * 1.5);
    }

    // Factor 2: Transaction variability (0-15 points)
    // High standard deviation relative to average indicates unpredictable behaviour
    if (profile.avgTransactionAmt > 0 && profile.stddevTransactionAmt > 0) {
      const cv = profile.stddevTransactionAmt / profile.avgTransactionAmt; // Coefficient of variation
      riskScore += Math.min(15, cv * 10);
    }

    // Factor 3: New payee rate (0-10 points)
    // Very high new payee rate might indicate account being used unusually
    if (profile.newPayeeRate > 50) {
      riskScore += Math.min(10, (profile.newPayeeRate - 50) / 5);
    }

    // Factor 4: Account dormancy (0-15 points)
    if (profile.daysSinceLastActivity > 30) {
      riskScore += Math.min(15, profile.daysSinceLastActivity / 20);
    }

    // Factor 5: Low transaction count (newer accounts have less established patterns)
    if (profile.totalTransactionCount < 10) {
      riskScore += Math.min(10, 10 - profile.totalTransactionCount);
    }

    // Factor 6: KYC status
    if (profile.kycStatus !== 'verified') {
      riskScore += 10;
    }

    // Cap at 100
    riskScore = Math.min(100, riskScore);

    // Determine risk category
    let riskCategory: string;
    if (riskScore < 30) riskCategory = 'low';
    else if (riskScore < 50) riskCategory = 'medium';
    else if (riskScore < 70) riskCategory = 'high';
    else riskCategory = 'critical';

    // Update database
    await pool.query(
      `UPDATE customer_profiles SET 
        risk_score = $1, 
        risk_category = $2,
        updated_at = NOW()
       WHERE account_id = $3`,
      [riskScore.toFixed(2), riskCategory, accountId]
    );

    return riskScore;

  } catch (error) {
    console.error('[CustomerBehaviour] Error calculating risk score:', error);
    return 50; // Default to medium risk on error
  }
};

// ============================================================
// BATCH OPERATIONS
// ============================================================

/**
 * Recalculate all customer profiles (for batch processing/maintenance)
 */
export const recalculateAllProfiles = async (): Promise<{ processed: number; errors: number }> => {
  console.log('\n========================================');
  console.log('[CustomerBehaviour] 🔄 BATCH PROFILE RECALCULATION');
  console.log('========================================');

  try {
    const accounts = await pool.query('SELECT account_id FROM accounts');
    let processed = 0;
    let errors = 0;

    for (const row of accounts.rows) {
      try {
        await recalculateProfile(row.account_id);
        processed++;
      } catch (err) {
        console.error(`Error processing account ${row.account_id}:`, err);
        errors++;
      }
    }

    console.log(`[CustomerBehaviour] Batch complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };

  } catch (error) {
    console.error('[CustomerBehaviour] Error in batch recalculation:', error);
    throw error;
  }
};

/**
 * Update days_since_last_activity for all profiles (run daily)
 */
export const updateDaysSinceLastActivity = async (): Promise<void> => {
  try {
    await pool.query(
      `UPDATE customer_profiles SET 
        days_since_last_activity = EXTRACT(DAY FROM NOW() - last_activity_at)::INT
       WHERE last_activity_at IS NOT NULL`
    );
    console.log('[CustomerBehaviour] Updated days_since_last_activity for all profiles');
  } catch (error) {
    console.error('[CustomerBehaviour] Error updating days since last activity:', error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

export default {
  getCustomerProfile,
  getCustomerProfileById,
  updateProfileAfterTransaction,
  recalculateProfile,
  detectBehaviourAnomalies,
  calculateBehaviourScore,
  calculateAndUpdateRiskScore,
  recalculateAllProfiles,
  updateDaysSinceLastActivity
};
