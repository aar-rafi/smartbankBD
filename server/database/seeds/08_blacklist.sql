-- ============================================================
-- BLACKLIST SEED DATA
-- Run anytime after schema creation
-- Contains flagged accounts, cheques, and persons
-- ============================================================

INSERT INTO blacklist (blacklist_id, entry_type, account_number, cheque_number, national_id, reason, description, is_active) VALUES

-- Fraudulent accounts
(1, 'account', '9999-FRAUD-01', NULL, NULL, 'fraud', 
 'Account involved in cheque fraud ring - reported by multiple banks', TRUE),
(2, 'account', '9999-FRAUD-02', NULL, NULL, 'fraud',
 'Repeated bounced cheques with forged signatures', TRUE),

-- Stolen cheques
(3, 'cheque', NULL, 888001, NULL, 'stolen',
 'Cheque book reported stolen from Alpha Bank branch robbery', TRUE),
(4, 'cheque', NULL, 888002, NULL, 'stolen',
 'Part of stolen cheque book - serial 888001-888050', TRUE),
(5, 'cheque', NULL, 888003, NULL, 'stolen',
 'Part of stolen cheque book - serial 888001-888050', TRUE),

-- Lost cheques (from David Khan - leaf 33)
(6, 'cheque', '2001-00002', 400003, NULL, 'lost',
 'Cheque lost by account holder, stop payment requested', TRUE),

-- Stop payment (from Bob Chowdhury - leaf 15)
(7, 'cheque', '1001-00002', 200055, NULL, 'stop_payment',
 'Stop payment issued - dispute with payee', TRUE),

-- Blacklisted person (known fraudster)
(8, 'person', NULL, NULL, '1975999888777',
 'fraud', 'Known fraudster - multiple cases of cheque forgery across banks', TRUE),
(9, 'person', NULL, NULL, '1980111222333',
 'fraud', 'Identity theft suspect - uses fake documents', TRUE),

-- Inactive/resolved entries
(10, 'account', '8888-OLD-01', NULL, NULL, 'fraud',
 'Historical fraud case - resolved and account closed', FALSE)

ON CONFLICT (blacklist_id) DO NOTHING;

-- Reset sequence
SELECT setval('blacklist_blacklist_id_seq', (SELECT MAX(blacklist_id) FROM blacklist));
