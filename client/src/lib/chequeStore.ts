// Simple global cheque store using localStorage
// This simulates a shared database between banks

export type ChequeStatus = 
    | 'pending_validation' 
    | 'validated' 
    | 'sent_to_bach' 
    | 'at_drawer_bank' 
    | 'approved' 
    | 'rejected' 
    | 'flagged';

export interface ChequeItem {
    id: string;
    chequeNumber: string;
    amount: number;
    payeeName: string;
    drawerBankCode: string;      // Bank where the cheque account is (e.g., 'ibbl')
    drawerBankName: string;
    drawerAccount: string;
    presentingBankCode: string;  // Bank where cheque was deposited (e.g., 'sonali')
    presentingBankName: string;
    status: ChequeStatus;
    timestamp: string;
    flagReason?: string;
    assignedTo?: string;
}

const STORAGE_KEY = 'chequemate_global_cheques';

// Get all cheques
export const getAllCheques = (): ChequeItem[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

// Save all cheques
export const saveCheques = (cheques: ChequeItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cheques));
    // Dispatch event for real-time updates across components
    window.dispatchEvent(new CustomEvent('cheques_updated'));
};

// Add a new cheque
export const addCheque = (cheque: ChequeItem) => {
    const cheques = getAllCheques();
    cheques.unshift(cheque);
    saveCheques(cheques);
};

// Update cheque status
export const updateChequeStatus = (id: string, status: ChequeStatus, extra?: Partial<ChequeItem>) => {
    const cheques = getAllCheques();
    const updated = cheques.map(c => 
        c.id === id ? { ...c, status, ...extra } : c
    );
    saveCheques(updated);
};

// Get cheques for a specific bank's inward clearing (they are the presenting bank)
export const getInwardCheques = (bankCode: string): ChequeItem[] => {
    return getAllCheques().filter(c => c.presentingBankCode === bankCode);
};

// Get cheques for a specific bank's outward clearing (they are the drawer bank)
export const getOutwardCheques = (bankCode: string): ChequeItem[] => {
    return getAllCheques().filter(c => 
        c.drawerBankCode === bankCode && 
        ['at_drawer_bank', 'approved', 'rejected', 'flagged'].includes(c.status)
    );
};

// Get all flagged cheques (for manager)
export const getFlaggedCheques = (): ChequeItem[] => {
    return getAllCheques().filter(c => c.status === 'flagged');
};

// Assign cheque to reviewer
export const assignCheque = (id: string, assignee: string) => {
    const cheques = getAllCheques();
    const updated = cheques.map(c => 
        c.id === id ? { ...c, assignedTo: assignee } : c
    );
    saveCheques(updated);
};

