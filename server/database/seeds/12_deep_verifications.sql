-- ============================================================
-- DEEP VERIFICATIONS SEED DATA (Stage 3 - Bank B + AI)
-- Run after 09_cheques.sql and 07_account_signatures.sql
-- AI signature matching and behavior analysis
-- ============================================================

INSERT INTO deep_verifications (
    verification_id, cheque_id,
    -- Basic checks
    account_active, sufficient_funds, cheque_leaf_valid,
    -- Signature AI
    matched_signature_id, signature_score, signature_match,
    -- Behavior AI
    behavior_score, amount_deviation, is_unusual_amount, is_new_payee,
    is_unusual_day, is_unusual_time, is_high_velocity, is_dormant_account,
    velocity_24h, behavior_flags,
    -- Combined risk
    fraud_risk_score, risk_level, ai_decision, ai_confidence, ai_reasoning,
    -- Final
    final_decision, decision_by, decision_notes, verified_at
) VALUES

-- Cheque 1: Alice → Carol (All good)
(1, 1,
 TRUE, TRUE, TRUE,
 1, 95.50, 'match',
 12.00, 0.8, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1,
 ARRAY[]::TEXT[],
 8.50, 'low', 'approve', 96.00, 'Signature verified. Normal transaction pattern.',
 'approved', 'system', NULL, '2024-07-15 14:30:00+06'),

-- Cheque 2: Bob → Supplier (Good, regular business)
(2, 2,
 TRUE, TRUE, TRUE,
 2, 92.30, 'match',
 18.00, 1.2, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 2,
 ARRAY[]::TEXT[],
 15.00, 'low', 'approve', 94.00, 'Regular business payment. Signature verified.',
 'approved', 'system', NULL, '2024-09-20 13:30:00+06'),

-- Cheque 3: Carol → Eve (Large but normal for her)
(3, 3,
 TRUE, TRUE, TRUE,
 4, 97.80, 'match',
 15.00, 1.5, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1,
 ARRAY[]::TEXT[],
 10.00, 'low', 'approve', 97.00, 'High value but within normal range for this customer.',
 'approved', 'system', NULL, '2024-02-10 12:30:00+06'),

-- Cheque 4: David → Bob (Insufficient funds - bounced)
(4, 4,
 TRUE, FALSE, TRUE,  -- No sufficient funds!
 5, 88.50, 'match',
 35.00, 2.8, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 1,
 ARRAY['unusual_amount']::TEXT[],
 45.00, 'medium', 'reject', 92.00, 'Insufficient funds. Amount exceeds balance.',
 'rejected', 'system', 'Bounced due to insufficient funds', '2024-08-20 18:30:00+06'),

-- Cheque 5: Eve → Alice (Corporate, all good)
(5, 5,
 TRUE, TRUE, TRUE,
 6, 96.20, 'match',
 8.00, 0.5, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1,
 ARRAY[]::TEXT[],
 6.00, 'low', 'approve', 98.00, 'Normal corporate payment. All checks passed.',
 'approved', 'system', NULL, '2024-06-15 14:30:00+06'),

-- Cheque 6: MANSUR → Carol (In progress)
(6, 6,
 TRUE, TRUE, TRUE,
 8, 91.00, 'match',
 22.00, 1.8, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1,
 ARRAY[]::TEXT[],
 18.00, 'low', 'approve', 93.00, 'Signature verified. Normal business transaction.',
 NULL, NULL, 'Pending final settlement', '2025-02-10 12:00:00+06'),

-- Cheque 7: SWASTIKA → Alice (Validated, good)
(7, 7,
 TRUE, TRUE, TRUE,
 9, 94.50, 'match',
 10.00, 0.6, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1,
 ARRAY[]::TEXT[],
 8.00, 'low', 'approve', 95.00, 'All validations passed. Normal transaction.',
 NULL, NULL, 'Awaiting clearing', '2025-07-10 11:00:00+06'),

-- Cheque 8: Bob → Eve (Flagged - unusual amount)
(8, 8,
 TRUE, TRUE, TRUE,
 2, 89.50, 'match',
 55.00, 3.2, TRUE, FALSE, FALSE, FALSE, TRUE, FALSE, 3,
 ARRAY['unusual_amount', 'high_velocity']::TEXT[],
 52.00, 'high', 'flag_for_review', 78.00, 'Amount significantly higher than usual. 3 cheques in 24h.',
 NULL, NULL, 'Flagged for supervisor review', '2024-10-05 15:30:00+06'),

-- Cheque 9: Carol → David (Just received, pending)
(9, 9,
 TRUE, TRUE, TRUE,
 4, NULL, NULL,
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
 NULL,
 NULL, NULL, NULL, NULL, NULL,
 NULL, NULL, 'Pending AI verification', NULL),

-- Cheque 10: David → Carol (Rejected - signature mismatch)
(10, 10,
 TRUE, TRUE, TRUE,
 5, 35.20, 'no_match',  -- Low signature score!
 45.00, 2.5, TRUE, FALSE, FALSE, TRUE, FALSE, FALSE, 1,
 ARRAY['unusual_amount', 'unusual_time']::TEXT[],
 72.00, 'high', 'reject', 88.00, 'Signature mismatch detected. Possible forgery.',
 'rejected', 'system', 'Rejected due to signature mismatch', '2024-09-10 18:30:00+06')

ON CONFLICT (verification_id) DO UPDATE SET
    cheque_id = EXCLUDED.cheque_id,
    account_active = EXCLUDED.account_active,
    sufficient_funds = EXCLUDED.sufficient_funds,
    cheque_leaf_valid = EXCLUDED.cheque_leaf_valid,
    matched_signature_id = EXCLUDED.matched_signature_id,
    signature_score = EXCLUDED.signature_score,
    signature_match = EXCLUDED.signature_match,
    behavior_score = EXCLUDED.behavior_score,
    amount_deviation = EXCLUDED.amount_deviation,
    is_unusual_amount = EXCLUDED.is_unusual_amount,
    is_new_payee = EXCLUDED.is_new_payee,
    is_unusual_day = EXCLUDED.is_unusual_day,
    is_unusual_time = EXCLUDED.is_unusual_time,
    is_high_velocity = EXCLUDED.is_high_velocity,
    is_dormant_account = EXCLUDED.is_dormant_account,
    velocity_24h = EXCLUDED.velocity_24h,
    behavior_flags = EXCLUDED.behavior_flags,
    fraud_risk_score = EXCLUDED.fraud_risk_score,
    risk_level = EXCLUDED.risk_level,
    ai_decision = EXCLUDED.ai_decision,
    ai_confidence = EXCLUDED.ai_confidence,
    ai_reasoning = EXCLUDED.ai_reasoning,
    final_decision = EXCLUDED.final_decision,
    decision_by = EXCLUDED.decision_by,
    decision_notes = EXCLUDED.decision_notes,
    verified_at = EXCLUDED.verified_at;

-- Reset sequence
SELECT setval('deep_verifications_verification_id_seq', (SELECT MAX(verification_id) FROM deep_verifications));
