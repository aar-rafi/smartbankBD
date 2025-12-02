-- ============================================================
-- FRAUD FLAGS SEED DATA (Supervisor Queue)
-- Run after 09_cheques.sql
-- Cheques flagged for human review
-- ============================================================

INSERT INTO fraud_flags (
    flag_id, cheque_id, reason, priority, status, review_notes, reviewed_at, created_at
) VALUES

-- Cheque 8: Bob → Eve (Unusual amount + velocity)
(1, 8, 'Unusual transaction pattern detected: Amount 3.2x higher than average. 3 cheques issued in 24 hours.', 
 'high', 'pending', NULL, NULL, '2024-10-05 15:35:00+06'),

-- Cheque 10: David → Carol (Signature mismatch)
(2, 10, 'AI signature verification failed: 35.2% match score (threshold: 70%). Possible forgery attempt.',
 'urgent', 'rejected', 'Confirmed signature forgery. Reported to fraud department.', 
 '2024-09-10 19:00:00+06', '2024-09-10 18:35:00+06'),

-- Historical resolved flags
(3, 4, 'Insufficient funds for large transaction. Customer notified.',
 'medium', 'rejected', 'Bounced cheque processed. Customer contacted.',
 '2024-08-20 19:00:00+06', '2024-08-20 18:35:00+06')

ON CONFLICT (flag_id) DO UPDATE SET
    cheque_id = EXCLUDED.cheque_id,
    reason = EXCLUDED.reason,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    review_notes = EXCLUDED.review_notes,
    reviewed_at = EXCLUDED.reviewed_at,
    created_at = EXCLUDED.created_at;

-- Reset sequence
SELECT setval('fraud_flags_flag_id_seq', (SELECT MAX(flag_id) FROM fraud_flags));
