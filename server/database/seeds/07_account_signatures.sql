-- ============================================================
-- ACCOUNT SIGNATURES SEED DATA
-- Run after 02_accounts.sql
-- Reference signatures for ML signature verification
-- ============================================================

INSERT INTO account_signatures (signature_id, account_id, image_path, is_primary, created_at) VALUES

-- Alice Rahman - Primary signature
(1, 1, '/signatures/alice_rahman.png', TRUE, '2024-06-15 10:15:00+06'),

-- Bob Chowdhury - Primary + Secondary signature
(2, 2, '/signatures/bob_chowdhury_1.png', TRUE, '2024-03-20 11:45:00+06'),
(3, 2, '/signatures/bob_chowdhury_2.png', FALSE, '2024-03-20 11:50:00+06'),

-- Carol Ahmed - Primary signature
(4, 3, '/signatures/carol_ahmed.png', TRUE, '2023-12-10 09:15:00+06'),

-- David Khan - Primary signature
(5, 4, '/signatures/david_khan.png', TRUE, '2024-08-05 14:15:00+06'),

-- Eve Hossain - Primary + Secondary signature (corporate)
(6, 5, '/signatures/eve_hossain_1.png', TRUE, '2023-09-25 11:15:00+06'),
(7, 5, '/signatures/eve_hossain_2.png', FALSE, '2023-09-25 11:20:00+06'),

-- A. H. M. MANSUR - Primary signature
(8, 7, '/signatures/mansur.png', TRUE, '2025-01-15 10:45:00+06'),

-- SWASTIKA PANDIT - Primary signature (already exists, update path)
(9, 8, '/signatures/swastika.png', TRUE, '2025-06-20 10:00:00+06')

ON CONFLICT (signature_id) DO UPDATE SET
    image_path = EXCLUDED.image_path,
    is_primary = EXCLUDED.is_primary;

-- Reset sequence
SELECT setval('account_signatures_signature_id_seq', (SELECT MAX(signature_id) FROM account_signatures));
