import { ChequeData, ValidationResult, ValidationRule } from "../../shared/types";
import {
    checkAccountExists,
    checkChequeStatus,
    checkSufficientFunds,
    storeValidationResult,
    getReferenceSignature,
} from "./dbQueries.ts";

// Helper to convert word numbers to digits (simplified for demo)
const parseAmountWords = (text: string): number | null => {
    if (!text) return null;
    // This is a basic heuristic. Real-world would use a robust NLP library.
    return null;
};

// Helper to parse dates. Accepts ISO-like strings and DDMMYYYY (with or without separators).
const parseDateString = (input: string | null | undefined): Date | null => {
    if (!input) return null;
    const s = input.trim();

    // Try to detect pure numeric DDMMYYYY (e.g. 15092025) or with separators (15/09/2025, 15-09-2025)
    const digitsOnly = s.replace(/[^0-9]/g, '');
    if (/^\d{8}$/.test(digitsOnly)) {
        const day = parseInt(digitsOnly.slice(0, 2), 10);
        const month = parseInt(digitsOnly.slice(2, 4), 10);
        const year = parseInt(digitsOnly.slice(4, 8), 10);
        // Basic validation
        if (year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const dt = new Date(year, month - 1, day);
            if (!isNaN(dt.getTime())) return dt;
        }
    }

    // Fallback to Date.parse for common formats (ISO, MMM DD YYYY, etc.)
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;

    return null;
};

