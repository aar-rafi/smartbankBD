-- ============================================================
-- ACCOUNTS SEED DATA
-- Run after 01_banks.sql
-- ============================================================

INSERT INTO accounts (account_id, bank_id, account_number, holder_name, account_type, balance, status) VALUES
(1, 1, '1001-00001', 'Alice Rahman', 'savings', 75000.00, 'active'),
(2, 1, '1001-00002', 'Bob Chowdhury', 'savings', 150000.00, 'active'),
(3, 2, '2001-00001', 'Carol Ahmed', 'savings', 500000.00, 'active'),
(4, 2, '2001-00002', 'David Khan', 'savings', 250000.00, 'active'),
(5, 2, '2001-00003', 'Eve Hossain', 'savings', 1000000.00, 'active'),
(7, 4, '20503040200090711', 'A. H. M. MANSUR', 'current', 150000.00, 'active'),
(8, 5, '4404001000379', 'SWASTIKA PANDIT', 'savings', 50000.00, 'active')
ON CONFLICT (account_number) DO UPDATE SET
    bank_id = EXCLUDED.bank_id,
    holder_name = EXCLUDED.holder_name,
    account_type = EXCLUDED.account_type,
    balance = EXCLUDED.balance,
    status = EXCLUDED.status;

-- Reset sequence to next available ID
SELECT setval('accounts_account_id_seq', (SELECT MAX(account_id) FROM accounts));
