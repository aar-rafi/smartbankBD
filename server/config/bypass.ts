/**
 * Centralized Bypass Configuration for Demo/Hackathon
 * 
 * Control which validation checks to skip via environment variables.
 * Set DEMO_MODE=true to enable all bypasses, or control individually.
 */

// Master demo mode - enables all bypasses
const DEMO_MODE = process.env.DEMO_MODE === 'true';

export const BypassConfig = {
    // Individual bypass flags (can be overridden even when DEMO_MODE is false)
    
    /** Skip cheque date validation (stale/post-dated checks) */
    skipDateValidation: DEMO_MODE || process.env.BYPASS_DATE_CHECK === 'true',
    
    /** Skip MICR code integrity verification */
    skipMICRValidation: DEMO_MODE || process.env.BYPASS_MICR_CHECK === 'true',
    
    /** Skip AI-generated image detection */
    skipAIDetection: DEMO_MODE || process.env.BYPASS_AI_CHECK === 'true',
    
    /** Skip signature ML verification - NEVER bypass in demo, we want to show the model! */
    skipSignatureML: process.env.BYPASS_SIGNATURE_ML === 'true',
    
    /** Skip account existence check in DB */
    skipAccountCheck: process.env.BYPASS_ACCOUNT_CHECK === 'true',
    
    /** Skip cheque leaf/book status check */
    skipChequeStatusCheck: process.env.BYPASS_CHEQUE_STATUS === 'true',
    
    /** Skip funds availability check */
    skipFundsCheck: process.env.BYPASS_FUNDS_CHECK === 'true',
    
    /** Force specific demo cheques to pass basic checks (by account holder name pattern) 
     *  NOTE: MANSUR removed - we want to show full ML verification for that cheque */
    demoAccountPatterns: ['SWASTIKA', 'DEMO'],
};

/**
 * Check if a cheque should bypass validations based on account holder name
 */
export const isDemoCheque = (accountHolderName: string | undefined): boolean => {
    if (!accountHolderName) return false;
    const upperName = accountHolderName.toUpperCase();
    return BypassConfig.demoAccountPatterns.some(pattern => upperName.includes(pattern));
};

/**
 * Log bypass status on startup
 */
export const logBypassStatus = () => {
    console.log('\n=== Validation Bypass Configuration ===');
    console.log(`DEMO_MODE: ${DEMO_MODE ? 'ENABLED' : 'disabled'}`);
    console.log(`- Date Validation: ${BypassConfig.skipDateValidation ? 'BYPASSED' : 'active'}`);
    console.log(`- MICR Validation: ${BypassConfig.skipMICRValidation ? 'BYPASSED' : 'active'}`);
    console.log(`- AI Detection: ${BypassConfig.skipAIDetection ? 'BYPASSED' : 'active'}`);
    console.log(`- Signature ML: ${BypassConfig.skipSignatureML ? 'BYPASSED' : 'active'}`);
    console.log(`- Account Check: ${BypassConfig.skipAccountCheck ? 'BYPASSED' : 'active'}`);
    console.log(`- Cheque Status: ${BypassConfig.skipChequeStatusCheck ? 'BYPASSED' : 'active'}`);
    console.log(`- Funds Check: ${BypassConfig.skipFundsCheck ? 'BYPASSED' : 'active'}`);
    console.log(`- Demo Patterns: ${BypassConfig.demoAccountPatterns.join(', ')}`);
    console.log('========================================\n');
};

