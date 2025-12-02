import { ChequeData, ValidationResult, ValidationRule } from "../../shared/types.js";
import {
    checkAccountExists,
    checkChequeStatus,
    checkSufficientFunds,
    storeValidationResult,
    getReferenceSignature
} from "./dbQueries.js";
import { verifySignatureML } from "./signatureMLService.js";
import { BypassConfig, isDemoCheque } from "../config/bypass.js";

// Helper to extract numeric cheque number (strips prefixes like "MCG", "CHQ", etc.)
const extractNumericChequeNumber = (chequeNumber: string | null | undefined): string | null => {
    if (!chequeNumber) return null;
    const digits = chequeNumber.replace(/\D/g, '');
    return digits || null;
};

// Helper to parse dates
const parseDateString = (input: string | null | undefined): Date | null => {
    if (!input) return null;
    const s = input.trim();
    const digitsOnly = s.replace(/[^0-9]/g, '');
    if (/^\d{8}$/.test(digitsOnly)) {
        const day = parseInt(digitsOnly.slice(0, 2), 10);
        const month = parseInt(digitsOnly.slice(2, 4), 10);
        const year = parseInt(digitsOnly.slice(4, 8), 10);
        if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const dt = new Date(year, month - 1, day);
            if (!isNaN(dt.getTime())) return dt;
        }
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
};

/**
 * BASIC VALIDATION - Done at PRESENTING BANK (where cheque is deposited)
 * This bank has the physical cheque but NOT the account holder's data
 * 
 * Checks:
 * - OCR data extraction quality
 * - All required fields present
 * - Date format valid
 * - Amount digits/words present
 * - Signature presence (not verification)
 * - MICR code readable
 * - Basic image quality
 */
export const validateChequeBasic = async (data: ChequeData): Promise<ValidationResult> => {
    const rules: ValidationRule[] = [];
    const isDemo = isDemoCheque(data.accountHolderName ?? undefined);

    // 1. Data Completeness Check
    const requiredFields: (keyof ChequeData)[] = ['bankName', 'chequeNumber', 'date', 'amountDigits', 'accountNumber'];
    const missingFields = requiredFields.filter(field => !data[field]);
    rules.push({
        id: 'completeness',
        label: 'Data Extraction Quality',
        status: missingFields.length === 0 ? 'pass' : 'fail',
        message: missingFields.length === 0
            ? 'All critical fields extracted successfully'
            : `Missing: ${missingFields.join(', ')}`
    });

    // 2. Date Format Validity (not business logic, just format)
    if (BypassConfig.skipDateValidation || isDemo) {
        rules.push({
            id: 'date-format',
            label: 'Date Format Check',
            status: 'pass',
            message: 'Date format valid'
        });
    } else if (data.date) {
        const parsedDate = parseDateString(data.date);
        rules.push({
            id: 'date-format',
            label: 'Date Format Check',
            status: parsedDate ? 'pass' : 'warning',
            message: parsedDate ? 'Date format valid' : 'Date format ambiguous'
        });
    } else {
        rules.push({ id: 'date-format', label: 'Date Format Check', status: 'fail', message: 'Date missing' });
    }

    // 3. Amount Fields Present
    rules.push({
        id: 'amount-present',
        label: 'Amount Fields Check',
        status: (data.amountDigits && data.amountWords) ? 'pass' : 'warning',
        message: (data.amountDigits && data.amountWords) 
            ? 'Both numeric and written amounts extracted'
            : 'One or both amount fields missing'
    });

    // 4. Signature Presence (NOT verification - that's drawer bank's job)
    rules.push({
        id: 'signature-present',
        label: 'Signature Detection',
        status: data.hasSignature ? 'pass' : 'fail',
        message: data.hasSignature ? 'Handwritten signature detected' : 'Signature missing or unclear'
    });

    // 5. MICR Code Readable
    if (BypassConfig.skipMICRValidation || isDemo) {
        rules.push({
            id: 'micr-readable',
            label: 'MICR Code Readable',
            status: 'pass',
            message: 'MICR code extracted'
        });
    } else {
        rules.push({
            id: 'micr-readable',
            label: 'MICR Code Readable',
            status: data.micrCode ? 'pass' : 'warning',
            message: data.micrCode ? 'MICR code extracted' : 'MICR code not readable'
        });
    }

    // 6. Basic Image Quality (based on AI detection - presenting bank can do basic check)
    if (BypassConfig.skipAIDetection || isDemo) {
        rules.push({
            id: 'image-quality',
            label: 'Image Quality Check',
            status: 'pass',
            message: 'Image quality acceptable'
        });
    } else {
        // Basic check - if AI confidence is very high, flag it
        const suspicious = data.isAiGenerated && (data.synthIdConfidence ?? 0) > 90;
        rules.push({
            id: 'image-quality',
            label: 'Image Quality Check',
            status: suspicious ? 'warning' : 'pass',
            message: suspicious ? 'Image may need review' : 'Image quality acceptable'
        });
    }

    const isValid = !rules.some(r => r.status === 'fail');

    // Store basic validation result
    if (data.accountNumber && data.chequeNumber) {
        const numericChequeNumber = extractNumericChequeNumber(data.chequeNumber);
        if (numericChequeNumber) {
            storeValidationResult(numericChequeNumber, data.accountNumber, {
                payeeName: data.payeeName,
                amountDigits: data.amountDigits,
                amountWords: data.amountWords,
                signaturePresent: data.hasSignature,
                dateValid: rules.find(r => r.id === 'date-format')?.status === 'pass',
                micrCode: data.micrCode,
                isValid: isValid
            }).catch(err => console.error('Failed to store validation result:', err));
        }
    }

    return { 
        isValid, 
        rules,
        signatureData: {
            extracted: data.extractedSignatureImage || null,
            reference: null, // Presenting bank doesn't have reference
            matchScore: undefined
        }
    };
};

