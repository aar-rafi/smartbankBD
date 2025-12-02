-- ============================================================
-- INITIAL VALIDATIONS SEED DATA (Stage 1 - Bank A)
-- Run after 09_cheques.sql
-- OCR and field validation results
-- ============================================================

INSERT INTO initial_validations (
    validation_id, cheque_id,
    all_fields_present, date_valid, micr_readable,
    ocr_amount, ocr_confidence, amount_match,
    validation_status, failure_reason, validated_at
) VALUES

-- Cheque 1: Alice → Carol (All passed)
(1, 1, TRUE, TRUE, TRUE, 25000.00, 98.50, TRUE, 
 'passed', NULL, '2024-07-15 10:30:00+06'),

-- Cheque 2: Bob → Supplier (All passed)
(2, 2, TRUE, TRUE, TRUE, 45000.00, 97.20, TRUE,
 'passed', NULL, '2024-09-20 09:30:00+06'),

-- Cheque 3: Carol → Eve (All passed)
(3, 3, TRUE, TRUE, TRUE, 200000.00, 99.10, TRUE,
 'passed', NULL, '2024-02-10 10:30:00+06'),

-- Cheque 4: David → Bob (Passed initial, failed later at funds check)
(4, 4, TRUE, TRUE, TRUE, 300000.00, 96.80, TRUE,
 'passed', NULL, '2024-08-20 15:30:00+06'),

-- Cheque 5: Eve → Alice (All passed)
(5, 5, TRUE, TRUE, TRUE, 150000.00, 98.90, TRUE,
 'passed', NULL, '2024-06-15 10:30:00+06'),

-- Cheque 6: MANSUR → Carol (All passed)
(6, 6, TRUE, TRUE, TRUE, 75000.00, 97.50, TRUE,
 'passed', NULL, '2025-02-10 10:30:00+06'),

-- Cheque 7: SWASTIKA → Alice (All passed)
(7, 7, TRUE, TRUE, TRUE, 15000.00, 98.00, TRUE,
 'passed', NULL, '2025-07-10 10:30:00+06'),

-- Cheque 8: Bob → Eve (Passed but flagged for unusual amount)
(8, 8, TRUE, TRUE, TRUE, 120000.00, 97.80, TRUE,
 'passed', NULL, '2024-10-05 11:00:00+06'),

-- Cheque 9: Carol → David (Just received, pending validation)
(9, 9, TRUE, TRUE, TRUE, 50000.00, 98.20, TRUE,
 'passed', NULL, '2025-12-01 14:30:00+06'),

-- Cheque 10: David → Carol (Failed - amount mismatch in OCR)
(10, 10, TRUE, TRUE, TRUE, 88000.00, 85.50, FALSE,
 'failed', 'OCR amount 88000 does not match written amount 80000', '2024-09-10 16:30:00+06')

ON CONFLICT (validation_id) DO UPDATE SET
    cheque_id = EXCLUDED.cheque_id,
    all_fields_present = EXCLUDED.all_fields_present,
    date_valid = EXCLUDED.date_valid,
    micr_readable = EXCLUDED.micr_readable,
    ocr_amount = EXCLUDED.ocr_amount,
    ocr_confidence = EXCLUDED.ocr_confidence,
    amount_match = EXCLUDED.amount_match,
    validation_status = EXCLUDED.validation_status,
    failure_reason = EXCLUDED.failure_reason,
    validated_at = EXCLUDED.validated_at;

-- Reset sequence
SELECT setval('initial_validations_validation_id_seq', (SELECT MAX(validation_id) FROM initial_validations));
