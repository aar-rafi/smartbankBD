/**
 * Fraud Detection Service
 * ========================
 * Integrates with the Python ML model for anomaly-based fraud detection.
 * Calls fraud_prediction.py Flask API server via HTTP.
 */

import type { ChequeData } from '../../shared/types.js';

// Fraud Detection ML Service Configuration
const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || 'http://localhost:5002';
const FRAUD_SERVICE_TIMEOUT = parseInt(process.env.FRAUD_SERVICE_TIMEOUT || '15000', 10);

// ============================================================
// TYPES
// ============================================================

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: string | number | boolean;
}

export interface FeatureContribution {
  name: string;
  value: string | number;
  impact: 'normal' | 'medium' | 'high';
}

export interface SafeFactor {
  factor: string;
  description: string;
  value?: string | number | boolean;
}

export interface CustomerStatistics {
  avgTransactionAmt: number;
  maxTransactionAmt: number;
  totalTransactionCount: number;
  uniquePayeeCount: number;
  accountBalance: number;
  accountAgeDays: number;
}

export interface ComputedFeatures {
  amountZscore: number;
  amountToBalanceRatio: number;
  isNewPayee: boolean;
  txnCount24h: number;
  isDormant: boolean;
  signatureScore: number;
  isNightTransaction: boolean;
  isWeekend: boolean;
  daysSinceLastTxn?: number;
}

export interface FraudDetectionResult {
  modelAvailable: boolean;
  dataAvailable: boolean;
  profileFound: boolean;
  fraudScore: number | null;
  riskLevel: 'normal' | 'low' | 'medium' | 'high' | 'critical' | null;
  riskFactors: RiskFactor[];
  safeFactors?: SafeFactor[];
  featureContributions: FeatureContribution[];
  customerStatistics?: CustomerStatistics;
  computedFeatures?: ComputedFeatures;
  recommendation: string | null;
  confidence?: number;
  error?: string;
}

// ============================================================
// PYTHON EXECUTION HELPER (via HTTP to Flask Server)
// ============================================================

/**
 * Execute Python fraud prediction via Flask API
 */
