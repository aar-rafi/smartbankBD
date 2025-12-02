/**
 * Fraud Detection Service
 * ========================
 * Integrates with the Python ML model for anomaly-based fraud detection.
 * Calls fraud_prediction.py via subprocess or direct Python execution.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ChequeData } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Python fraud prediction script
const FRAUD_PREDICTION_SCRIPT = path.join(__dirname, '..', 'ml', 'fraud_prediction.py');

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

export interface FraudDetectionResult {
  modelAvailable: boolean;
  dataAvailable: boolean;
  profileFound: boolean;
  fraudScore: number | null;
  riskLevel: 'normal' | 'low' | 'medium' | 'high' | null;
  riskFactors: RiskFactor[];
  featureContributions: FeatureContribution[];
  recommendation: string | null;
  error?: string;
}

// ============================================================
// PYTHON EXECUTION HELPER
// ============================================================

/**
 * Execute Python fraud prediction script with given data
 */
async function executePythonScript(inputData: object): Promise<FraudDetectionResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [FRAUD_PREDICTION_SCRIPT], {
      cwd: path.dirname(FRAUD_PREDICTION_SCRIPT),
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr);
        resolve({
          modelAvailable: false,
          dataAvailable: false,
          profileFound: false,
          fraudScore: null,
          riskLevel: null,
          riskFactors: [],
          featureContributions: [],
          recommendation: null,
          error: `Python script exited with code ${code}: ${stderr}`
        });
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        console.error('Failed to parse Python output:', stdout);
        resolve({
          modelAvailable: false,
          dataAvailable: false,
          profileFound: false,
          fraudScore: null,
          riskLevel: null,
          riskFactors: [],
          featureContributions: [],
          recommendation: null,
          error: `Failed to parse response: ${stdout}`
        });
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to spawn Python process:', err);
      resolve({
        modelAvailable: false,
        dataAvailable: false,
        profileFound: false,
        fraudScore: null,
        riskLevel: null,
        riskFactors: [],
        featureContributions: [],
        recommendation: null,
        error: `Failed to spawn Python: ${err.message}`
      });
    });

    // Send input data to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();
  });
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Check if the fraud detection model is available and loaded
 */
export async function checkModelStatus(): Promise<{ modelAvailable: boolean; error?: string }> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [FRAUD_PREDICTION_SCRIPT, '--check'], {
      cwd: path.dirname(FRAUD_PREDICTION_SCRIPT),
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        resolve({ modelAvailable: false, error: stderr });
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        resolve({ modelAvailable: false, error: 'Failed to parse response' });
      }
    });

    pythonProcess.on('error', (err) => {
      resolve({ modelAvailable: false, error: err.message });
    });
  });
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
  console.log('[FraudDetection] Starting fraud analysis...');
  
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

  try {
    const result = await executePythonScript(inputData);
    
    console.log('[FraudDetection] Analysis complete:', {
      modelAvailable: result.modelAvailable,
      fraudScore: result.fraudScore,
      riskLevel: result.riskLevel,
      riskFactors: result.riskFactors?.length || 0
    });

    return result;
  } catch (error) {
    console.error('[FraudDetection] Error:', error);
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
