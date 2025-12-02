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
  featureContributions: FeatureContribution[];
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