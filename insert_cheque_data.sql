-- Insert Islami Bank (since it doesn't exist)
INSERT INTO banks (bank_code, bank_name, bank_type, routing_number)
VALUES ('IBBL', 'Islami Bank Bangladesh Limited', 'commercial', '125155801')
ON CONFLICT (bank_code) DO NOTHING;

-- Insert the account from the cheque image
INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status, created_at)
VALUES (
    (SELECT bank_id FROM banks WHERE bank_code = 'IBBL'),
    '20503040200090711',
    'A. H. M. MANSUR',
    'current',
    150000.00,  -- More than the cheque amount (105000)
    'active',
    NOW()
) ON CONFLICT (account_number) DO NOTHING;

-- Create a customer profile for the account
INSERT INTO customer_profiles (account_id, national_id, phone)
SELECT account_id, NULL, NULL
FROM accounts 
WHERE account_number = '20503040200090711'
ON CONFLICT (account_id) DO NOTHING;

-- Insert a cheque book for this account
INSERT INTO cheque_books (account_id, serial_start, serial_end, issued_date, status)
SELECT 
    account_id,
    3566700,
    3566799,
    '2023-01-15',
    'active'
FROM accounts 
WHERE account_number = '20503040200090711';

-- Insert the specific cheque leaf
INSERT INTO cheque_leaves (
    cheque_book_id,
    cheque_number,
    status,
    stop_payment
)
SELECT 
    cb.cheque_book_id,
    3566753,
    'unused',
    false
FROM cheque_books cb
JOIN accounts a ON cb.account_id = a.account_id
WHERE a.account_number = '20503040200090711'
ON CONFLICT (cheque_book_id, cheque_number) DO UPDATE SET status = 'unused';

-- Verify the data
SELECT 
    a.account_number,
    a.holder_name,
    a.balance,
    a.status as account_status,
    cl.status as cheque_status
FROM accounts a
JOIN cheque_books cb ON cb.account_id = a.account_id
LEFT JOIN cheque_leaves cl ON cl.cheque_book_id = cb.cheque_book_id
WHERE a.account_number = '20503040200090711';

-- Insert signature for the account
INSERT INTO account_signatures (account_id, image_path, created_at)
SELECT account_id, '/signatures/sig-1.jpg', NOW()
FROM accounts
WHERE account_number = '20503040200090711';
