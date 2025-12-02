-- ============================================================
-- DEMO SEED DATA FOR CHEQUEMATE AI
-- Run this to set up demo data for both banks
-- ============================================================

-- 1. Insert Banks (IBBL and Sonali)
INSERT INTO banks (bank_code, bank_name, routing_number, bank_type)
VALUES 
    ('IBBL', 'Islami Bank Bangladesh Limited', '125155801', 'commercial'),
    ('SONALI', 'Sonali Bank Limited', '200260005', 'commercial')
ON CONFLICT (bank_code) DO UPDATE 
SET bank_name = EXCLUDED.bank_name, routing_number = EXCLUDED.routing_number;

-- 2. Insert Accounts

-- IBBL Account: A. H. M. MANSUR (drawer of the demo cheque)
WITH bank_info AS (
    SELECT bank_id FROM banks WHERE bank_code = 'IBBL'
)
INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status)
SELECT 
    bank_id, 
    '20503040200090711', 
    'A. H. M. MANSUR', 
    'current', 
    500000.00, 
    'active'
FROM bank_info
ON CONFLICT (account_number) DO UPDATE
SET balance = 500000.00, status = 'active';

-- IBBL Account: Another customer
WITH bank_info AS (
    SELECT bank_id FROM banks WHERE bank_code = 'IBBL'
)
INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status)
SELECT 
    bank_id, 
    '20503040200090712', 
    'KARIM AHMED', 
    'savings', 
    250000.00, 
    'active'
FROM bank_info
ON CONFLICT (account_number) DO UPDATE
SET balance = 250000.00, status = 'active';

-- Sonali Account: Mohammad Shahidullah (payee of the demo cheque)
WITH bank_info AS (
    SELECT bank_id FROM banks WHERE bank_code = 'SONALI'
)
INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status)
SELECT 
    bank_id, 
    '30100200300400', 
    'MOHAMMAD SHAHIDULLAH', 
    'savings', 
    100000.00, 
    'active'
FROM bank_info
ON CONFLICT (account_number) DO UPDATE
SET balance = 100000.00, status = 'active';

-- Sonali Account: Another customer
WITH bank_info AS (
    SELECT bank_id FROM banks WHERE bank_code = 'SONALI'
)
INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status)
SELECT 
    bank_id, 
    '30100200300401', 
    'FATIMA BEGUM', 
    'current', 
    350000.00, 
    'active'
FROM bank_info
ON CONFLICT (account_number) DO UPDATE
SET balance = 350000.00, status = 'active';

-- 3. Insert Reference Signature for MANSUR
WITH acc_info AS (
    SELECT account_id FROM accounts WHERE account_number = '20503040200090711'
)
INSERT INTO account_signatures (account_id, image_path, is_primary)
SELECT 
    account_id,
    '/signatures/mansur.png',
    true
FROM acc_info
ON CONFLICT DO NOTHING;

-- 4. Insert Cheque Book for MANSUR (Range 3566700 - 3566799)
WITH acc_info AS (
    SELECT account_id FROM accounts WHERE account_number = '20503040200090711'
)
INSERT INTO cheque_books (account_id, serial_start, serial_end, issued_date, status)
SELECT 
    account_id,
    3566700,
    3566799,
    '2023-01-01',
    'active'
FROM acc_info
WHERE NOT EXISTS (
    SELECT 1 FROM cheque_books cb 
    JOIN accounts a ON cb.account_id = a.account_id 
    WHERE a.account_number = '20503040200090711' AND serial_start = 3566700
);

-- 5. Insert Cheque Leaves (multiple cheques)
WITH book_info AS (
    SELECT cheque_book_id FROM cheque_books cb
    JOIN accounts a ON cb.account_id = a.account_id
    WHERE a.account_number = '20503040200090711' AND serial_start = 3566700
)
INSERT INTO cheque_leaves (cheque_book_id, cheque_number, status)
SELECT cheque_book_id, num, 'unused'
FROM book_info, generate_series(3566750, 3566760) AS num
ON CONFLICT (cheque_book_id, cheque_number) DO UPDATE
SET status = 'unused';

-- 6. Clean up any existing test cheques (for fresh demo)
DELETE FROM fraud_flags WHERE cheque_id IN (SELECT cheque_id FROM cheques WHERE cheque_number IN (3566753, 3566754, 3566755));
DELETE FROM deep_verifications WHERE cheque_id IN (SELECT cheque_id FROM cheques WHERE cheque_number IN (3566753, 3566754, 3566755));
DELETE FROM bb_clearings WHERE cheque_id IN (SELECT cheque_id FROM cheques WHERE cheque_number IN (3566753, 3566754, 3566755));
DELETE FROM initial_validations WHERE cheque_id IN (SELECT cheque_id FROM cheques WHERE cheque_number IN (3566753, 3566754, 3566755));
DELETE FROM cheques WHERE cheque_number IN (3566753, 3566754, 3566755);

-- Done!
SELECT 'Demo data seeded successfully!' as message;

-- Show what was created
SELECT 'Banks:' as info;
SELECT bank_code, bank_name FROM banks WHERE bank_code IN ('IBBL', 'SONALI');

SELECT 'Accounts:' as info;
SELECT a.account_number, a.holder_name, b.bank_code, a.balance 
FROM accounts a 
JOIN banks b ON a.bank_id = b.bank_id 
WHERE b.bank_code IN ('IBBL', 'SONALI');

