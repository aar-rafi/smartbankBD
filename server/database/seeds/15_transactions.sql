-- ============================================================
-- TRANSACTIONS SEED DATA (Ledger)
-- Run after 14_settlements.sql
-- Debit/Credit entries for each account
-- ============================================================

INSERT INTO transactions (
    transaction_id, settlement_id, cheque_id, account_id, 
    txn_type, amount, balance_after, created_at
) VALUES

-- Settlement 1: Alice → Carol (25,000)
(1, 1, 1, 1, 'debit', 25000.00, 50000.00, '2024-07-15 15:00:00+06'),   -- Alice debited
(2, 1, 1, 3, 'credit', 25000.00, 525000.00, '2024-07-15 15:00:00+06'), -- Carol credited

-- Settlement 2: Bob → David (45,000)
(3, 2, 2, 2, 'debit', 45000.00, 105000.00, '2024-09-20 14:00:00+06'),  -- Bob debited
(4, 2, 2, 4, 'credit', 45000.00, 295000.00, '2024-09-20 14:00:00+06'), -- David credited

-- Settlement 3: Carol → Eve (200,000)
(5, 3, 3, 3, 'debit', 200000.00, 300000.00, '2024-02-10 13:00:00+06'), -- Carol debited
(6, 3, 3, 5, 'credit', 200000.00, 1200000.00, '2024-02-10 13:00:00+06'), -- Eve credited

-- Settlement 4: Failed - no transactions

-- Settlement 5: Eve → Alice (150,000)
(7, 5, 5, 5, 'debit', 150000.00, 850000.00, '2024-06-15 15:00:00+06'),  -- Eve debited
(8, 5, 5, 1, 'credit', 150000.00, 200000.00, '2024-06-15 15:00:00+06')  -- Alice credited

-- Note: Settlements 6 and 7 are pending, no transactions yet

ON CONFLICT (transaction_id) DO UPDATE SET
    settlement_id = EXCLUDED.settlement_id,
    cheque_id = EXCLUDED.cheque_id,
    account_id = EXCLUDED.account_id,
    txn_type = EXCLUDED.txn_type,
    amount = EXCLUDED.amount,
    balance_after = EXCLUDED.balance_after,
    created_at = EXCLUDED.created_at;

-- Reset sequence
SELECT setval('transactions_transaction_id_seq', (SELECT MAX(transaction_id) FROM transactions));