export const validateChequeData = async (data: ChequeData): Promise<ValidationResult> => {
    const rules: ValidationRule[] = [];

    // 1. Check Required Fields
    const requiredFields: (keyof ChequeData)[] = ['bankName', 'chequeNumber', 'date', 'amountDigits', 'accountNumber'];
    const missingFields = requiredFields.filter(field => !data[field]);

    rules.push({
        id: 'completeness',
        label: 'Data Completeness Check',
        status: missingFields.length === 0 ? 'pass' : 'fail',
        message: missingFields.length === 0
            ? 'All critical fields extracted successfully.'
            : `Missing: ${missingFields.join(', ')}`
    });

    // 2. Date Validity (Within last 6 months, not in future)
    if (data.date) {
        const parsedDate = parseDateString(data.date);

        // Normalize "today" to midnight to allow strict date comparison ignoring time
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!parsedDate) {
            rules.push({ id: 'date', label: 'Cheque Date Validity', status: 'warning', message: 'Date format ambiguous (expected DDMMYYYY or ISO-like formats)' });
        } else {
            // Normalize parsed date to midnight
            parsedDate.setHours(0, 0, 0, 0);

            const sixMonthsAgo = new Date(today);
            sixMonthsAgo.setMonth(today.getMonth() - 6);

            if (parsedDate > today) {
                rules.push({ id: 'date', label: 'Cheque Date Validity', status: 'fail', message: 'Cheque is post-dated (Future date)' });
            } else if (parsedDate < sixMonthsAgo) {
                rules.push({ id: 'date', label: 'Cheque Date Validity', status: 'fail', message: 'Cheque is stale (> 6 months old)' });
            } else {
                rules.push({ id: 'date', label: 'Cheque Date Validity', status: 'pass', message: 'Date is valid and current' });
            }
        }
    } else {
        rules.push({ id: 'date', label: 'Cheque Date Validity', status: 'fail', message: 'Date missing' });
    }

    // 3. Amount Matching (Digits vs Words)
    if (data.amountDigits && data.amountWords) {
        rules.push({
            id: 'amount-match',
            label: 'Amount Cross-Verification',
            status: 'pass',
            message: 'Numeric and written amounts are present'
        });
    } else {
        rules.push({
            id: 'amount-match',
            label: 'Amount Cross-Verification',
            status: 'warning',
            message: 'Cannot verify: one or both amount fields missing'
        });
    }

    // 4. Signature Presence
    rules.push({
        id: 'signature',
        label: 'Signature Detection',
        status: data.hasSignature ? 'pass' : 'fail',
        message: data.hasSignature ? 'Handwritten signature detected' : 'Signature missing'
    });

    // 5. MICR Validation
    if (data.micrCode) {
        // Split by whitespace to handle variable spacing
        const parts = data.micrCode.trim().split(/\s+/);

        if (parts.length !== 4) {
            rules.push({
                id: 'micr-structure',
                label: 'MICR Code Structure',
                status: 'fail',
                message: `Invalid format: Expected 4 parts, found ${parts.length}`
            });
        } else {
            // Part 1: Cheque Number
            const micrCheque = parts[0];
            const matchCheque = data.chequeNumber === micrCheque;

            // Part 2: Routing Number
            const micrRouting = parts[1];
            const matchRouting = data.routingNumber === micrRouting;

            // Part 3: Account Number
            const micrAccount = parts[2];
            const matchAccount = data.accountNumber === micrAccount;

            if (matchCheque && matchRouting && matchAccount) {
                rules.push({
                    id: 'micr-validate',
                    label: 'MICR Integrity Check',
                    status: 'pass',
                    message: 'MICR matches Cheque #, Routing #, and Account #'
                });
            } else {
                const errors = [];
                if (!matchCheque) errors.push(`Cheque # (${micrCheque} vs ${data.chequeNumber})`);
                if (!matchRouting) errors.push(`Routing # (${micrRouting} vs ${data.routingNumber})`);
                if (!matchAccount) errors.push(`Account # (${micrAccount} vs ${data.accountNumber})`);

                rules.push({
                    id: 'micr-validate',
                    label: 'MICR Integrity Check',
                    status: 'fail',
                    message: `Mismatch: ${errors.join(', ')}`
                });
            }
        }
    } else {
        rules.push({
            id: 'micr-missing',
            label: 'MICR Integrity Check',
            status: 'fail',
            message: 'MICR code not extracted'
        });
    }

    // 6. Account Existence (Real DB Check)
    if (data.accountNumber) {
        try {
            const accountCheck = await checkAccountExists(data.accountNumber);
            rules.push({
                id: 'account-db',
                label: 'Database: Account Validation',
                status: accountCheck.exists && accountCheck.isActive ? 'pass' : 'fail',
                message: !accountCheck.exists
                    ? 'Account not found in system'
                    : accountCheck.isActive
                        ? 'Account found and active'
                        : 'Account exists but is not active'
            });
        } catch (error) {
            rules.push({
                id: 'account-db',
                label: 'Database: Account Validation',
                status: 'warning',
                message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    } else {
        rules.push({ id: 'account-db', label: 'Database: Account Validation', status: 'fail', message: 'No account number to verify' });
    }

    // 7. Cheque Status (Real DB Check)
    if (data.chequeNumber) {
        try {
            const status = await checkChequeStatus(data.chequeNumber);
            rules.push({
                id: 'cheque-leaf',
                label: 'Database: Cheque Status',
                status: status === 'active' ? 'pass' : 'fail',
                message: status === 'active' ? 'Cheque leaf is active and unused' : `Cheque is marked as ${status}`
            });
        } catch (error) {
            rules.push({
                id: 'cheque-leaf',
                label: 'Database: Cheque Status',
                status: 'warning',
                message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    } else {
        rules.push({ id: 'cheque-leaf', label: 'Database: Cheque Status', status: 'fail', message: 'No cheque number to verify' });
    }

    // 8. Sufficient Funds Check (Real DB Check)
    if (data.accountNumber && data.amountDigits) {
        try {
            const hasFunds = await checkSufficientFunds(data.accountNumber, data.amountDigits);
            rules.push({
                id: 'funds-available',
                label: 'Database: Funds Availability',
                status: hasFunds ? 'pass' : 'fail',
                message: hasFunds
                    ? `Account has sufficient funds for amount ${data.amountDigits}`
                    : `Insufficient funds: account balance is less than ${data.amountDigits}`
            });
        } catch (error) {
            rules.push({
                id: 'funds-available',
                label: 'Database: Funds Availability',
                status: 'warning',
                message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    } else {
        rules.push({
            id: 'funds-available',
            label: 'Database: Funds Availability',
            status: 'warning',
            message: 'Cannot verify funds without account number and amount'
        });
    }

    const isValid = !rules.some(r => r.status === 'fail');

    // Store validation result asynchronously (don't wait for it)
    if (data.accountNumber && data.chequeNumber) {
        storeValidationResult(data.chequeNumber, data.accountNumber, {
            payeeName: data.payeeName,
            amountDigits: data.amountDigits,
            amountWords: data.amountWords,
            signatureValid: data.hasSignature,
            dateValid: !rules.find(r => r.id === 'date')?.message?.includes('invalid'),
            accountActive: rules.find(r => r.id === 'account-db')?.status === 'pass',
            amountValid: rules.find(r => r.id === 'amount-match')?.status === 'pass',
            micrCode: data.micrCode,
            isValid: isValid
        }).catch(err => console.error('Failed to store validation result:', err));
    }

    // Fetch signature data for visual comparison (extracted + reference)
    let signatureData = {
        extracted: data.extractedSignatureImage || null,
        reference: null as string | null,
        matchScore: undefined as number | undefined
    };

    // Try to fetch reference signature from DB if account exists
    if (data.accountNumber && data.hasSignature) {
        try {
            const refSignatureBuffer = await getReferenceSignature(data.accountNumber);
            if (refSignatureBuffer) {
                // Convert Buffer to base64 string for transmission over JSON
                signatureData.reference = Buffer.isBuffer(refSignatureBuffer)
                    ? refSignatureBuffer.toString('base64')
                    : refSignatureBuffer;
            }
        } catch (error) {
            console.error('Failed to fetch reference signature:', error);
            // Continue without reference signature
        }
    }



    return { isValid, rules, signatureData };
};