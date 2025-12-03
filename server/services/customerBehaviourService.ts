/**
 * Customer Behaviour Analysis Service
 * ====================================
 * Tracks and analyzes customer transaction patterns for fraud detection.
 * Updates customer profiles based on transaction history.
 */

import pool from './db.js';

// ============================================================
// TYPES
// ============================================================

export interface CustomerProfile {
  accountId: number;
  accountNumber: string;
  holderName: string;
  bankName: string;
  accountType: string;
  accountStatus: string;
  balance: number;
  accountAgeDays: number;
  createdAt: string;
  
  // Transaction Statistics
  totalTransactions: number;
  totalAmount: number;
  avgTransactionAmount: number;
  maxTransactionAmount: number;
  minTransactionAmount: number;
  stdDevAmount: number;
  
  // Cheque Statistics
  totalCheques: number;
  approvedCheques: number;
  rejectedCheques: number;
  bouncedCheques: number;
  bounceRate: number;
  
  // Payee Patterns
  uniquePayees: number;
  topPayees: Array<{ name: string; count: number; totalAmount: number }>;
  
  // Time Patterns
  preferredDays: Array<{ day: string; count: number }>;
  preferredHours: Array<{ hour: number; count: number }>;
  weekendTransactions: number;
  nightTransactions: number;
  
  // Velocity Metrics
  transactionsLast24h: number;
  transactionsLast7d: number;
  transactionsLast30d: number;
  amountLast24h: number;
  amountLast7d: number;
  amountLast30d: number;
  daysSinceLastTransaction: number;
  
  // Risk Indicators
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
}

export interface BehaviourAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  deviation: number;
  threshold: number;
}

export interface CustomerSummary {
  accountId: number;
  accountNumber: string;
  holderName: string;
  bankName: string;
  bankCode: string;
  accountType: string;
  accountStatus: string;
  balance: number;
  accountAgeDays: number;
  totalTransactions: number;
  avgTransactionAmount: number;
  bounceRate: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================
// CUSTOMER LIST RETRIEVAL
// ============================================================

/**
 * Get all customers with summary profiles for a bank
 */
export async function getAllCustomerSummaries(bankCode?: string): Promise<CustomerSummary[]> {
  try {
    // Build query with optional bank filter
    let query = `
      SELECT 
        a.account_id,
        a.account_number,
        a.holder_name,
        a.account_type,
        a.status as account_status,
        a.balance,
        EXTRACT(DAY FROM NOW() - a.created_at) as account_age_days,
        b.bank_name,
        b.bank_code,
        COALESCE(cs.total_transactions, 0) as total_transactions,
        COALESCE(cs.avg_amount, 0) as avg_transaction_amount,
        COALESCE(cs.bounce_rate, 0) as bounce_rate
      FROM accounts a
      JOIN banks b ON a.bank_id = b.bank_id
      LEFT JOIN (
        SELECT 
          drawer_account_id,
          COUNT(*) as total_transactions,
          AVG(amount) as avg_amount,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              (COUNT(*) FILTER (WHERE status = 'bounced')::float / COUNT(*)::float) * 100
            ELSE 0 
          END as bounce_rate
        FROM cheques
        GROUP BY drawer_account_id
      ) cs ON a.account_id = cs.drawer_account_id
      WHERE a.holder_name NOT LIKE 'Unknown Account%'
    `;

    const params: string[] = [];
    if (bankCode) {
      query += ` AND LOWER(b.bank_code) = LOWER($1)`;
      params.push(bankCode);
    }

    query += ` ORDER BY a.holder_name`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => {
      const { riskScore, riskLevel } = calculateRiskScoreFromRow(row);
      return {
        accountId: row.account_id,
        accountNumber: row.account_number,
        holderName: row.holder_name,
        bankName: row.bank_name,
        bankCode: row.bank_code,
        accountType: row.account_type,
        accountStatus: row.account_status,
        balance: parseFloat(row.balance) || 0,
        accountAgeDays: Math.floor(row.account_age_days) || 0,
        totalTransactions: parseInt(row.total_transactions) || 0,
        avgTransactionAmount: parseFloat(row.avg_transaction_amount) || 0,
        bounceRate: parseFloat(row.bounce_rate) || 0,
        riskScore,
        riskLevel
      };
    });
  } catch (error) {
    console.error('Error fetching customer summaries:', error);
    throw error;
  }
}

