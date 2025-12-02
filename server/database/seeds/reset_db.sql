-- ============================================================
-- RESET DATABASE
-- Truncates all tables in the correct order (respecting FKs)
-- WARNING: This will delete ALL data!
-- ============================================================

-- Disable triggers temporarily for faster truncation
SET session_replication_role = 'replica';

-- Truncate all tables in reverse dependency order
TRUNCATE TABLE cheque_bounces CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE settlements CASCADE;
TRUNCATE TABLE fraud_flags CASCADE;
TRUNCATE TABLE deep_verifications CASCADE;
TRUNCATE TABLE bb_clearings CASCADE;
TRUNCATE TABLE initial_validations CASCADE;
TRUNCATE TABLE cheques CASCADE;
TRUNCATE TABLE blacklist CASCADE;
TRUNCATE TABLE account_signatures CASCADE;
TRUNCATE TABLE cheque_leaves CASCADE;
TRUNCATE TABLE cheque_books CASCADE;
TRUNCATE TABLE kyc_documents CASCADE;
TRUNCATE TABLE customer_profiles CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE banks CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences
SELECT setval('banks_bank_id_seq', 1, false);
SELECT setval('accounts_account_id_seq', 1, false);
SELECT setval('customer_profiles_profile_id_seq', 1, false);
SELECT setval('kyc_documents_document_id_seq', 1, false);
SELECT setval('cheque_books_cheque_book_id_seq', 1, false);
SELECT setval('cheque_leaves_leaf_id_seq', 1, false);
SELECT setval('account_signatures_signature_id_seq', 1, false);
SELECT setval('blacklist_blacklist_id_seq', 1, false);
SELECT setval('cheques_cheque_id_seq', 1, false);
SELECT setval('initial_validations_validation_id_seq', 1, false);
SELECT setval('bb_clearings_clearing_id_seq', 1, false);
SELECT setval('deep_verifications_verification_id_seq', 1, false);
SELECT setval('fraud_flags_flag_id_seq', 1, false);
SELECT setval('settlements_settlement_id_seq', 1, false);
SELECT setval('transactions_transaction_id_seq', 1, false);
SELECT setval('cheque_bounces_bounce_id_seq', 1, false);

\echo 'Database reset complete!'
