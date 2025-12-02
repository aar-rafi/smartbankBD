-- ============================================================
-- CHEQUES SEED DATA
-- Run after cheque_leaves.sql and accounts.sql
-- Main cheque records for testing the validation pipeline
-- ============================================================

INSERT INTO cheques (
    cheque_id, cheque_number, leaf_id,
    drawer_account_id, drawer_bank_id,
    depositor_account_id, presenting_bank_id,
    payee_name, amount, amount_in_words, issue_date, micr_code,
    cheque_image_path, signature_image_path, status
) VALUES

-- Cheque 1: Alice → Carol (Settled successfully)
(1, 100001, 1, 
 1, 1,  -- Alice (Alpha Bank) as drawer
 3, 2,  -- Carol (Beta Bank) as depositor
 'Carol Ahmed', 25000.00, 'Twenty Five Thousand Taka Only', '2024-07-15',
 '100001:010123:100100001',
 '/cheques/cheque_100001.jpg', '/cheques/sig_100001.jpg', 'settled'),

-- Cheque 2: Bob → Supplier (Settled)
(2, 200051, 11,
 2, 1,  -- Bob (Alpha Bank)
 4, 2,  -- David (Beta Bank)
 'Supplier ABC Ltd', 45000.00, 'Forty Five Thousand Taka Only', '2024-09-20',
 '200051:010123:100100002',
 '/cheques/cheque_200051.jpg', '/cheques/sig_200051.jpg', 'settled'),

-- Cheque 3: Carol → Eve (Large amount, settled)
(3, 300001, 21,
 3, 2,  -- Carol (Beta Bank)
 5, 2,  -- Eve (Beta Bank) - same bank
 'Eve Hossain', 200000.00, 'Two Lakh Taka Only', '2024-02-10',
 '300001:020234:200100001',
 '/cheques/cheque_300001.jpg', '/cheques/sig_300001.jpg', 'settled'),

-- Cheque 4: David → Bob (Bounced - insufficient funds scenario for demo)
(4, 400001, 31,
 4, 2,  -- David (Beta Bank)
 2, 1,  -- Bob (Alpha Bank)
 'Bob Chowdhury', 300000.00, 'Three Lakh Taka Only', '2024-08-20',
 '400001:020234:200100002',
 '/cheques/cheque_400001.jpg', '/cheques/sig_400001.jpg', 'bounced'),

-- Cheque 5: Eve → Alice (Corporate payment, approved)
(5, 500051, 41,
 5, 2,  -- Eve (Beta Bank)
 1, 1,  -- Alice (Alpha Bank)
 'Alice Rahman', 150000.00, 'One Lakh Fifty Thousand Taka Only', '2024-06-15',
 '500051:020234:200100003',
 '/cheques/cheque_500051.jpg', '/cheques/sig_500051.jpg', 'settled'),

-- Cheque 6: MANSUR → Carol (Recent, in clearing)
(6, 600001, 51,
 7, 4,  -- MANSUR (IBBL)
 3, 2,  -- Carol (Beta Bank)
 'Carol Ahmed', 75000.00, 'Seventy Five Thousand Taka Only', '2025-02-10',
 '600001:125155:2050304020',
 '/cheques/cheque_600001.jpg', '/cheques/sig_600001.jpg', 'clearing'),

-- Cheque 7: SWASTIKA → Alice (Recent, validated)
(7, 700001, 61,
 8, 5,  -- SWASTIKA (Sonali)
 1, 1,  -- Alice (Alpha Bank)
 'Alice Rahman', 15000.00, 'Fifteen Thousand Taka Only', '2025-07-10',
 '700001:200270:4404001000379',
 '/cheques/cheque_700001.jpg', '/cheques/sig_700001.jpg', 'validated'),

-- Cheque 8: Bob → Eve (Flagged for review - unusual amount)
(8, 200052, 12,
 2, 1,  -- Bob (Alpha Bank)
 5, 2,  -- Eve (Beta Bank)
 'Eve Hossain', 120000.00, 'One Lakh Twenty Thousand Taka Only', '2024-10-05',
 '200052:010123:100100002',
 '/cheques/cheque_200052.jpg', '/cheques/sig_200052.jpg', 'flagged'),

-- Cheque 9: Carol → David (Pending received)
(9, 300006, 26,
 3, 2,  -- Carol (Beta Bank)
 4, 2,  -- David (Beta Bank)
 'David Khan', 50000.00, 'Fifty Thousand Taka Only', '2025-12-01',
 '300006:020234:200100001',
 '/cheques/cheque_300006.jpg', '/cheques/sig_300006.jpg', 'received'),

-- Cheque 10: Rejected - signature mismatch test case
(10, 400002, 32,
 4, 2,  -- David (Beta Bank)
 3, 2,  -- Carol (Beta Bank)
 'Carol Ahmed', 80000.00, 'Eighty Thousand Taka Only', '2024-09-10',
 '400002:020234:200100002',
 '/cheques/cheque_400002.jpg', '/cheques/sig_400002_fake.jpg', 'rejected')

ON CONFLICT (cheque_id) DO UPDATE SET
    cheque_number = EXCLUDED.cheque_number,
    leaf_id = EXCLUDED.leaf_id,
    drawer_account_id = EXCLUDED.drawer_account_id,
    drawer_bank_id = EXCLUDED.drawer_bank_id,
    depositor_account_id = EXCLUDED.depositor_account_id,
    presenting_bank_id = EXCLUDED.presenting_bank_id,
    payee_name = EXCLUDED.payee_name,
    amount = EXCLUDED.amount,
    amount_in_words = EXCLUDED.amount_in_words,
    issue_date = EXCLUDED.issue_date,
    micr_code = EXCLUDED.micr_code,
    cheque_image_path = EXCLUDED.cheque_image_path,
    signature_image_path = EXCLUDED.signature_image_path,
    status = EXCLUDED.status;

-- Reset sequence
SELECT setval('cheques_cheque_id_seq', (SELECT MAX(cheque_id) FROM cheques));