async function executePythonScript(inputData: object): Promise<FraudDetectionResult> {
  try {
    console.log('[FraudDetection] Calling Flask API at:', FRAUD_SERVICE_URL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FRAUD_SERVICE_TIMEOUT);

    const response = await fetch(`${FRAUD_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
      console.error('[FraudDetection] Flask API error:', errorData);
      return {
        modelAvailable: false,
        dataAvailable: false,
        profileFound: false,
        fraudScore: null,
        riskLevel: null,
        riskFactors: [],
        featureContributions: [],
        recommendation: null,
        error: `API error: ${errorData.error || response.statusText}`
      };
    }

    const result = await response.json() as FraudDetectionResult;
    return result;

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[FraudDetection] Request timeout after', FRAUD_SERVICE_TIMEOUT, 'ms');
        return {
          modelAvailable: false,
          dataAvailable: false,
          profileFound: false,
          fraudScore: null,
          riskLevel: null,
          riskFactors: [],
          featureContributions: [],
          recommendation: null,
          error: `Request timeout after ${FRAUD_SERVICE_TIMEOUT}ms`
        };
      } else {
        console.error('[FraudDetection] Request error:', error.message);
        return {
          modelAvailable: false,
          dataAvailable: false,
          profileFound: false,
          fraudScore: null,
          riskLevel: null,
          riskFactors: [],
          featureContributions: [],
          recommendation: null,
          error: `Failed to connect: ${error.message}`
        };
      }
    }
    
    return {
      modelAvailable: false,
      dataAvailable: false,
      profileFound: false,
      fraudScore: null,
      riskLevel: null,
      riskFactors: [],
      featureContributions: [],
      recommendation: null,
      error: 'Unknown error occurred'
    };
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Check if the fraud detection model is available and loaded
 */
export async function checkModelStatus(): Promise<{ modelAvailable: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${FRAUD_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { modelAvailable: false, error: `Health check failed: ${response.statusText}` };
    }

    const data = await response.json() as any;
    return {
      modelAvailable: data.modelAvailable || false,
      error: data.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { modelAvailable: false, error: errorMessage };
  }
}

/**
 * Detect fraud in a cheque transaction
 * 
 * @param chequeData - Extracted cheque information from Gemini
 * @param signatureScore - ML signature verification score (0-100), default 85
 * @returns Fraud detection result with risk assessment
 */
export async function detectFraud(
  chequeData: ChequeData,
  signatureScore: number = 85
): Promise<FraudDetectionResult> {
  console.log('\n========================================');
  console.log('[FraudDetection] 🔍 STARTING FRAUD ANALYSIS');
  console.log('========================================');
  
  // Prepare input for Python script
  const inputData = {
    chequeData: {
      bankName: chequeData.bankName,
      branchName: chequeData.branchName,
      routingNumber: chequeData.routingNumber,
      chequeNumber: chequeData.chequeNumber,
      date: chequeData.date,
      payeeName: chequeData.payeeName,
      amountWords: chequeData.amountWords,
      amountDigits: chequeData.amountDigits,
      accountHolderName: chequeData.accountHolderName,
      accountNumber: chequeData.accountNumber,
      hasSignature: chequeData.hasSignature,
      micrCode: chequeData.micrCode,
    },
    signatureScore
  };

  console.log('\n📥 INPUT DATA TO FRAUD DETECTION:');
  console.log('----------------------------------------');
  console.log(JSON.stringify(inputData, null, 2));
  console.log('----------------------------------------');

  try {
    const result = await executePythonScript(inputData);
    
    console.log('\n📤 OUTPUT FROM FRAUD DETECTION:');
    console.log('----------------------------------------');
    console.log(JSON.stringify(result, null, 2));
    console.log('----------------------------------------');
    
    console.log('\n📊 FRAUD ANALYSIS SUMMARY:');
    console.log('========================================');
    console.log(`  Model Available: ${result.modelAvailable ? '✅ Yes' : '❌ No'}`);
    console.log(`  Data Available:  ${result.dataAvailable ? '✅ Yes' : '❌ No'}`);
    console.log(`  Profile Found:   ${result.profileFound ? '✅ Yes' : '❌ No'}`);
    console.log(`  Fraud Score:     ${result.fraudScore !== null ? result.fraudScore + '/100' : 'N/A'}`);
    console.log(`  Risk Level:      ${result.riskLevel || 'N/A'}`);
    console.log(`  Risk Factors:    ${result.riskFactors?.length || 0}`);
    if (result.riskFactors && result.riskFactors.length > 0) {
      console.log('\n  🚨 Risk Factors Detected:');
      result.riskFactors.forEach((rf, i) => {
        console.log(`     ${i+1}. [${rf.severity.toUpperCase()}] ${rf.factor}: ${rf.description}`);
      });
    }
    if (result.featureContributions && result.featureContributions.length > 0) {
      console.log('\n  📈 Feature Contributions:');
      result.featureContributions.forEach((fc, i) => {
        console.log(`     ${i+1}. ${fc.name}: ${fc.value} (${fc.impact})`);
      });
    }
    if (result.recommendation) {
      console.log(`\n  💡 Recommendation: ${result.recommendation}`);
    }
    if (result.error) {
      console.log(`\n  ⚠️  Error: ${result.error}`);
    }
    console.log('========================================\n');

    return result;
  } catch (error) {
    console.error('[FraudDetection] ❌ Error:', error);
    return {
      modelAvailable: false,
      dataAvailable: false,
      profileFound: false,
      fraudScore: null,
      riskLevel: null,
      riskFactors: [],
      featureContributions: [],
      recommendation: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get a mock fraud detection result for demo/testing
 * Used when model is not available or for UI development
 */
export function getMockFraudResult(chequeData: ChequeData): FraudDetectionResult {
  // Generate a semi-random score based on cheque data for demo
  const amount = chequeData.amountDigits || 10000;
  const hasSignature = chequeData.hasSignature;
  
  // Higher amounts = slightly higher risk for demo
  let mockScore = 15 + Math.random() * 20;
  if (amount > 100000) mockScore += 15;
  if (amount > 500000) mockScore += 20;
  if (!hasSignature) mockScore += 25;
  
  mockScore = Math.min(mockScore, 95);
  
  let riskLevel: 'normal' | 'low' | 'medium' | 'high';
  if (mockScore >= 70) riskLevel = 'high';
  else if (mockScore >= 50) riskLevel = 'medium';
  else if (mockScore >= 30) riskLevel = 'low';
  else riskLevel = 'normal';

  const riskFactors: RiskFactor[] = [];
  
  if (amount > 100000) {
    riskFactors.push({
      factor: 'high_amount',
      severity: amount > 500000 ? 'high' : 'medium',
      description: `Large transaction amount: ৳${amount.toLocaleString()}`,
      value: amount
    });
  }
  
  if (!hasSignature) {
    riskFactors.push({
      factor: 'missing_signature',
      severity: 'high',
      description: 'No signature detected on cheque',
      value: true
    });
  }

  return {
    modelAvailable: false,
    dataAvailable: true,
    profileFound: false,
    fraudScore: Math.round(mockScore),
    riskLevel,
    riskFactors,
    featureContributions: [
      { name: 'Amount Analysis', value: amount, impact: amount > 100000 ? 'high' : 'normal' },
      { name: 'Signature Present', value: hasSignature ? 'Yes' : 'No', impact: hasSignature ? 'normal' : 'high' },
      { name: 'Payee Verification', value: 'Not Available', impact: 'normal' },
      { name: 'Account History', value: 'No Profile', impact: 'medium' },
    ],
    recommendation: riskLevel === 'high' 
      ? 'REVIEW REQUIRED - Unable to fully verify. Manual review recommended.'
      : riskLevel === 'medium'
      ? 'CAUTION - Some verification data unavailable. Proceed with care.'
      : 'PROCEED - Basic checks passed. Standard processing recommended.',
    error: 'Model not available - showing demo results'
  };
}
