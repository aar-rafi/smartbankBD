/**
 * Signature ML Service Integration
 * Calls the Python Flask ML service for signature verification
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const ML_SERVICE_TIMEOUT = parseInt(process.env.ML_SERVICE_TIMEOUT || '10000', 10);

interface SignatureMLResult {
    distance: number;
    similarity: number;
    is_match: boolean;
    confidence: number;
}

interface MLServiceResponse {
    success: boolean;
    result?: SignatureMLResult;
    error?: string;
}

/**
 * Call Python ML service to verify signature similarity
 * @param signature1Base64 - Base64 encoded extracted signature from cheque
 * @param signature2Base64 - Base64 encoded reference signature from DB
 * @returns ML verification result with similarity score
 */
export const verifySignatureML = async (
    signature1Base64: string,
    signature2Base64: string
): Promise<SignatureMLResult | null> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ML_SERVICE_TIMEOUT);

        const response = await fetch(`${ML_SERVICE_URL}/verify-signature`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signature1: signature1Base64,
                signature2: signature2Base64,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('ML service error:', errorData);
            return null;
        }

        const data: MLServiceResponse = await response.json();

        if (data.success && data.result) {
            return data.result;
        } else {
            console.error('ML service returned error:', data.error);
            return null;
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                console.error('ML service timeout after', ML_SERVICE_TIMEOUT, 'ms');
            } else {
                console.error('Error calling ML service:', error.message);
            }
        }
        return null;
    }
};

/**
 * Check if ML service is available
 * @returns true if service is healthy
 */
export const checkMLServiceHealth = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${ML_SERVICE_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data.status === 'ok' && data.model_loaded === true;
        }
        return false;
    } catch (error) {
        return false;
    }
};
