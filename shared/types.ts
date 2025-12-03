export interface ChequeData {
  bankName: string | null;
  branchName: string | null;
  routingNumber: string | null;
  chequeNumber: string | null;
  date: string | null;
  payeeName: string | null;
  amountWords: string | null;
  amountDigits: number | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  hasSignature: boolean;
  signatureBox: number[] | null; // [ymin, xmin, ymax, xmax] normalized to 1000
  micrCode: string | null;
  extractedSignatureImage: string | null; // base64-encoded PNG/JPG of extracted signature
  chequeImagePath?: string; // Server path to uploaded cheque image
  signatureImagePath?: string; // Server path to extracted signature image
  synthIdConfidence: number | null; // 0-100
  isAiGenerated: boolean;
}

export interface SignatureData {
  extracted: string | null; // base64-encoded extracted signature from cheque
  reference: string | null; // base64-encoded reference signature from account_signatures table
  matchScore?: number; // optional similarity score 0-100
}

export interface ValidationRule {
  id: string;
  label: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  message?: string;
  details?: Record<string, any>; // Additional details like score, confidence, etc.
}

export interface ValidationResult {
  isValid: boolean;
  rules: ValidationRule[];
  signatureData?: SignatureData; // signature images for visual comparison
  riskScore?: number;
  riskLevel?: string;
}

// ============================================================
// FRAUD DETECTION TYPES
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

// Detailed customer profile statistics from database
export interface CustomerStatistics {
  avgTransactionAmt: number;
  maxTransactionAmt: number;
  minTransactionAmt: number;
  stddevTransactionAmt: number;
  totalTransactionCount: number;
  bounceRate: number;
  accountBalance: number;
  accountAgeDays: number;
  uniquePayeeCount: number;
  monthlyAvgCount: number;
}

// Computed ML features for transparency
export interface ComputedFeatures {
  amountZscore: number;
  amountToMaxRatio: number;
  amountToBalanceRatio: number;
  isAboveMax: boolean;
  isNewPayee: boolean;
  payeeFrequency: number;
  txnCount24h: number;
  txnCount7d: number;
  daysSinceLastTxn: number;
  isDormant: boolean;
  isNightTransaction: boolean;
  isWeekend: boolean;
  isUnusualHour: boolean;
  signatureScore: number;
}

// Safe factors that reduce risk
export interface SafeFactor {
  factor: string;
  description: string;
  value?: string | number | boolean;
}

export interface FraudDetectionResult {
  modelAvailable: boolean;
  dataAvailable: boolean;
  profileFound: boolean;
  fraudScore: number | null;
  anomalyScore?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  decision?: 'approve' | 'review' | 'reject';
  confidence?: number;
  riskFactors: RiskFactor[];
  safeFactors?: SafeFactor[];  // NEW: Positive indicators
  featureContributions: FeatureContribution[];
  customerStatistics?: CustomerStatistics;  // NEW: Profile data
  computedFeatures?: ComputedFeatures;  // NEW: ML features
  explanations?: string[];
  recommendation: string | null;
  error?: string;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'validating' | 'success' | 'error';
  data: ChequeData | null;
  validation: ValidationResult | null;
  fraudDetection: FraudDetectionResult | null;
  error: string | null;
  imagePreview: string | null;
}