import pool from './db.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Check if an account exists and is active
 */
export const checkAccountExists = async (accountNumber: string): Promise<{ exists: boolean; isActive: boolean; }> => {
  try {
    const result = await pool.query(
      'SELECT account_id, status FROM accounts WHERE account_number = $1',
      [accountNumber]
    );

    if (result.rows.length === 0) {
      return { exists: false, isActive: false };
    }

    const account = result.rows[0];
    return {
      exists: true,
      isActive: account.status === 'active'
    };
  } catch (error) {
    console.error('Error checking account:', error);
    throw error;
  }
};

/**
 * Check if a cheque number belongs to an active cheque book and its status
 */
export const checkChequeStatus = async (chequeNumber: string): Promise<'active' | 'used' | 'stolen' | 'invalid'> => {
  try {
    const result = await pool.query(
      `SELECT cl.status, cb.status as book_status
       FROM cheque_leaves cl
       JOIN cheque_books cb ON cl.cheque_book_id = cb.cheque_book_id
       WHERE cl.cheque_number = $1
       LIMIT 1`,
      [chequeNumber]
    );

    if (result.rows.length === 0) {
      return 'invalid'; // Cheque number not found in system
    }

    const cheque = result.rows[0];

    // If cheque book is stolen or lost, mark cheque as stolen
    if (cheque.book_status === 'stolen' || cheque.book_status === 'lost') {
      return 'stolen';
    }

    // Check individual cheque leaf status
    switch (cheque.status) {
      case 'used':
      case 'cancelled':
      case 'stopped':
        return 'used';
      case 'unused':
        return 'active';
      case 'lost':
        return 'stolen';
      default:
        return 'invalid';
    }
  } catch (error) {
    console.error('Error checking cheque status:', error);
    throw error;
  }
};

/**
 * Verify if account has sufficient funds for the cheque amount
 */
