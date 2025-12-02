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

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'validating' | 'success' | 'error';
  data: ChequeData | null;
  validation: ValidationResult | null;
  error: string | null;
  imagePreview: string | null;
}