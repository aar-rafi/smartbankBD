-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Accounts
INSERT INTO accounts (bank_id, account_number, holder_name, balance) VALUES
(1, '1001-00001', 'Alice Rahman', 75000),
(1, '1001-00002', 'Bob Chowdhury', 150000),
(2, '2001-00001', 'Carol Ahmed', 500000),
(2, '2001-00002', 'David Khan', 250000),
(2, '2001-00003', 'Eve Hossain', 1000000);

-- Customer Profiles with behavioral data
INSERT INTO customer_profiles (
    account_id, national_id, kyc_status, 
    avg_transaction_amt, max_transaction_amt, total_cheques_issued, bounced_cheques_count,
    usual_days_of_week, monthly_avg_count, risk_category, risk_score
) VALUES
(1, '1990123456789', 'verified', 15000, 50000, 12, 0, '{1,2,3,4,5}', 2.5, 'low', 20),
(2, '1985234567890', 'verified', 25000, 80000, 24, 1, '{1,3,5}', 4.0, 'low', 25),
(3, '1988345678901', 'verified', 75000, 200000, 48, 2, '{1,2,3,4,5}', 8.0, 'medium', 45),
(4, '1992456789012', 'verified', 35000, 100000, 18, 0, '{2,4}', 3.0, 'low', 22),
(5, '1995567890123', 'pending', 150000, 500000, 36, 5, '{1,2,3,4,5,6,7}', 6.0, 'high', 75);

-- Cheque Books
INSERT INTO cheque_books (account_id, serial_start, serial_end) VALUES
(3, 100001, 100025),
(4, 200001, 200025),
(5, 300001, 300025);

-- Cheque Leaves (sample)
INSERT INTO cheque_leaves (cheque_book_id, cheque_number, status)
SELECT 1, generate_series(100001, 100025), 'unused';
INSERT INTO cheque_leaves (cheque_book_id, cheque_number, status)
SELECT 2, generate_series(200001, 200025), 'unused';
INSERT INTO cheque_leaves (cheque_book_id, cheque_number, status)
SELECT 3, generate_series(300001, 300025), 'unused';

-- Signatures
INSERT INTO account_signatures (account_id, image_path) VALUES
(3, '/signatures/carol_sig.png'),
(4, '/signatures/david_sig.png'),
(5, '/signatures/eve_sig.png');

-- Blacklist sample
INSERT INTO blacklist (entry_type, account_number, reason, description) VALUES
('account', '9999-00001', 'fraud', 'Known fraudulent account'),
('person', NULL, 'fraud', 'Fraudster national ID');
UPDATE blacklist SET national_id = '1234567890123' WHERE blacklist_id = 2;