/**
 * Calculate risk score from a database row
 */
function calculateRiskScoreFromRow(row: any): { riskScore: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' } {
  let score = 0;

  const bounceRate = parseFloat(row.bounce_rate) || 0;
  const accountAgeDays = Math.floor(row.account_age_days) || 0;
  const totalTransactions = parseInt(row.total_transactions) || 0;

  // Bounce rate (0-30 points)
  if (bounceRate > 20) score += 30;
  else if (bounceRate > 10) score += 20;
  else if (bounceRate > 5) score += 10;

  // Account age (0-20 points)
  if (accountAgeDays < 30) score += 20;
  else if (accountAgeDays < 90) score += 10;

  // Transaction history (0-15 points)
  if (totalTransactions === 0) score += 15;
  else if (totalTransactions < 5) score += 10;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 50) riskLevel = 'critical';
  else if (score >= 35) riskLevel = 'high';
  else if (score >= 20) riskLevel = 'medium';
  else riskLevel = 'low';

  return { riskScore: Math.min(100, score), riskLevel };
}

// ============================================================
// PROFILE RETRIEVAL
// ============================================================

/**
 * Get comprehensive customer profile for an account
 */
export async function getCustomerProfile(accountNumber: string): Promise<CustomerProfile | null> {
  try {
    // Get basic account info
    const accountResult = await pool.query(
      `SELECT 
        a.account_id, a.account_number, a.holder_name, a.account_type, 
        a.status, a.balance, a.created_at,
        b.bank_name,
        EXTRACT(DAY FROM NOW() - a.created_at) as account_age_days
       FROM accounts a
       JOIN banks b ON a.bank_id = b.bank_id
       WHERE a.account_number = $1`,
      [accountNumber]
    );

    if (accountResult.rows.length === 0) return null;
    const account = accountResult.rows[0];

    // Get transaction statistics
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COALESCE(MAX(amount), 0) as max_amount,
        COALESCE(MIN(amount), 0) as min_amount,
        COALESCE(STDDEV(amount), 0) as std_dev
       FROM cheques 
       WHERE drawer_account_id = $1`,
      [account.account_id]
    );
    const stats = statsResult.rows[0];

    // Get cheque status breakdown
    const chequeStatusResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced
       FROM cheques 
       WHERE drawer_account_id = $1`,
      [account.account_id]
    );
    const chequeStatus = chequeStatusResult.rows[0];

    // Get unique payees and top payees
    const payeeResult = await pool.query(
      `SELECT 
        payee_name, 
        COUNT(*) as count,
        SUM(amount) as total_amount
       FROM cheques 
       WHERE drawer_account_id = $1 AND payee_name IS NOT NULL
       GROUP BY payee_name
       ORDER BY count DESC
       LIMIT 5`,
      [account.account_id]
    );

    const uniquePayeesResult = await pool.query(
      `SELECT COUNT(DISTINCT payee_name) as unique_payees
       FROM cheques WHERE drawer_account_id = $1`,
      [account.account_id]
    );

    // Get day of week patterns
    const dayPatternResult = await pool.query(
      `SELECT 
        TO_CHAR(created_at, 'Day') as day_name,
        EXTRACT(DOW FROM created_at) as day_num,
        COUNT(*) as count
       FROM cheques 
       WHERE drawer_account_id = $1
       GROUP BY day_name, day_num
       ORDER BY day_num`,
      [account.account_id]
    );

    // Get hour patterns
    const hourPatternResult = await pool.query(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
       FROM cheques 
       WHERE drawer_account_id = $1
       GROUP BY hour
       ORDER BY hour`,
      [account.account_id]
    );

    // Get weekend and night transaction counts
    const timeStatsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM created_at) IN (0, 6)) as weekend_txns,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) < 6 OR EXTRACT(HOUR FROM created_at) >= 22) as night_txns
       FROM cheques 
       WHERE drawer_account_id = $1`,
      [account.account_id]
    );
    const timeStats = timeStatsResult.rows[0];

    // Get velocity metrics
    const velocityResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as txn_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as txn_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as txn_30d,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) as amt_24h,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0) as amt_7d,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) as amt_30d
       FROM cheques 
       WHERE drawer_account_id = $1`,
      [account.account_id]
    );
    const velocity = velocityResult.rows[0];

    // Get days since last transaction
    const lastTxnResult = await pool.query(
      `SELECT EXTRACT(DAY FROM NOW() - MAX(created_at)) as days_since_last
       FROM cheques WHERE drawer_account_id = $1`,
      [account.account_id]
    );
    const daysSinceLast = lastTxnResult.rows[0]?.days_since_last || 0;

    // Calculate risk score and factors
    const { riskScore, riskLevel, riskFactors } = calculateRiskScore({
      bounceRate: chequeStatus.total > 0 ? (chequeStatus.bounced / chequeStatus.total) * 100 : 0,
      accountAgeDays: account.account_age_days,
      totalTransactions: parseInt(stats.total_transactions),
      daysSinceLastTransaction: daysSinceLast,
      avgAmount: parseFloat(stats.avg_amount),
      balance: parseFloat(account.balance)
    });

    return {
      accountId: account.account_id,
      accountNumber: account.account_number,
      holderName: account.holder_name,
      bankName: account.bank_name,
      accountType: account.account_type,
      accountStatus: account.status,
      balance: parseFloat(account.balance),
      accountAgeDays: Math.floor(account.account_age_days || 0),
      createdAt: account.created_at,
      
      totalTransactions: parseInt(stats.total_transactions),
      totalAmount: parseFloat(stats.total_amount),
      avgTransactionAmount: parseFloat(stats.avg_amount),
      maxTransactionAmount: parseFloat(stats.max_amount),
      minTransactionAmount: parseFloat(stats.min_amount),
      stdDevAmount: parseFloat(stats.std_dev),
      
      totalCheques: parseInt(chequeStatus.total),
      approvedCheques: parseInt(chequeStatus.approved),
      rejectedCheques: parseInt(chequeStatus.rejected),
      bouncedCheques: parseInt(chequeStatus.bounced),
      bounceRate: chequeStatus.total > 0 ? (chequeStatus.bounced / chequeStatus.total) * 100 : 0,
      
      uniquePayees: parseInt(uniquePayeesResult.rows[0]?.unique_payees || 0),
      topPayees: payeeResult.rows.map((r: any) => ({
        name: r.payee_name,
        count: parseInt(r.count),
        totalAmount: parseFloat(r.total_amount)
      })),
      
      preferredDays: dayPatternResult.rows.map((r: any) => ({
        day: r.day_name.trim(),
        count: parseInt(r.count)
      })),
      preferredHours: hourPatternResult.rows.map((r: any) => ({
        hour: parseInt(r.hour),
        count: parseInt(r.count)
      })),
      weekendTransactions: parseInt(timeStats.weekend_txns),
      nightTransactions: parseInt(timeStats.night_txns),
      
      transactionsLast24h: parseInt(velocity.txn_24h),
      transactionsLast7d: parseInt(velocity.txn_7d),
      transactionsLast30d: parseInt(velocity.txn_30d),
      amountLast24h: parseFloat(velocity.amt_24h),
      amountLast7d: parseFloat(velocity.amt_7d),
      amountLast30d: parseFloat(velocity.amt_30d),
      daysSinceLastTransaction: Math.floor(daysSinceLast || 0),
      
      riskScore,
      riskLevel,
      riskFactors
    };
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    throw error;
  }
}

// ============================================================
// RISK CALCULATION
// ============================================================

function calculateRiskScore(params: {
  bounceRate: number;
  accountAgeDays: number;
  totalTransactions: number;
  daysSinceLastTransaction: number;
  avgAmount: number;
  balance: number;
}): { riskScore: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'; riskFactors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Bounce rate (0-30 points)
  if (params.bounceRate > 20) {
    score += 30;
    factors.push(`High bounce rate: ${params.bounceRate.toFixed(1)}%`);
  } else if (params.bounceRate > 10) {
    score += 20;
    factors.push(`Elevated bounce rate: ${params.bounceRate.toFixed(1)}%`);
  } else if (params.bounceRate > 5) {
    score += 10;
    factors.push(`Moderate bounce rate: ${params.bounceRate.toFixed(1)}%`);
  }

  // Account age (0-20 points)
  if (params.accountAgeDays < 30) {
    score += 20;
    factors.push(`New account: ${params.accountAgeDays} days old`);
  } else if (params.accountAgeDays < 90) {
    score += 10;
    factors.push(`Young account: ${params.accountAgeDays} days old`);
  }

  // Transaction history (0-15 points)
  if (params.totalTransactions === 0) {
    score += 15;
    factors.push('No transaction history');
  } else if (params.totalTransactions < 5) {
    score += 10;
    factors.push(`Limited history: ${params.totalTransactions} transactions`);
  }

  // Dormancy (0-20 points)
  if (params.daysSinceLastTransaction > 180) {
    score += 20;
    factors.push(`Dormant account: ${params.daysSinceLastTransaction} days inactive`);
  } else if (params.daysSinceLastTransaction > 90) {
    score += 10;
    factors.push(`Inactive account: ${params.daysSinceLastTransaction} days since last transaction`);
  }

  // Balance to average ratio (0-15 points)
  if (params.avgAmount > 0 && params.balance > 0) {
    const ratio = params.avgAmount / params.balance;
    if (ratio > 2) {
      score += 15;
      factors.push(`High avg transaction relative to balance: ${(ratio * 100).toFixed(0)}%`);
    } else if (ratio > 1) {
      score += 8;
      factors.push(`Elevated transaction amounts relative to balance`);
    }
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 70) riskLevel = 'critical';
  else if (score >= 50) riskLevel = 'high';
  else if (score >= 30) riskLevel = 'medium';
  else riskLevel = 'low';

  return { riskScore: Math.min(100, score), riskLevel, riskFactors: factors };
}

// ============================================================
// BEHAVIOUR ANOMALY DETECTION
// ============================================================

/**
 * Detect anomalies in a transaction compared to customer profile
 */
export async function detectBehaviourAnomalies(
  accountNumber: string,
  transactionAmount: number,
  payeeName: string,
  transactionTime: Date = new Date()
): Promise<BehaviourAnomaly[]> {
  const profile = await getCustomerProfile(accountNumber);
  if (!profile) return [];

  const anomalies: BehaviourAnomaly[] = [];

  // Amount anomaly
  if (profile.stdDevAmount > 0 && profile.avgTransactionAmount > 0) {
    const zScore = (transactionAmount - profile.avgTransactionAmount) / profile.stdDevAmount;
    if (Math.abs(zScore) > 3) {
      anomalies.push({
        type: 'amount_anomaly',
        severity: 'high',
        description: `Amount is ${zScore.toFixed(1)} standard deviations from average`,
        deviation: zScore,
        threshold: 3
      });
    } else if (Math.abs(zScore) > 2) {
      anomalies.push({
        type: 'amount_anomaly',
        severity: 'medium',
        description: `Amount is ${zScore.toFixed(1)} standard deviations from average`,
        deviation: zScore,
        threshold: 2
      });
    }
  }

  // Max amount exceeded
  if (transactionAmount > profile.maxTransactionAmount && profile.maxTransactionAmount > 0) {
    const ratio = transactionAmount / profile.maxTransactionAmount;
    anomalies.push({
      type: 'exceeds_max',
      severity: ratio > 2 ? 'high' : 'medium',
      description: `Amount exceeds historical maximum by ${((ratio - 1) * 100).toFixed(0)}%`,
      deviation: ratio,
      threshold: 1
    });
  }

  // New payee check
  const isKnownPayee = profile.topPayees.some(p => 
    p.name.toLowerCase() === payeeName.toLowerCase()
  );
  if (!isKnownPayee && profile.uniquePayees > 0) {
    anomalies.push({
      type: 'new_payee',
      severity: transactionAmount > profile.avgTransactionAmount ? 'high' : 'low',
      description: `First transaction to payee: ${payeeName}`,
      deviation: 1,
      threshold: 0
    });
  }

  // Time anomaly
  const hour = transactionTime.getHours();
  const isNight = hour < 6 || hour >= 22;
  if (isNight && profile.nightTransactions === 0 && profile.totalTransactions > 5) {
    anomalies.push({
      type: 'unusual_time',
      severity: 'medium',
      description: `Night transaction (${hour}:00) - no previous night activity`,
      deviation: 1,
      threshold: 0
    });
  }

  // Velocity anomaly
  if (profile.transactionsLast24h >= 3) {
    anomalies.push({
      type: 'high_velocity',
      severity: profile.transactionsLast24h >= 5 ? 'high' : 'medium',
      description: `${profile.transactionsLast24h} transactions in last 24 hours`,
      deviation: profile.transactionsLast24h,
      threshold: 3
    });
  }

  // Dormancy anomaly
  if (profile.daysSinceLastTransaction > 90) {
    anomalies.push({
      type: 'dormant_reactivation',
      severity: profile.daysSinceLastTransaction > 180 ? 'high' : 'medium',
      description: `Account inactive for ${profile.daysSinceLastTransaction} days`,
      deviation: profile.daysSinceLastTransaction,
      threshold: 90
    });
  }

  // Balance ratio anomaly
  if (profile.balance > 0) {
    const balanceRatio = transactionAmount / profile.balance;
    if (balanceRatio > 0.8) {
      anomalies.push({
        type: 'high_balance_ratio',
        severity: balanceRatio > 1 ? 'high' : 'medium',
        description: `Transaction is ${(balanceRatio * 100).toFixed(0)}% of account balance`,
        deviation: balanceRatio,
        threshold: 0.8
      });
    }
  }

  return anomalies;
}

// ============================================================
// PROFILE UPDATE FUNCTIONS
// ============================================================

/**
 * Update customer profile after a transaction is processed
 */
export async function updateProfileAfterTransaction(
  accountId: number,
  amount: number,
  payeeName: string,
  status: 'approved' | 'rejected' | 'bounced'
): Promise<void> {
  try {
    // Update customer_profiles table if it exists
    // For now, the profile is computed dynamically from cheques table
    // This function can be expanded to maintain a cached profile table
    console.log(`[Profile] Updated profile for account ${accountId} after ${status} transaction of ${amount}`);
  } catch (error) {
    console.error('Error updating profile:', error);
  }
}

/**
 * Calculate behaviour deviation score for a transaction
 */
export function calculateBehaviourScore(anomalies: BehaviourAnomaly[]): number {
  if (anomalies.length === 0) return 0;

  let score = 0;
  for (const anomaly of anomalies) {
    switch (anomaly.severity) {
      case 'high': score += 25; break;
      case 'medium': score += 15; break;
      case 'low': score += 5; break;
    }
  }

  return Math.min(100, score);
}

