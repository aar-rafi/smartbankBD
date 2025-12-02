-- ============================================================
-- TRANSACTIONS SEED DATA (Ledger) - Enhanced for Fraud Detection
-- Run after 14_settlements.sql
-- 20 transactions with receiver info, time patterns, branch data
-- ============================================================

INSERT INTO transactions (
    transaction_id, settlement_id, cheque_id, account_id, 
    txn_type, amount, balance_after,
    receiver_name, receiver_account, receiver_label,
    txn_date, txn_time, branch_code, branch_name,
    txn_number, created_at
) VALUES

-- ==================== ALICE (account_id=1) - 5 transactions ====================
-- Regular utility payments, weekday business hours
(1, NULL, NULL, 1, 'debit', 5000.00, 70000.00,
 'Dhaka Electric Supply', '9999-DESCO-01', 'regular',
 '2024-06-01', '10:30:00', 'ALPHA-DHNK-01', 'Alpha Bank Dhanmondi',
 1, '2024-06-01 10:30:00+06'),

(2, NULL, NULL, 1, 'debit', 2500.00, 67500.00,
 'Grameenphone Ltd', '9999-GP-001', 'regular',
 '2024-06-15', '11:00:00', 'ALPHA-DHNK-01', 'Alpha Bank Dhanmondi',
 2, '2024-06-15 11:00:00+06'),

(3, NULL, NULL, 1, 'debit', 15000.00, 52500.00,
 'Family Transfer - Rahman', '1001-00099', 'regular',
 '2024-07-01', '14:30:00', 'ALPHA-DHNK-01', 'Alpha Bank Dhanmondi',
 3, '2024-07-01 14:30:00+06'),

(4, 1, 1, 1, 'debit', 25000.00, 50000.00,
 'Carol Ahmed', '2001-00001', 'unique',
 '2024-07-15', '15:00:00', 'ALPHA-DHNK-01', 'Alpha Bank Dhanmondi',
 4, '2024-07-15 15:00:00+06'),

(5, 5, 5, 1, 'credit', 150000.00, 200000.00,
 'Eve Hossain', '2001-00003', 'unique',
 '2024-06-15', '15:00:00', 'ALPHA-DHNK-01', 'Alpha Bank Dhanmondi',
 5, '2024-06-15 15:00:00+06'),

-- ==================== BOB (account_id=2) - 5 transactions ====================
-- Business owner, higher amounts, varied payees
(6, NULL, NULL, 2, 'debit', 35000.00, 115000.00,
 'Supplier ABC Ltd', '8888-SUP-001', 'regular',
 '2024-08-05', '09:30:00', 'ALPHA-GULN-02', 'Alpha Bank Gulshan',
 1, '2024-08-05 09:30:00+06'),

(7, NULL, NULL, 2, 'debit', 50000.00, 100000.00,
 'Office Rent - Landlord', '7777-RENT-01', 'regular',
 '2024-08-15', '10:00:00', 'ALPHA-GULN-02', 'Alpha Bank Gulshan',
 2, '2024-08-15 10:00:00+06'),

(8, NULL, NULL, 2, 'debit', 25000.00, 125000.00,
 'Staff Salary - Karim', '1001-00050', 'regular',
 '2024-09-01', '11:30:00', 'ALPHA-GULN-02', 'Alpha Bank Gulshan',
 3, '2024-09-01 11:30:00+06'),

(9, 2, 2, 2, 'debit', 45000.00, 105000.00,
 'David Khan', '2001-00002', 'unique',
 '2024-09-20', '14:00:00', 'ALPHA-GULN-02', 'Alpha Bank Gulshan',
 4, '2024-09-20 14:00:00+06'),

(10, NULL, NULL, 2, 'debit', 120000.00, 30000.00,
 'New Vendor XYZ', '5555-NEW-99', 'unique',
 '2024-10-01', '16:45:00', 'ALPHA-GULN-02', 'Alpha Bank Gulshan',
 5, '2024-10-01 16:45:00+06'),

