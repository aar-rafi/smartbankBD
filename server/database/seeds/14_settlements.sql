-- ============================================================
-- SETTLEMENTS SEED DATA (Money Movement)
-- Run after 09_cheques.sql
-- Actual money transfers between accounts
-- ============================================================

INSERT INTO settlements (
    settlement_id, cheque_id,
    from_account_id, debit_amount, debited_at,
    to_account_id, credit_amount, credited_at,
    status, completed_at
) VALUES

-- Cheque 1: Alice → Carol (25,000)
(1, 1,
 1, 25000.00, '2024-07-15 15:00:00+06',
 3, 25000.00, '2024-07-15 15:00:00+06',
 'completed', '2024-07-15 15:00:00+06'),

-- Cheque 2: Bob → Supplier/David (45,000)
(2, 2,
 2, 45000.00, '2024-09-20 14:00:00+06',
 4, 45000.00, '2024-09-20 14:00:00+06',
 'completed', '2024-09-20 14:00:00+06'),

-- Cheque 3: Carol → Eve (200,000)
(3, 3,
 3, 200000.00, '2024-02-10 13:00:00+06',
 5, 200000.00, '2024-02-10 13:00:00+06',
 'completed', '2024-02-10 13:00:00+06'),

-- Cheque 4: David → Bob (FAILED - insufficient funds)
(4, 4,
 4, 300000.00, NULL,  -- Never debited
 2, 300000.00, NULL,  -- Never credited
 'failed', NULL),

-- Cheque 5: Eve → Alice (150,000)
(5, 5,
 5, 150000.00, '2024-06-15 15:00:00+06',
 1, 150000.00, '2024-06-15 15:00:00+06',
 'completed', '2024-06-15 15:00:00+06'),

-- Cheque 6: MANSUR → Carol (Pending)
(6, 6,
 7, 75000.00, NULL,
 3, 75000.00, NULL,
 'pending', NULL),

-- Cheque 7: SWASTIKA → Alice (Pending)
(7, 7,
 8, 15000.00, NULL,
 1, 15000.00, NULL,
 'pending', NULL)

ON CONFLICT (settlement_id) DO UPDATE SET
    cheque_id = EXCLUDED.cheque_id,
    from_account_id = EXCLUDED.from_account_id,
    debit_amount = EXCLUDED.debit_amount,
    debited_at = EXCLUDED.debited_at,
    to_account_id = EXCLUDED.to_account_id,
    credit_amount = EXCLUDED.credit_amount,
    credited_at = EXCLUDED.credited_at,
    status = EXCLUDED.status,
    completed_at = EXCLUDED.completed_at;

-- Reset sequence
SELECT setval('settlements_settlement_id_seq', (SELECT MAX(settlement_id) FROM settlements));
