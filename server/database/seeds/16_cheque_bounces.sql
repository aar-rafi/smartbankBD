-- ============================================================
-- CHEQUE BOUNCES SEED DATA
-- Run after 09_cheques.sql
-- Records of bounced cheques with reasons
-- ============================================================

INSERT INTO cheque_bounces (
    bounce_id, cheque_id, reason_code, reason_text, bounced_at
) VALUES

-- Cheque 4: David → Bob (Insufficient funds)
(1, 4, 'INSUF_FUNDS', 
 'Account balance (250,000) insufficient for cheque amount (300,000). Shortfall: 50,000 BDT.',
 '2024-08-20 18:45:00+06'),

-- Cheque 10: David → Carol (Signature mismatch)
(2, 10, 'SIG_MISMATCH',
 'Signature verification failed. AI confidence: 35.2%. Manual review confirmed forgery attempt.',
 '2024-09-10 19:00:00+06')

ON CONFLICT (bounce_id) DO UPDATE SET
    cheque_id = EXCLUDED.cheque_id,
    reason_code = EXCLUDED.reason_code,
    reason_text = EXCLUDED.reason_text,
    bounced_at = EXCLUDED.bounced_at;

-- Reset sequence
SELECT setval('cheque_bounces_bounce_id_seq', (SELECT MAX(bounce_id) FROM cheque_bounces));