-- ==================== CAROL (account_id=3) - 4 transactions ====================
-- High net worth, large regular payments
(11, NULL, NULL, 3, 'debit', 100000.00, 400000.00,
 'Investment Fund Alpha', '6666-INV-01', 'regular',
 '2024-01-10', '10:00:00', 'BETA-BANG-01', 'Beta Bank Banani',
 1, '2024-01-10 10:00:00+06'),

(12, 3, 3, 3, 'debit', 200000.00, 300000.00,
 'Eve Hossain', '2001-00003', 'unique',
 '2024-02-10', '13:00:00', 'BETA-BANG-01', 'Beta Bank Banani',
 2, '2024-02-10 13:00:00+06'),

(13, 1, 1, 3, 'credit', 25000.00, 525000.00,
 'Alice Rahman', '1001-00001', 'unique',
 '2024-07-15', '15:00:00', 'BETA-BANG-01', 'Beta Bank Banani',
 3, '2024-07-15 15:00:00+06'),

(14, NULL, NULL, 3, 'debit', 75000.00, 450000.00,
 'Property Tax Payment', '9999-GOVT-01', 'regular',
 '2024-08-01', '11:30:00', 'BETA-BANG-01', 'Beta Bank Banani',
 4, '2024-08-01 11:30:00+06'),

-- ==================== DAVID (account_id=4) - 3 transactions ====================
-- Irregular patterns, varied times
(15, 2, 2, 4, 'credit', 45000.00, 295000.00,
 'Bob Chowdhury', '1001-00002', 'unique',
 '2024-09-20', '14:00:00', 'BETA-UTTARA-02', 'Beta Bank Uttara',
 1, '2024-09-20 14:00:00+06'),

(16, NULL, NULL, 4, 'debit', 80000.00, 215000.00,
 'Online Shopping - Daraz', '8888-DARAZ-01', 'regular',
 '2024-10-05', '19:30:00', 'BETA-UTTARA-02', 'Beta Bank Uttara',
 2, '2024-10-05 19:30:00+06'),

(17, NULL, NULL, 4, 'debit', 15000.00, 200000.00,
 'Restaurant - Takeout', '7777-REST-01', 'unique',
 '2024-10-20', '21:00:00', 'BETA-UTTARA-02', 'Beta Bank Uttara',
 3, '2024-10-20 21:00:00+06'),

-- ==================== EVE (account_id=5) - 3 transactions ====================
-- Corporate executive, large amounts, business hours
(18, 3, 3, 5, 'credit', 200000.00, 1200000.00,
 'Carol Ahmed', '2001-00001', 'unique',
 '2024-02-10', '13:00:00', 'BETA-MOTI-03', 'Beta Bank Motijheel',
 1, '2024-02-10 13:00:00+06'),

(19, 5, 5, 5, 'debit', 150000.00, 850000.00,
 'Alice Rahman', '1001-00001', 'unique',
 '2024-06-15', '15:00:00', 'BETA-MOTI-03', 'Beta Bank Motijheel',
 2, '2024-06-15 15:00:00+06'),

(20, NULL, NULL, 5, 'debit', 500000.00, 500000.00,
 'Company Investment Account', '9999-CORP-01', 'regular',
 '2024-07-01', '10:00:00', 'BETA-MOTI-03', 'Beta Bank Motijheel',
 3, '2024-07-01 10:00:00+06')

ON CONFLICT (transaction_id) DO UPDATE SET
    settlement_id = EXCLUDED.settlement_id,
    cheque_id = EXCLUDED.cheque_id,
    account_id = EXCLUDED.account_id,
    txn_type = EXCLUDED.txn_type,
    amount = EXCLUDED.amount,
    balance_after = EXCLUDED.balance_after,
    receiver_name = EXCLUDED.receiver_name,
    receiver_account = EXCLUDED.receiver_account,
    receiver_label = EXCLUDED.receiver_label,
    txn_date = EXCLUDED.txn_date,
    txn_time = EXCLUDED.txn_time,
    branch_code = EXCLUDED.branch_code,
    branch_name = EXCLUDED.branch_name,
    txn_number = EXCLUDED.txn_number,
    created_at = EXCLUDED.created_at;

-- Reset sequence
SELECT setval('transactions_transaction_id_seq', (SELECT MAX(transaction_id) FROM transactions));
