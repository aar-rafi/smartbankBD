-- ============================================================
-- BANKS SEED DATA
-- Run after schema.sql
-- ============================================================

INSERT INTO banks (bank_id, bank_code, bank_name, bank_type, routing_number) VALUES
(1, 'BANK_A', 'Alpha Bank Ltd', 'commercial', '010123456'),
(2, 'BANK_B', 'Beta Bank Ltd', 'commercial', '020234567'),
(3, 'BB', 'Bangladesh Bank', 'central', '000000000'),
(4, 'IBBL', 'Islami Bank Bangladesh Limited', 'commercial', '125155801'),
(5, 'SONALI', 'Sonali Bank Limited', 'government', '200270522')
ON CONFLICT (bank_id) DO NOTHING;

-- Reset sequence to next available ID
SELECT setval('banks_bank_id_seq', (SELECT MAX(bank_id) FROM banks));
