const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface DashboardStats {
    total: number;
    received: number;
    approved: number;
    rejected: number;
    flagged: number;
    total_amount: string;
    pending_reviews: number;
}

export interface BankCheque {
    cheque_id: number;
    cheque_number: string;
    payee_name: string;
    amount: string;
    status: string;
    created_at: string;
    drawer_bank_name: string;
    drawer_bank_code: string;
    presenting_bank_name: string;
    presenting_bank_code: string;
    drawer_account: string;
}

export interface ChequeDetails {
    cheque: {
        cheque_id: number;
        cheque_number: string;
        payee_name: string;
        amount: string;
        status: string;
        created_at: string;
        issue_date: string;
        micr_code: string;
        drawer_bank_name: string;
        drawer_bank_code: string;
        presenting_bank_name: string;
        presenting_bank_code: string;
        drawer_account: string;
        drawer_name: string;
        cheque_image_path?: string;
        signature_image_path?: string;
    };
    validation: {
        validation_id: number;
        all_fields_present: boolean;
        date_valid: boolean;
        micr_readable: boolean;
        ocr_amount: string;
        ocr_confidence: number;
        amount_match: boolean;
        validation_status: string;
        failure_reason?: string;
        validated_at: string;
    } | null;
    verification: {
        verification_id: number;
        signature_score: number;
        signature_match: string;
        behavior_score: number;
        fraud_risk_score: number;
        risk_level: string;
        ai_decision: string;
        ai_confidence: number;
        ai_reasoning: string;
        behavior_flags: string[];
        verified_at: string;
    } | null;
    flags: Array<{
        flag_id: number;
        reason: string;
        priority: string;
        status: string;
        review_notes?: string;
        created_at: string;
    }>;
    clearing: {
        clearing_id: number;
        clearing_reference: string;
        status: string;
        received_at: string;
        forwarded_at?: string;
        response_status?: string;
        response_at?: string;
    } | null;
}

// Fetch inward cheques for a bank (cheques deposited at this bank, drawn on other banks)
export const fetchInwardCheques = async (bankCode: string): Promise<BankCheque[]> => {
    const res = await fetch(`${API_URL}/api/bank/${bankCode}/cheques/inward`);
    if (!res.ok) throw new Error('Failed to fetch inward cheques');
    const json = await res.json();
    return json.cheques;
};

// Fetch outward cheques for a bank (cheques drawn on this bank, received from BACH)
export const fetchOutwardCheques = async (bankCode: string): Promise<BankCheque[]> => {
    const res = await fetch(`${API_URL}/api/bank/${bankCode}/cheques/outward`);
    if (!res.ok) throw new Error('Failed to fetch outward cheques');
    const json = await res.json();
    return json.cheques;
};

// Fetch single cheque details
export const fetchChequeDetails = async (chequeId: number): Promise<ChequeDetails> => {
    const res = await fetch(`${API_URL}/api/cheques/${chequeId}`);
    if (!res.ok) throw new Error('Failed to fetch cheque details');
    const json = await res.json();
    return json.details;
};

// Create a new cheque (when deposited at presenting bank)
export const createCheque = async (data: {
    chequeNumber: string;
    drawerAccountNumber: string;
    payeeName: string;
    amount: number;
    amountWords?: string;
    issueDate: string;
    micrCode?: string;
    presentingBankCode: string;
    chequeImagePath?: string;
    signatureImagePath?: string;
    analysisResults?: {
        signatureScore?: number;
        signatureMatch?: string;
        fraudRiskScore?: number;
        riskLevel?: string;
        aiDecision?: string;
        aiConfidence?: number;
        aiReasoning?: string;
        behaviorFlags?: string[];
        isAiGenerated?: boolean;
        confidence?: number;
    };
}): Promise<number> => {
    const res = await fetch(`${API_URL}/api/cheques`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create cheque');
    }
    const json = await res.json();
    return json.chequeId;
};

// Send cheque to BACH
export const sendToBACH = async (chequeId: number): Promise<{ clearingRef: string }> => {
    const res = await fetch(`${API_URL}/api/cheques/${chequeId}/send-to-bach`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to send to BACH');
    const json = await res.json();
    return { clearingRef: json.clearingRef };
};

// Simulate BACH forwarding (in real world this would be automatic)
export const receiveAtDrawerBank = async (chequeId: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/cheques/${chequeId}/receive-at-drawer`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to receive at drawer bank');
};

// Update cheque decision
export const updateChequeDecision = async (
    chequeId: number, 
    decision: 'approved' | 'rejected' | 'flagged',
    reason?: string
): Promise<void> => {
    const res = await fetch(`${API_URL}/api/cheques/${chequeId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason })
    });
    if (!res.ok) throw new Error('Failed to update decision');
};

// Run deep verification on a cheque (drawer bank)
export const runDeepVerification = async (chequeId: number, extractedSignature?: string) => {
    const res = await fetch(`${API_URL}/api/cheques/${chequeId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedSignature })
    });
    if (!res.ok) throw new Error('Failed to run verification');
    const json = await res.json();
    return json.verification;
};

// Delete a single cheque
export const deleteCheque = async (chequeId: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/cheques/${chequeId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete cheque');
};

// Delete all cheques (for demo reset)
export const deleteAllCheques = async (): Promise<number> => {
    const res = await fetch(`${API_URL}/api/cheques`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete cheques');
    const json = await res.json();
    return parseInt(json.message.match(/\d+/)?.[0] || '0');
};

// Legacy dashboard endpoints (for backward compatibility)
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_URL}/api/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const json = await res.json();
    return json.stats;
};

export const fetchDashboardCheques = async (limit = 20): Promise<BankCheque[]> => {
    const res = await fetch(`${API_URL}/api/dashboard/cheques?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch cheques');
    const json = await res.json();
    return json.cheques;
};