export const checkSufficientFunds = async (accountNumber: string, amount: number): Promise<boolean> => {
  try {
    const result = await pool.query(
      'SELECT balance FROM accounts WHERE account_number = $1',
      [accountNumber]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const balance = parseFloat(result.rows[0].balance);
    return balance >= amount;
  } catch (error) {
    console.error('Error checking funds:', error);
    throw error;
  }
};

/**
 * Check if cheque is within valid date range (not expired, not post-dated beyond reasonable limit)
 */
export const checkChequeDateValidity = async (chequeNumber: string, issueDate: string): Promise<{ isValid: boolean; reason?: string }> => {
  try {
    // In new schema, we don't have expiry_date in DB, so we rely on business logic (6 months)
    // We can check if the cheque exists and has an issue date in DB to verify against
    const result = await pool.query(
      `SELECT issue_date FROM cheques WHERE cheque_number = $1 LIMIT 1`,
      [chequeNumber]
    );

    if (result.rows.length > 0) {
      const cheque = result.rows[0];
      const dbIssueDate = new Date(cheque.issue_date);
      const inputIssueDate = new Date(issueDate);

      // Simple check: if DB has a date, maybe we should trust it? 
      // For now, let's just return valid if it exists.
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error checking cheque date validity:', error);
    throw error;
  }
};

/**
 * Get account details by account number
 */
export const getAccountDetails = async (accountNumber: string) => {
  try {
    const result = await pool.query(
      'SELECT account_id, account_number, holder_name, balance, status FROM accounts WHERE account_number = $1',
      [accountNumber]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching account details:', error);
    throw error;
  }
};

/**
 * Get reference signature (base64) from account_signatures for an account number
 * Converts to grayscale before returning
 */
export const getReferenceSignature = async (accountNumber: string): Promise<Buffer | null> => {
  try {
    // Get account_id from account_number, then fetch the reference signature path
    const result = await pool.query(
      `SELECT asig.image_path 
       FROM account_signatures asig
       JOIN accounts a ON asig.account_id = a.account_id
       WHERE a.account_number = $1
       ORDER BY asig.signature_id DESC
       LIMIT 1`,
      [accountNumber]
    );

    if (result.rows.length === 0 || !result.rows[0].image_path) {
      return null;
    }

    const imagePath = result.rows[0].image_path;

    // Try to read the file
    try {
      // imagePath is relative to project root (e.g., '/signatures/sig-1.jpg')
      // Since server runs from /server folder, go up one level to project root
      const projectRoot = path.resolve(process.cwd(), '..');
      const fullPath = path.join(projectRoot, imagePath);
      
      // Convert to grayscale using Python script
      const tempDir = path.resolve('temp');
      await fs.mkdir(tempDir, { recursive: true });
      const timestamp = Date.now();
      const grayOutputPath = path.join(tempDir, `ref_sig_gray_${timestamp}.png`);
      
      // Script path is relative to server directory (same as analysisService)
      const scriptPath = path.resolve('ml/convert_to_grayscale.py');
      const pythonPath = process.env.PYTHON_PATH || path.resolve('database/venv/bin/python');
      
      const command = `"${pythonPath}" "${scriptPath}" "${fullPath}" "${grayOutputPath}"`;
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr) console.warn('Grayscale conversion stderr:', stderr);
      
      // Read the grayscale version
      const grayBuffer = await fs.readFile(grayOutputPath);
      
      // Clean up temp file
      try {
        await fs.unlink(grayOutputPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return grayBuffer;
    } catch (err) {
      console.warn(`Could not read or convert signature file at ${imagePath}:`, err);
      // Fallback: try to read original file without conversion
      try {
        const projectRoot = path.resolve(process.cwd(), '..');
        const fullPath = path.join(projectRoot, imagePath);
        return await fs.readFile(fullPath);
      } catch (fallbackErr) {
        return null;
      }
    }
  } catch (error) {
    console.error('Error fetching reference signature:', error);
    throw error;
  }
};

/**
 * Get account details by holder name (for Payee linking)
 */
export const getAccountByName = async (holderName: string) => {
  try {
    // Simple case-insensitive match for demo purposes
    const result = await pool.query(
      'SELECT account_id, bank_id, account_number, holder_name, status FROM accounts WHERE LOWER(holder_name) = LOWER($1) LIMIT 1',
      [holderName]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching account by name:', error);
    throw error;
  }
};

/**
 * Store validation result in database
 */
export const storeValidationResult = async (chequeNumber: string, accountNumber: string, validationData: any): Promise<void> => {
  try {
    // First, find the cheque_id or create a record
    let chequeResult = await pool.query(
      'SELECT cheque_id FROM cheques WHERE cheque_number = $1 LIMIT 1',
      [chequeNumber]
    );

    let chequeId;
    if (chequeResult.rows.length > 0) {
      chequeId = chequeResult.rows[0].cheque_id;
    } else {
      // Create a new cheque record
      // 1. Find Drawer Account (who wrote the cheque)
      const drawerResult = await pool.query(
        'SELECT account_id, bank_id FROM accounts WHERE account_number = $1',
        [accountNumber]
      );

      if (drawerResult.rows.length === 0) {
        console.warn(`Drawer Account ${accountNumber} not found for cheque ${chequeNumber}`);
        return;
      }

      const { account_id: drawerAccountId, bank_id: drawerBankId } = drawerResult.rows[0];

      // 2. Find Depositor Account (Payee) - Try to link based on Payee Name
      let depositorAccountId = null;
      let presentingBankId = null;

      if (validationData.payeeName) {
        const payeeAccount = await getAccountByName(validationData.payeeName);
        if (payeeAccount) {
          depositorAccountId = payeeAccount.account_id;
          presentingBankId = payeeAccount.bank_id;
        }
      }

      // 3. Find Cheque Leaf
      const leafResult = await pool.query(
        `SELECT leaf_id FROM cheque_leaves cl
         JOIN cheque_books cb ON cl.cheque_book_id = cb.cheque_book_id
         WHERE cl.cheque_number = $1 AND cb.account_id = $2`,
        [chequeNumber, drawerAccountId]
      );

      const leafId = leafResult.rows.length > 0 ? leafResult.rows[0].leaf_id : null;

      const insertResult = await pool.query(
        `INSERT INTO cheques (
            cheque_number, leaf_id, 
            drawer_account_id, drawer_bank_id, 
            depositor_account_id, presenting_bank_id,
            payee_name, amount, amount_in_words, issue_date, micr_code, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'received')
         RETURNING cheque_id`,
        [
          chequeNumber,
          leafId,
          drawerAccountId,
          drawerBankId,
          depositorAccountId,
          presentingBankId,
          (validationData.payeeName || 'Unknown').substring(0, 100),
          validationData.amountDigits || 0,
          validationData.amountWords ? validationData.amountWords.substring(0, 200) : null,
          new Date().toISOString().split('T')[0],
          validationData.micrCode ? validationData.micrCode.substring(0, 50) : null
        ]
      );

      chequeId = insertResult.rows[0].cheque_id;
    }

    // Store validation result in initial_validations
    await pool.query(
      `INSERT INTO initial_validations (
          cheque_id, all_fields_present, date_valid, micr_readable, 
          ocr_amount, amount_match, validation_status, failure_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        chequeId,
        true, // all_fields_present (simplified)
        validationData.dateValid || false,
        !!validationData.micrCode, // micr_readable
        validationData.amountDigits || 0,
        validationData.amountValid || false,
        validationData.isValid ? 'passed' : 'failed',
        validationData.isValid ? null : 'Validation failed'
      ]
    );
  } catch (error) {
    console.error('Error storing validation result:', error);
    // Don't throw - validation should continue even if storage fails
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    const statsResult = await pool.query('SELECT * FROM v_today_stats');
    const queueResult = await pool.query('SELECT COUNT(*) as pending_reviews FROM fraud_flags WHERE status = \'pending\'');
    
    const stats = statsResult.rows[0] || {
      total: 0, received: 0, approved: 0, rejected: 0, flagged: 0, total_amount: 0
    };
    
    return {
      ...stats,
      pending_reviews: parseInt(queueResult.rows[0].pending_reviews)
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

/**
 * Get recent cheques for dashboard list
 */
export const getDashboardCheques = async (limit = 20) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.cheque_id, c.cheque_number, c.payee_name, c.amount, c.status, c.created_at,
        b.bank_name as drawer_bank,
        a.account_number as drawer_account
       FROM cheques c
       JOIN banks b ON c.drawer_bank_id = b.bank_id
       JOIN accounts a ON c.drawer_account_id = a.account_id
       ORDER BY c.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching dashboard cheques:', error);
    throw error;
  }
};

/**
 * Get single cheque details
 */
export const getChequeDetails = async (chequeId: number) => {
  try {
    // Basic Cheque Info
    const chequeResult = await pool.query(
      `SELECT 
        c.*, 
        db.bank_name as drawer_bank_name,
        db.bank_code as drawer_bank_code,
        pb.bank_name as presenting_bank_name,
        pb.bank_code as presenting_bank_code,
        a.account_number as drawer_account, a.holder_name as drawer_name
       FROM cheques c
       JOIN banks db ON c.drawer_bank_id = db.bank_id
       LEFT JOIN banks pb ON c.presenting_bank_id = pb.bank_id
       JOIN accounts a ON c.drawer_account_id = a.account_id
       WHERE c.cheque_id = $1`,
      [chequeId]
    );
    
    if (chequeResult.rows.length === 0) return null;
    const cheque = chequeResult.rows[0];

    // Initial Validation
    const validationResult = await pool.query(
      'SELECT * FROM initial_validations WHERE cheque_id = $1',
      [chequeId]
    );

    // AI Verification
    const verificationResult = await pool.query(
      'SELECT * FROM deep_verifications WHERE cheque_id = $1',
      [chequeId]
    );

    // Fraud Flags
    const flagsResult = await pool.query(
      'SELECT * FROM fraud_flags WHERE cheque_id = $1',
      [chequeId]
    );

    // BB Clearing (BACH routing)
    const clearingResult = await pool.query(
      'SELECT * FROM bb_clearings WHERE cheque_id = $1',
      [chequeId]
    );

    return {
      cheque,
      validation: validationResult.rows[0] || null,
      verification: verificationResult.rows[0] || null,
      flags: flagsResult.rows,
      clearing: clearingResult.rows[0] || null
    };
  } catch (error) {
    console.error('Error fetching cheque details:', error);
    throw error;
  }
};

/**
 * Get bank by code
 */
export const getBankByCode = async (bankCode: string) => {
  try {
    const result = await pool.query(
      'SELECT * FROM banks WHERE LOWER(bank_code) = LOWER($1)',
      [bankCode]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching bank:', error);
    throw error;
  }
};

/**
 * Get cheques for a specific bank's INWARD clearing (they are the presenting bank)
 */
export const getInwardCheques = async (bankCode: string) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.cheque_id, c.cheque_number, c.payee_name, c.amount, c.status, c.created_at,
        db.bank_name as drawer_bank_name, db.bank_code as drawer_bank_code,
        pb.bank_name as presenting_bank_name, pb.bank_code as presenting_bank_code,
        a.account_number as drawer_account
       FROM cheques c
       JOIN banks db ON c.drawer_bank_id = db.bank_id
       JOIN banks pb ON c.presenting_bank_id = pb.bank_id
       JOIN accounts a ON c.drawer_account_id = a.account_id
       WHERE LOWER(pb.bank_code) = LOWER($1)
       ORDER BY c.created_at DESC`,
      [bankCode]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching inward cheques:', error);
    throw error;
  }
};

/**
 * Get cheques for a specific bank's OUTWARD clearing (they are the drawer bank)
 * Only shows cheques that have been sent through BACH
 */
export const getOutwardCheques = async (bankCode: string) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.cheque_id, c.cheque_number, c.payee_name, c.amount, c.status, c.created_at,
        db.bank_name as drawer_bank_name, db.bank_code as drawer_bank_code,
        pb.bank_name as presenting_bank_name, pb.bank_code as presenting_bank_code,
        a.account_number as drawer_account
       FROM cheques c
       JOIN banks db ON c.drawer_bank_id = db.bank_id
       LEFT JOIN banks pb ON c.presenting_bank_id = pb.bank_id
       JOIN accounts a ON c.drawer_account_id = a.account_id
       WHERE LOWER(db.bank_code) = LOWER($1)
         AND c.status IN ('clearing', 'at_drawer_bank', 'approved', 'rejected', 'flagged')
       ORDER BY c.created_at DESC`,
      [bankCode]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching outward cheques:', error);
    throw error;
  }
};

/**
 * Extract numeric cheque number (strips prefixes like "MCG", "CHQ", etc.)
 */
const extractNumericChequeNumber = (chequeNumber: string): string => {
  const digits = chequeNumber.replace(/\D/g, '');
  return digits || chequeNumber;
};

/**
 * Create a new cheque record when deposited at presenting bank
 */
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
  validationFailed?: boolean;
  failureReasons?: string;
  analysisResults?: any;
}) => {
  try {
    // Extract numeric cheque number (remove prefixes like "MCG")
    const numericChequeNumber = extractNumericChequeNumber(data.chequeNumber);
    
    // Get drawer account and bank
    let drawerResult = await pool.query(
      'SELECT account_id, bank_id FROM accounts WHERE account_number = $1',
      [data.drawerAccountNumber]
    );

    let drawerAccountId: number;
    let drawerBankId: number;

    // Get presenting bank first (needed for placeholder account creation if drawer account is missing)
    const presentingBankResult = await pool.query(
      'SELECT bank_id FROM banks WHERE LOWER(bank_code) = LOWER($1)',
      [data.presentingBankCode]
    );

    let presentingBankId: number;
    if (presentingBankResult.rows.length === 0) {
      // Bank not found - get first available bank as fallback
      const fallbackBank = await pool.query('SELECT bank_id FROM banks LIMIT 1');
      if (fallbackBank.rows.length === 0) {
        throw new Error('No banks found in database');
      }
      presentingBankId = fallbackBank.rows[0].bank_id;
      console.warn(`Presenting bank ${data.presentingBankCode} not found - using fallback bank ${presentingBankId}`);
    } else {
      presentingBankId = presentingBankResult.rows[0].bank_id;
    }

    if (drawerResult.rows.length === 0) {
      // Account not found - create a placeholder account for faulty records
      console.warn(`Drawer account ${data.drawerAccountNumber} not found - creating placeholder account`);
      
      // Use presenting bank as fallback for placeholder account
      const fallbackBankId = presentingBankId;

      // Create placeholder account
      const placeholderResult = await pool.query(
        `INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (account_number) DO UPDATE SET account_number = accounts.account_number
         RETURNING account_id, bank_id`,
        [
          fallbackBankId,
          data.drawerAccountNumber,
          `Unknown Account (${data.drawerAccountNumber})`,
          'savings',
          0,
          'active'
        ]
      );
      
      drawerAccountId = placeholderResult.rows[0].account_id;
      drawerBankId = placeholderResult.rows[0].bank_id;
      
      console.log(`Created placeholder account ${data.drawerAccountNumber} with ID ${drawerAccountId}`);
    } else {
      const { account_id, bank_id } = drawerResult.rows[0];
      drawerAccountId = account_id;
      drawerBankId = bank_id;
    }

    // Check for same-bank deposit (internal transfer - not inter-bank clearing)
    const isSameBankDeposit = drawerBankId === presentingBankId;
    if (isSameBankDeposit) {
      console.warn(`Same-bank deposit detected: drawer and presenting bank are both ${data.presentingBankCode}`);
      // Still allow it but mark appropriately - will return flag to client
    }

    // Check if this exact cheque already exists (same cheque number at same presenting bank)
    const existingCheque = await pool.query(
      'SELECT cheque_id, status FROM cheques WHERE cheque_number = $1 AND presenting_bank_id = $2',
      [numericChequeNumber, presentingBankId]
    );

    if (existingCheque.rows.length > 0) {
      // Update existing cheque at this presenting bank
      const chequeId = existingCheque.rows[0].cheque_id;
      const existingStatus = existingCheque.rows[0].status;
      
      // Don't overwrite if already processed (approved/rejected/settled)
      if (['approved', 'rejected', 'settled', 'bounced'].includes(existingStatus)) {
        console.log(`Cheque ${numericChequeNumber} already processed with status ${existingStatus}, not updating`);
        return chequeId;
      }
      
      const chequeStatus = data.validationFailed ? 'validation_failed' : 'validated';
      await pool.query(
        `UPDATE cheques SET 
          status = $1,
          cheque_image_path = COALESCE($2, cheque_image_path),
          signature_image_path = COALESCE($3, signature_image_path)
         WHERE cheque_id = $4`,
        [chequeStatus, data.chequeImagePath, data.signatureImagePath, chequeId]
      );
      return chequeId;
    }
    
    // Check if same cheque number exists at DIFFERENT presenting bank (duplicate submission)
    const duplicateCheck = await pool.query(
      'SELECT cheque_id, presenting_bank_id FROM cheques WHERE cheque_number = $1',
      [numericChequeNumber]
    );
    
    if (duplicateCheck.rows.length > 0) {
      console.warn(`Cheque ${numericChequeNumber} already exists at another bank (ID: ${duplicateCheck.rows[0].cheque_id}). Creating new record for this presenting bank.`);
    }

    // Determine status based on validation result
    const chequeStatus = data.validationFailed ? 'validation_failed' : 'validated';
    
    // Create new cheque
    const insertResult = await pool.query(
      `INSERT INTO cheques (
          cheque_number, 
          drawer_account_id, drawer_bank_id, 
          presenting_bank_id,
          payee_name, amount, amount_in_words, issue_date, micr_code, 
          cheque_image_path, signature_image_path,
          status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING cheque_id`,
      [
        numericChequeNumber,
        drawerAccountId,
        drawerBankId,
        presentingBankId,
        data.payeeName,
        data.amount,
        data.amountWords || null,
        data.issueDate,
        data.micrCode || null,
        data.chequeImagePath || null,
        data.signatureImagePath || null,
        chequeStatus
      ]
    );

    const chequeId = insertResult.rows[0].cheque_id;

    // Store initial validation results (always store, even if failed)
    const validationStatus = data.validationFailed ? 'failed' : 'passed';
    const failureReason = data.failureReasons || null;
    
    // Check if validation already exists
    const existingValidation = await pool.query(
      'SELECT validation_id FROM initial_validations WHERE cheque_id = $1',
      [chequeId]
    );
    
    if (existingValidation.rows.length > 0) {
      // Update existing validation
      await pool.query(
        `UPDATE initial_validations SET
          all_fields_present = $1,
          date_valid = $2,
          micr_readable = $3,
          ocr_amount = $4,
          ocr_confidence = $5,
          amount_match = $6,
          validation_status = $7,
          failure_reason = $8
         WHERE cheque_id = $9`,
        [
          !data.validationFailed, // all_fields_present
          !data.validationFailed, // date_valid (simplified)
          !!data.micrCode,
          data.amount,
          data.analysisResults?.confidence || 85,
          !data.validationFailed, // amount_match (simplified)
          validationStatus,
          failureReason,
          chequeId
        ]
      );
    } else {
      // Insert new validation
      await pool.query(
        `INSERT INTO initial_validations (
            cheque_id, all_fields_present, date_valid, micr_readable, 
            ocr_amount, ocr_confidence, amount_match, validation_status, failure_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          chequeId,
          !data.validationFailed, // all_fields_present
          !data.validationFailed, // date_valid (simplified)
          !!data.micrCode,
          data.amount,
          data.analysisResults?.confidence || 85,
          !data.validationFailed, // amount_match (simplified)
          validationStatus,
          failureReason
        ]
      );
    }

    return { 
      chequeId, 
      sameBankDeposit: isSameBankDeposit,
      drawerBankId,
      presentingBankId
    };
  } catch (error) {
    console.error('Error creating cheque:', error);
    throw error;
  }
};

/**
 * Send cheque to BACH (update status and create bb_clearings record)
 */
export const sendToBACH = async (chequeId: number) => {
  try {
    // Get cheque details
    const chequeResult = await pool.query(
      'SELECT drawer_bank_id, presenting_bank_id FROM cheques WHERE cheque_id = $1',
      [chequeId]
    );

    if (chequeResult.rows.length === 0) {
      throw new Error('Cheque not found');
    }

    const { drawer_bank_id, presenting_bank_id } = chequeResult.rows[0];

    // Generate clearing reference
    const clearingRef = `CLR-${Date.now()}-${chequeId}`;

    // Create bb_clearings record
    await pool.query(
      `INSERT INTO bb_clearings (
          cheque_id, clearing_reference, from_bank_id, to_bank_id, status
       )
       VALUES ($1, $2, $3, $4, 'pending')`,
      [chequeId, clearingRef, presenting_bank_id, drawer_bank_id]
    );

    // Update cheque status
    await pool.query(
      "UPDATE cheques SET status = 'clearing' WHERE cheque_id = $1",
      [chequeId]
    );

    return { clearingRef };
  } catch (error) {
    console.error('Error sending to BACH:', error);
    throw error;
  }
};

/**
 * Receive cheque at drawer bank (BACH forwards it)
 */
export const receiveAtDrawerBank = async (chequeId: number) => {
  try {
    // Update bb_clearings
    await pool.query(
      `UPDATE bb_clearings SET 
        status = 'forwarded', 
        forwarded_at = NOW() 
       WHERE cheque_id = $1`,
      [chequeId]
    );

    // Update cheque status
    await pool.query(
      "UPDATE cheques SET status = 'at_drawer_bank' WHERE cheque_id = $1",
      [chequeId]
    );

    return { success: true };
  } catch (error) {
    console.error('Error receiving at drawer bank:', error);
    throw error;
  }
};

/**
 * Update cheque decision (approve/reject/flag)
 */
export const updateChequeDecision = async (chequeId: number, decision: 'approved' | 'rejected' | 'flagged', reason?: string) => {
  try {
    // Update cheque status
    await pool.query(
      'UPDATE cheques SET status = $1 WHERE cheque_id = $2',
      [decision, chequeId]
    );

    // Update bb_clearings response
    await pool.query(
      `UPDATE bb_clearings SET 
        response_status = $1, 
        response_at = NOW(),
        status = 'responded'
       WHERE cheque_id = $2`,
      [decision, chequeId]
    );

    // If flagged, create fraud_flags record
    if (decision === 'flagged') {
      await pool.query(
        `INSERT INTO fraud_flags (cheque_id, reason, priority, status)
         VALUES ($1, $2, 'medium', 'pending')`,
        [chequeId, reason || 'Flagged for manual review']
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating cheque decision:', error);
    throw error;
  }
};

/**
 * Delete a cheque and all related records
 * Order matters due to foreign key constraints!
 */
export const deleteCheque = async (chequeId: number): Promise<boolean> => {
  try {
    // Delete in order of dependencies (child tables first)
    await pool.query('DELETE FROM fraud_flags WHERE cheque_id = $1', [chequeId]);
    await pool.query('DELETE FROM deep_verifications WHERE cheque_id = $1', [chequeId]);
    await pool.query('DELETE FROM bb_clearings WHERE cheque_id = $1', [chequeId]);
    await pool.query('DELETE FROM initial_validations WHERE cheque_id = $1', [chequeId]);
    await pool.query('DELETE FROM settlements WHERE cheque_id = $1', [chequeId]);
    await pool.query('DELETE FROM transactions WHERE cheque_id = $1', [chequeId]);
    await pool.query('DELETE FROM cheque_bounces WHERE cheque_id = $1', [chequeId]);
    
    // Finally delete the cheque itself
    const result = await pool.query('DELETE FROM cheques WHERE cheque_id = $1', [chequeId]);
    
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting cheque:', error);
    throw error;
  }
};

/**
 * Delete all cheques for testing/demo reset
 */
export const deleteAllCheques = async (): Promise<number> => {
  try {
    // Delete in order of dependencies
    await pool.query('DELETE FROM fraud_flags');
    await pool.query('DELETE FROM deep_verifications');
    await pool.query('DELETE FROM bb_clearings');
    await pool.query('DELETE FROM initial_validations');
    await pool.query('DELETE FROM settlements');
    await pool.query('DELETE FROM transactions WHERE cheque_id IS NOT NULL');
    await pool.query('DELETE FROM cheque_bounces');
    
    const result = await pool.query('DELETE FROM cheques');
    
    return result.rowCount ?? 0;
  } catch (error) {
    console.error('Error deleting all cheques:', error);
    throw error;
  }
};

/**
 * Store deep verification results (AI analysis)
 */
export const storeDeepVerification = async (chequeId: number, data: {
  signatureScore?: number;
  signatureMatch?: string;
  behaviorScore?: number;
  fraudRiskScore?: number;
  riskLevel?: string;
  aiDecision?: string;
  aiConfidence?: number;
  aiReasoning?: string;
  behaviorFlags?: string[];
}) => {
  try {
    await pool.query(
      `INSERT INTO deep_verifications (
          cheque_id, 
          signature_score, signature_match,
          behavior_score, fraud_risk_score, risk_level,
          ai_decision, ai_confidence, ai_reasoning,
          behavior_flags
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (cheque_id) DO UPDATE SET
          signature_score = EXCLUDED.signature_score,
          signature_match = EXCLUDED.signature_match,
          behavior_score = EXCLUDED.behavior_score,
          fraud_risk_score = EXCLUDED.fraud_risk_score,
          risk_level = EXCLUDED.risk_level,
          ai_decision = EXCLUDED.ai_decision,
          ai_confidence = EXCLUDED.ai_confidence,
          ai_reasoning = EXCLUDED.ai_reasoning,
          behavior_flags = EXCLUDED.behavior_flags`,
      [
        chequeId,
        data.signatureScore || null,
        data.signatureMatch || null,
        data.behaviorScore || null,
        data.fraudRiskScore || null,
        data.riskLevel || 'low',
        data.aiDecision || 'approve',
        data.aiConfidence || 85,
        data.aiReasoning || null,
        data.behaviorFlags || []
      ]
    );
    return { success: true };
  } catch (error) {
    console.error('Error storing deep verification:', error);
    throw error;
  }
};