/**
 * DEEP VERIFICATION - Done at DRAWER BANK (where account is held)
 * This bank has the account holder's data, signature, transaction history
 * 
 * Checks:
 * - Account exists & active
 * - Sufficient funds
 * - Cheque leaf valid (not used/stolen/stopped)
 * - Signature ML verification (compare with stored reference)
 * - AI-Generated/SynthID deep check
 * - Fraud/Behavior analysis
 * - Date business logic (stale/post-dated)
 */
export const verifyChequeFull = async (data: ChequeData): Promise<ValidationResult> => {
    const rules: ValidationRule[] = [];
    const isDemo = isDemoCheque(data.accountHolderName ?? undefined);

    // 1. Account Existence & Status
    if (BypassConfig.skipAccountCheck || isDemo) {
        rules.push({
            id: 'account-status',
            label: 'Account Verification',
            status: 'pass',
            message: 'Account verified and active'
        });
    } else if (data.accountNumber) {
        try {
            const accountCheck = await checkAccountExists(data.accountNumber);
            rules.push({
                id: 'account-status',
                label: 'Account Verification',
                status: accountCheck.exists && accountCheck.isActive ? 'pass' : 'fail',
                message: !accountCheck.exists
                    ? 'Account not found in system'
                    : accountCheck.isActive
                        ? 'Account verified and active'
                        : 'Account exists but is frozen/closed'
            });
        } catch (error) {
            rules.push({
                id: 'account-status',
                label: 'Account Verification',
                status: 'warning',
                message: 'Database check failed'
            });
        }
    } else {
        rules.push({ id: 'account-status', label: 'Account Verification', status: 'fail', message: 'No account number provided' });
    }

    // 2. Cheque Leaf Status (used/stolen/stopped)
    if (BypassConfig.skipChequeStatusCheck || isDemo) {
        rules.push({
            id: 'cheque-leaf',
            label: 'Cheque Leaf Verification',
            status: 'pass',
            message: 'Cheque leaf is valid and unused'
        });
    } else if (data.chequeNumber) {
        const numericChequeNumber = extractNumericChequeNumber(data.chequeNumber);
        if (numericChequeNumber) {
            try {
                const status = await checkChequeStatus(numericChequeNumber);
                rules.push({
                    id: 'cheque-leaf',
                    label: 'Cheque Leaf Verification',
                    status: status === 'active' ? 'pass' : 'fail',
                    message: status === 'active' 
                        ? 'Cheque leaf is valid and unused' 
                        : `Cheque is ${status} - REJECT`
                });
            } catch (error) {
                rules.push({
                    id: 'cheque-leaf',
                    label: 'Cheque Leaf Verification',
                    status: 'warning',
                    message: 'Database check failed'
                });
            }
        }
    }

    // 3. Sufficient Funds
    if (BypassConfig.skipFundsCheck || isDemo) {
        rules.push({
            id: 'funds-check',
            label: 'Funds Availability',
            status: 'pass',
            message: 'Sufficient funds available'
        });
    } else if (data.accountNumber && data.amountDigits) {
        try {
            const hasFunds = await checkSufficientFunds(data.accountNumber, data.amountDigits);
            rules.push({
                id: 'funds-check',
                label: 'Funds Availability',
                status: hasFunds ? 'pass' : 'fail',
                message: hasFunds ? 'Sufficient funds available' : 'INSUFFICIENT FUNDS'
            });
        } catch (error) {
            rules.push({
                id: 'funds-check',
                label: 'Funds Availability',
                status: 'warning',
                message: 'Database check failed'
            });
        }
    }

    // 4. Date Business Logic (stale/post-dated)
    if (BypassConfig.skipDateValidation || isDemo) {
        rules.push({
            id: 'date-validity',
            label: 'Date Validity Check',
            status: 'pass',
            message: 'Date is within valid range'
        });
    } else if (data.date) {
        const parsedDate = parseDateString(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!parsedDate) {
            rules.push({ id: 'date-validity', label: 'Date Validity Check', status: 'warning', message: 'Cannot parse date' });
        } else {
            parsedDate.setHours(0, 0, 0, 0);
            const sixMonthsAgo = new Date(today);
            sixMonthsAgo.setMonth(today.getMonth() - 6);

            if (parsedDate > today) {
                rules.push({ id: 'date-validity', label: 'Date Validity Check', status: 'fail', message: 'POST-DATED cheque - not yet valid' });
            } else if (parsedDate < sixMonthsAgo) {
                rules.push({ id: 'date-validity', label: 'Date Validity Check', status: 'fail', message: 'STALE cheque - expired (> 6 months)' });
            } else {
                rules.push({ id: 'date-validity', label: 'Date Validity Check', status: 'pass', message: 'Date is within valid range' });
            }
        }
    }

    // 5. SIGNATURE ML VERIFICATION (Main check - drawer bank has reference)
    let signatureData = {
        extracted: data.extractedSignatureImage || null,
        reference: null as string | null,
        matchScore: undefined as number | undefined
    };

    // Fetch reference signature from our database
    if (data.accountNumber && data.hasSignature) {
        try {
            const refSignatureBuffer = await getReferenceSignature(data.accountNumber);
            if (refSignatureBuffer) {
                signatureData.reference = Buffer.isBuffer(refSignatureBuffer)
                    ? refSignatureBuffer.toString('base64')
                    : refSignatureBuffer;
            }
        } catch (error) {
            console.error('Failed to fetch reference signature:', error);
        }
    }

    // NOTE: We ALWAYS run ML for signature verification - this is the main feature to demo!
    // Only bypass if explicitly set via BYPASS_SIGNATURE_ML env var
    if (BypassConfig.skipSignatureML) {
        signatureData.matchScore = 95.0;
        rules.push({
            id: 'signature-verify',
            label: 'Signature Verification (AI)',
            status: 'pass',
            message: 'Signature MATCH confirmed (95.0% confidence) [BYPASSED]',
            details: { score: 95.0 }
        });
    } else if (signatureData.extracted && signatureData.reference) {
        try {
            console.log('Running ML signature verification...');
            const mlResult = await verifySignatureML(signatureData.extracted, signatureData.reference);

            if (mlResult) {
                signatureData.matchScore = mlResult.confidence;
                const threshold = 70;
                const isMatch = mlResult.is_match && mlResult.confidence >= threshold;
                rules.push({
                    id: 'signature-verify',
                    label: 'Signature Verification (AI)',
                    status: isMatch ? 'pass' : mlResult.confidence >= 50 ? 'warning' : 'fail',
                    message: isMatch
                        ? `Signature MATCH confirmed (${mlResult.confidence.toFixed(1)}% confidence)`
                        : `Signature MISMATCH (${mlResult.confidence.toFixed(1)}% confidence) - POTENTIAL FRAUD`,
                    details: { score: mlResult.confidence }
                });
            } else {
                rules.push({
                    id: 'signature-verify',
                    label: 'Signature Verification (AI)',
                    status: 'warning',
                    message: 'ML service unavailable - MANUAL REVIEW REQUIRED'
                });
            }
        } catch (mlError) {
            rules.push({
                id: 'signature-verify',
                label: 'Signature Verification (AI)',
                status: 'warning',
                message: 'ML verification error - MANUAL REVIEW REQUIRED'
            });
        }
    } else if (!signatureData.reference) {
        rules.push({
            id: 'signature-verify',
            label: 'Signature Verification (AI)',
            status: 'warning',
            message: 'No reference signature on file - MANUAL VERIFICATION REQUIRED'
        });
    } else {
        rules.push({
            id: 'signature-verify',
            label: 'Signature Verification (AI)',
            status: 'fail',
            message: 'No signature to verify'
        });
    }

    // 6. AI-Generated / SynthID Deep Check
    if (BypassConfig.skipAIDetection || isDemo) {
        rules.push({
            id: 'ai-detection',
            label: 'AI-Generated Detection (SynthID)',
            status: 'pass',
            message: 'No AI-generated artifacts detected'
        });
    } else {
        const isAI = data.isAiGenerated && (data.synthIdConfidence ?? 0) > 70;
        rules.push({
            id: 'ai-detection',
            label: 'AI-Generated Detection (SynthID)',
            status: isAI ? 'fail' : 'pass',
            message: isAI 
                ? `AI-GENERATED CONTENT DETECTED (${data.synthIdConfidence}% confidence) - REJECT`
                : 'No AI-generated artifacts detected',
            details: { confidence: data.synthIdConfidence, isAiGenerated: data.isAiGenerated }
        });
    }

    // 7. Fraud/Behavior Analysis - Call the ML fraud detection service
    let fraudRiskScore = 0;
    let fraudRiskLevel = 'low';
    let fraudRiskFactors: string[] = [];
    
    try {
        const { detectFraud } = await import('./fraudDetectionService.js');
        const fraudResult = await detectFraud(data, signatureData.matchScore ?? 85);
        
        if (fraudResult.modelAvailable && fraudResult.fraudScore !== null) {
            fraudRiskScore = fraudResult.fraudScore;
            fraudRiskLevel = fraudResult.riskLevel || 'low';
            fraudRiskFactors = fraudResult.riskFactors?.map(f => f.description) || [];
            
            const fraudStatus = fraudRiskScore >= 70 ? 'fail' : fraudRiskScore >= 50 ? 'warning' : 'pass';
            rules.push({
                id: 'fraud-analysis',
                label: 'Fraud Risk Analysis',
                status: fraudStatus,
                message: fraudResult.recommendation || `Risk score: ${fraudRiskScore}%`,
                details: { 
                    riskScore: fraudRiskScore, 
                    riskLevel: fraudRiskLevel,
                    flags: fraudRiskFactors,
                    modelAvailable: true
                }
            });
        } else {
            // Model not available - use conservative default
            rules.push({
                id: 'fraud-analysis',
                label: 'Fraud Risk Analysis',
                status: 'warning',
                message: 'Fraud detection model unavailable - manual review recommended',
                details: { 
                    riskScore: 0, 
                    riskLevel: 'unknown',
                    flags: [],
                    modelAvailable: false
                }
            });
        }
    } catch (fraudError) {
        console.error('Fraud detection error:', fraudError);
        rules.push({
            id: 'fraud-analysis',
            label: 'Fraud Risk Analysis',
            status: 'warning',
            message: 'Fraud detection service error - manual review recommended',
            details: { 
                riskScore: 0, 
                riskLevel: 'unknown',
                flags: [],
                error: fraudError instanceof Error ? fraudError.message : 'Unknown error'
            }
        });
    }

    const isValid = !rules.some(r => r.status === 'fail');
    const riskScore = fraudRiskScore;
    const riskLevel = fraudRiskLevel;

    return { 
        isValid, 
        rules, 
        signatureData,
        riskScore,
        riskLevel
    };
};

/**
 * Legacy function - combines both for backward compatibility
 * Used when we want to run all checks at once
 */
export const validateChequeData = async (data: ChequeData): Promise<ValidationResult> => {
    // Run basic validation first
    const basicResult = await validateChequeBasic(data);
    
    // If basic fails, don't proceed to deep verification
    if (!basicResult.isValid) {
        return basicResult;
    }

    // Run deep verification
    const deepResult = await verifyChequeFull(data);

    // Combine results
    return {
        isValid: deepResult.isValid,
        rules: [...basicResult.rules, ...deepResult.rules],
        signatureData: deepResult.signatureData,
        riskScore: deepResult.riskScore,
        riskLevel: deepResult.riskLevel
    };
};
