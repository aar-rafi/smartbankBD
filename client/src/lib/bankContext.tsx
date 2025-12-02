import React, { createContext, useContext } from 'react';

export interface Bank {
    code: string;
    name: string;
    routingNumber: string;
}

export const BANKS: Record<string, Bank> = {
    'ibbl': { code: 'IBBL', name: 'Islami Bank Bangladesh Limited', routingNumber: '125155801' },
    'sonali': { code: 'SONALI', name: 'Sonali Bank Limited', routingNumber: '200270522' },
    'alpha': { code: 'BANK_A', name: 'Alpha Bank Ltd', routingNumber: '010123456' },
    'beta': { code: 'BANK_B', name: 'Beta Bank Ltd', routingNumber: '020234567' },
};

interface BankContextType {
    currentBank: Bank | null;
    isManager: boolean;
    allBanks: Bank[];
}

const BankContext = createContext<BankContextType>({
    currentBank: null,
    isManager: false,
    allBanks: Object.values(BANKS),
});

export const useBankContext = () => useContext(BankContext);

export const BankProvider: React.FC<{ bankCode: string | null; children: React.ReactNode }> = ({ bankCode, children }) => {
    const isManager = bankCode === null;
    const currentBank = bankCode ? BANKS[bankCode] || null : null;

    return (
        <BankContext.Provider value={{ currentBank, isManager, allBanks: Object.values(BANKS) }}>
            {children}
        </BankContext.Provider>
    );
};

