-- 1. Insert Bank (Islami Bank Bangladesh Limited)
INSERT INTO banks (bank_code, bank_name, routing_number, bank_type)
VALUES ('IBBL', 'Islami Bank Bangladesh Limited', '125155801', 'commercial')
ON CONFLICT (bank_code) DO UPDATE 
SET routing_number = EXCLUDED.routing_number;

-- 2. Insert Drawer Account (A. H. M. MANSUR)
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

-- 3. Insert Cheque Book (Range 3566700 - 3566799)
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

-- 4. Insert Cheque Leaf (3566753)
WITH book_info AS (
    SELECT cheque_book_id FROM cheque_books cb
    JOIN accounts a ON cb.account_id = a.account_id
    WHERE a.account_number = '20503040200090711' AND serial_start = 3566700
)
INSERT INTO cheque_leaves (cheque_book_id, cheque_number, status)
SELECT 
    cheque_book_id,
    3566753,
    'unused' -- Initially unused so it can be processed
FROM book_info
ON CONFLICT (cheque_book_id, cheque_number) DO UPDATE
SET status = 'unused';

-- 5. (Optional) Insert Cheque Record if we want it to appear in dashboard immediately as 'received'
-- But normally the app inserts it when processed. 
-- If the user wants to see "Happy Path", they will upload the image.
-- The validation logic checks 'cheque_leaves'. Since we set it to 'unused', it will pass "Cheque Status".
-- Ideally, we delete any existing cheque record for this number to allow fresh processing.
DELETE FROM initial_validations WHERE cheque_id IN (SELECT cheque_id FROM cheques WHERE cheque_number = 3566753);
DELETE FROM cheques WHERE cheque_number = 3566753;
