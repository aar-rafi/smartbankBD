-- ============================================================
-- CUSTOMER PROFILES SEED DATA
-- Run after 02_accounts.sql
-- Contains AI behavior data for fraud detection
-- ============================================================

INSERT INTO customer_profiles (
    profile_id, account_id, national_id, phone,
    kyc_status, kyc_verified_at,
    -- Transaction patterns
    avg_transaction_amt, max_transaction_amt, min_transaction_amt, stddev_transaction_amt,
    total_transaction_count, monthly_avg_count,
    -- Cheque patterns
    total_cheques_issued, bounced_cheques_count, bounce_rate, cancelled_cheques_count,
    -- Time patterns
    usual_days_of_week, usual_hours, avg_days_between_txn, last_activity_at, days_since_last_activity,
    -- Payee patterns
    unique_payee_count, regular_payees, new_payee_rate,
    -- Risk scoring
    risk_category, risk_score
) VALUES

-- Account 1: Alice Rahman (Alpha Bank) - Low risk, regular saver
(1, 1, '1990123456789', '+8801711111111',
 'verified', '2024-06-15 10:00:00+06',
 15000.00, 50000.00, 5000.00, 8000.00,
 45, 3.75,
 40, 0, 0.00, 2,
 ARRAY[1,2,3,4,5], ARRAY[10,11,14,15], 8.5, '2025-11-28 14:30:00+06', 4,
 8, ARRAY['Dhaka Electric', 'Grameenphone', 'Family Transfer'], 10.00,
 'low', 15.00),

-- Account 2: Bob Chowdhury (Alpha Bank) - Medium risk, business owner
(2, 2, '1985234567890', '+8801722222222',
 'verified', '2024-03-20 11:30:00+06',
 35000.00, 120000.00, 10000.00, 25000.00,
 120, 10.00,
 110, 3, 2.73, 5,
 ARRAY[0,1,2,3,4], ARRAY[9,10,11,12,14,15,16], 3.0, '2025-12-01 16:45:00+06', 1,
 25, ARRAY['Supplier ABC', 'Rent Office', 'Staff Salary', 'Utility Bills'], 15.00,
 'medium', 45.00),

-- Account 3: Carol Ahmed (Beta Bank) - Low risk, high net worth
(3, 3, '1978345678901', '+8801733333333',
 'verified', '2023-12-10 09:00:00+06',
 85000.00, 300000.00, 20000.00, 45000.00,
 200, 16.67,
 180, 1, 0.56, 3,
 ARRAY[1,2,3,4,5], ARRAY[10,11,12,14,15], 2.0, '2025-12-02 10:00:00+06', 0,
 40, ARRAY['Investment Fund', 'Property Payment', 'Insurance Premium', 'Charity Trust'], 8.00,
 'low', 20.00),

-- Account 4: David Khan (Beta Bank) - Medium risk, irregular patterns
(4, 4, '1992456789012', '+8801744444444',
 'verified', '2024-08-05 14:00:00+06',
 28000.00, 80000.00, 5000.00, 20000.00,
 65, 5.42,
 55, 2, 3.64, 4,
 ARRAY[0,1,4,5,6], ARRAY[9,10,17,18,19], 6.0, '2025-11-25 18:20:00+06', 7,
 18, ARRAY['Online Shopping', 'Restaurant Bills', 'Travel Agency'], 25.00,
 'medium', 52.00),

-- Account 5: Eve Hossain (Beta Bank) - Low risk, corporate executive
(5, 5, '1980567890123', '+8801755555555',
 'verified', '2023-09-25 11:00:00+06',
 150000.00, 500000.00, 50000.00, 80000.00,
 95, 7.92,
 85, 0, 0.00, 1,
 ARRAY[1,2,3,4], ARRAY[10,11,12,15,16], 4.0, '2025-11-30 12:00:00+06', 2,
 15, ARRAY['Company Account', 'Tax Payment', 'Investment Portfolio', 'Premium Services'], 5.00,
 'low', 12.00),

-- Account 7: A. H. M. MANSUR (IBBL) - Medium risk, new business account
(7, 7, '1988678901234', '+8801766666666',
 'verified', '2025-01-15 10:30:00+06',
 42000.00, 100000.00, 15000.00, 22000.00,
 35, 3.50,
 30, 1, 3.33, 2,
 ARRAY[0,1,2,3,4], ARRAY[9,10,11,14,15,16], 10.0, '2025-11-20 11:15:00+06', 12,
 12, ARRAY['Supplier Payment', 'Office Rent', 'Utility'], 20.00,
 'medium', 48.00),

-- Account 8: SWASTIKA PANDIT (Sonali Bank) - Low risk, regular customer
(8, 8, '1995789012345', '+8801777777777',
 'verified', '2025-06-20 09:45:00+06',
 12000.00, 35000.00, 3000.00, 6000.00,
 25, 4.17,
 22, 0, 0.00, 1,
 ARRAY[1,2,3,4,5], ARRAY[10,11,12,14,15], 7.0, '2025-12-01 10:30:00+06', 1,
 6, ARRAY['Family Support', 'Utility Bills', 'Education Fee'], 12.00,
 'low', 18.00)

ON CONFLICT (profile_id) DO UPDATE SET
    national_id = EXCLUDED.national_id,
    phone = EXCLUDED.phone,
    kyc_status = EXCLUDED.kyc_status,
    kyc_verified_at = EXCLUDED.kyc_verified_at,
    avg_transaction_amt = EXCLUDED.avg_transaction_amt,
    max_transaction_amt = EXCLUDED.max_transaction_amt,
    min_transaction_amt = EXCLUDED.min_transaction_amt,
    stddev_transaction_amt = EXCLUDED.stddev_transaction_amt,
    total_transaction_count = EXCLUDED.total_transaction_count,
    monthly_avg_count = EXCLUDED.monthly_avg_count,
    total_cheques_issued = EXCLUDED.total_cheques_issued,
    bounced_cheques_count = EXCLUDED.bounced_cheques_count,
    bounce_rate = EXCLUDED.bounce_rate,
    cancelled_cheques_count = EXCLUDED.cancelled_cheques_count,
    usual_days_of_week = EXCLUDED.usual_days_of_week,
    usual_hours = EXCLUDED.usual_hours,
    avg_days_between_txn = EXCLUDED.avg_days_between_txn,
    last_activity_at = EXCLUDED.last_activity_at,
    days_since_last_activity = EXCLUDED.days_since_last_activity,
    unique_payee_count = EXCLUDED.unique_payee_count,
    regular_payees = EXCLUDED.regular_payees,
    new_payee_rate = EXCLUDED.new_payee_rate,
    risk_category = EXCLUDED.risk_category,
    risk_score = EXCLUDED.risk_score,
    updated_at = NOW();

-- Reset sequence
SELECT setval('customer_profiles_profile_id_seq', (SELECT MAX(profile_id) FROM customer_profiles));
