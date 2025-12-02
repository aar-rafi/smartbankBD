-- 1. Insert Bank (Islami Bank Bangladesh Limited)
INSERT INTO banks (bank_code, bank_name, routing_number, bank_type)
VALUES ('IBBL', 'Islami Bank Bangladesh Limited', '125155891', 'commercial')
ON CONFLICT (bank_code) DO UPDATE 
SET routing_number = EXCLUDED.routing_number;

-- 2. Insert Drawer Account (A. H. M. MANSUR)
-- We need the bank_id first
WITH bank_info AS (
    SELECT bank_id FROM banks WHERE bank_code = 'IBBL'
)
INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status)
SELECT 
    bank_id, 
    '20503040200090711', 
    'A. H. M. MANSUR', 
    'savings', 
    500000.00, -- Initial balance assumption
    'active'
FROM bank_info
ON CONFLICT (account_number) DO NOTHING;

-- 3. Insert Cheque
-- We need bank_id and account_id
WITH bank_info AS (
    SELECT bank_id FROM banks WHERE bank_code = 'IBBL'
),
account_info AS (
    SELECT account_id FROM accounts WHERE account_number = '20503040200090711'
)
INSERT INTO cheques (
    cheque_number, 
    drawer_account_id, 
    drawer_bank_id, 
    payee_name, 
    amount, 
    amount_in_words, 
    issue_date, 
    micr_code, 
    status
)
SELECT 
    3566753, 
    a.account_id, 
    b.bank_id, 
    'Mohammad Shahidullah', 
    105000.00, 
    'One lac five Thousand taka only', 
    '2023-05-24', 
    '3566753 125155801 3040200090711 10', 
    'received'
FROM bank_info b, account_info a;
