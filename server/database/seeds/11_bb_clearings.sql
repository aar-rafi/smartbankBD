-- ============================================================
-- BB CLEARINGS SEED DATA (Stage 2 - Bangladesh Bank)
-- Run after 09_cheques.sql and 08_blacklist.sql
-- Central bank clearing and blacklist checks
-- ============================================================

INSERT INTO bb_clearings (
    clearing_id, cheque_id, clearing_reference,
    from_bank_id, to_bank_id, received_at, forwarded_at,
    blacklist_hit, blacklist_match_id, duplicate_hit, duplicate_of_cheque, stop_payment_hit,
    status, response_status, response_at
) VALUES

-- Cheque 1: Alice → Carol (Clean, forwarded)
(1, 1, 'BB-CLR-2024-0001',
 1, 2, '2024-07-15 11:00:00+06', '2024-07-15 11:30:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'responded', 'approved', '2024-07-15 14:00:00+06'),

-- Cheque 2: Bob → Supplier (Clean)
(2, 2, 'BB-CLR-2024-0002',
 1, 2, '2024-09-20 10:00:00+06', '2024-09-20 10:30:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'responded', 'approved', '2024-09-20 13:00:00+06'),

-- Cheque 3: Carol → Eve (Same bank, quick clear)
(3, 3, 'BB-CLR-2024-0003',
 2, 2, '2024-02-10 11:00:00+06', '2024-02-10 11:15:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'responded', 'approved', '2024-02-10 12:00:00+06'),

-- Cheque 4: David → Bob (Clean at BB level, failed at Bank B)
(4, 4, 'BB-CLR-2024-0004',
 2, 1, '2024-08-20 16:00:00+06', '2024-08-20 16:30:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'responded', 'approved', '2024-08-20 18:00:00+06'),

-- Cheque 5: Eve → Alice (Clean)
(5, 5, 'BB-CLR-2024-0005',
 2, 1, '2024-06-15 11:00:00+06', '2024-06-15 11:30:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'responded', 'approved', '2024-06-15 14:00:00+06'),

-- Cheque 6: MANSUR → Carol (Currently in clearing)
(6, 6, 'BB-CLR-2025-0001',
 4, 2, '2025-02-10 11:00:00+06', '2025-02-10 11:30:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'forwarded', NULL, NULL),

-- Cheque 7: SWASTIKA → Alice (Validated, pending clearing)
(7, 7, 'BB-CLR-2025-0002',
 5, 1, '2025-07-10 11:00:00+06', NULL,
 FALSE, NULL, FALSE, NULL, FALSE,
 'pending', NULL, NULL),

-- Cheque 8: Bob → Eve (Flagged for unusual pattern)
(8, 8, 'BB-CLR-2024-0006',
 1, 2, '2024-10-05 11:30:00+06', '2024-10-05 12:00:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'responded', 'flagged', '2024-10-05 15:00:00+06'),

-- Cheque 9: Carol → David (Just received)
(9, 9, 'BB-CLR-2025-0003',
 2, 2, '2025-12-01 15:00:00+06', NULL,
 FALSE, NULL, FALSE, NULL, FALSE,
 'pending', NULL, NULL),

-- Cheque 10: David → Carol (Rejected)
(10, 10, 'BB-CLR-2024-0007',
 2, 2, '2024-09-10 17:00:00+06', '2024-09-10 17:30:00+06',
 FALSE, NULL, FALSE, NULL, FALSE,
 'responded', 'rejected', '2024-09-10 18:00:00+06')

ON CONFLICT (clearing_id) DO UPDATE SET
    cheque_id = EXCLUDED.cheque_id,
    clearing_reference = EXCLUDED.clearing_reference,
    from_bank_id = EXCLUDED.from_bank_id,
    to_bank_id = EXCLUDED.to_bank_id,
    received_at = EXCLUDED.received_at,
    forwarded_at = EXCLUDED.forwarded_at,
    blacklist_hit = EXCLUDED.blacklist_hit,
    blacklist_match_id = EXCLUDED.blacklist_match_id,
    duplicate_hit = EXCLUDED.duplicate_hit,
    duplicate_of_cheque = EXCLUDED.duplicate_of_cheque,
    stop_payment_hit = EXCLUDED.stop_payment_hit,
    status = EXCLUDED.status,
    response_status = EXCLUDED.response_status,
    response_at = EXCLUDED.response_at;

-- Reset sequence
SELECT setval('bb_clearings_clearing_id_seq', (SELECT MAX(clearing_id) FROM bb_clearings));
