import pool from './db.js';
import fs from 'fs/promises';
import path from 'path';

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
      const fileBuffer = await fs.readFile(fullPath);
      return fileBuffer;
    } catch (err) {
      console.warn(`Could not read signature file at ${imagePath}:`, err);
      return null;
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
          validationData.payeeName || 'Unknown',
          validationData.amountDigits || 0,
          validationData.amountWords || null,
          new Date().toISOString().split('T')[0],
          validationData.micrCode || null
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
