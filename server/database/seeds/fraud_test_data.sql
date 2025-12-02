-- ============================================================
-- FRAUD DETECTION TEST DATA
-- Transaction history for account: 4404001000379 (SWASTIKA PANDIT)
-- This creates a "normal" transaction pattern, so we can test
-- anomaly detection when a suspicious cheque is processed
-- ============================================================

-- First, ensure the account exists and get/set correct account_id
DO $$
DECLARE
    v_account_id INT;
    v_bank_id INT;
BEGIN
    -- Get or create the account
    SELECT account_id, bank_id INTO v_account_id, v_bank_id 
    FROM accounts 
    WHERE account_number = '4404001000379';
    
    IF v_account_id IS NULL THEN
        -- Create the account if it doesn't exist
        INSERT INTO accounts (bank_id, account_number, holder_name, account_type, balance, status)
        VALUES (5, '4404001000379', 'SWASTIKA PANDIT', 'savings', 85000.00, 'active')
        RETURNING account_id INTO v_account_id;
        
        RAISE NOTICE 'Created account with ID: %', v_account_id;
    ELSE
        -- Update balance for testing
        UPDATE accounts SET balance = 85000.00 WHERE account_id = v_account_id;
        RAISE NOTICE 'Using existing account with ID: %', v_account_id;
    END IF;
    
    -- Store the account_id for use in subsequent inserts
    PERFORM set_config('fraud_test.account_id', v_account_id::TEXT, FALSE);
END $$;

-- ============================================================
-- CREATE/UPDATE CUSTOMER PROFILE
-- ============================================================
INSERT INTO customer_profiles (
    account_id,
    national_id,
    phone,
    kyc_status,
    kyc_verified_at,
    -- Transaction patterns (based on 6 months of normal activity)
    avg_transaction_amt,
    max_transaction_amt,
    min_transaction_amt,
    stddev_transaction_amt,
    total_transaction_count,
    monthly_avg_count,
    -- Cheque patterns
    total_cheques_issued,
    bounced_cheques_count,
    bounce_rate,
    cancelled_cheques_count,
    -- Time patterns (typical business hours, weekdays)
    usual_days_of_week,
    usual_hours,
    avg_days_between_txn,
    last_activity_at,
    days_since_last_activity,
    -- Payee patterns
    unique_payee_count,
    regular_payees,
    new_payee_rate,
    -- Risk (normal customer)
    risk_category,
    risk_score,
    updated_at
)
SELECT 
    account_id,
    '19952345678901',           -- National ID
    '+8801712345678',           -- Phone
    'verified',
    NOW() - INTERVAL '1 year',
    -- Transaction patterns: avg ~5000 BDT, max ~15000, typical small transactions
    5500.00,                    -- avg_transaction_amt
    15000.00,                   -- max_transaction_amt
    500.00,                     -- min_transaction_amt
    3200.00,                    -- stddev_transaction_amt (moderate variation)
    45,                         -- total_transaction_count
    7.5,                        -- monthly_avg_count
    -- Cheque patterns
    30,                         -- total_cheques_issued
    1,                          -- bounced_cheques_count
    3.33,                       -- bounce_rate (1/30 = 3.33%)
    2,                          -- cancelled_cheques_count
    -- Time patterns: Mon-Fri (1-5), business hours (9-17)
    ARRAY[1,2,3,4,5],          -- usual_days_of_week
    ARRAY[9,10,11,12,14,15,16,17], -- usual_hours
    5.5,                        -- avg_days_between_txn
    NOW() - INTERVAL '3 days',  -- last_activity_at
    3,                          -- days_since_last_activity
    -- Payee patterns
    12,                         -- unique_payee_count
    ARRAY['Grocery Store', 'Electric Bill', 'Phone Bill', 'Self', 'Rent'],
    25.00,                      -- new_payee_rate (25% to new payees)
    -- Risk
    'low',
    25.00,                      -- risk_score (low risk customer)
    NOW()
FROM accounts WHERE account_number = '4404001000379'
ON CONFLICT (account_id) DO UPDATE SET
    avg_transaction_amt = EXCLUDED.avg_transaction_amt,
    max_transaction_amt = EXCLUDED.max_transaction_amt,
    min_transaction_amt = EXCLUDED.min_transaction_amt,
    stddev_transaction_amt = EXCLUDED.stddev_transaction_amt,
    total_transaction_count = EXCLUDED.total_transaction_count,
    monthly_avg_count = EXCLUDED.monthly_avg_count,
    total_cheques_issued = EXCLUDED.total_cheques_issued,
    bounced_cheques_count = EXCLUDED.bounced_cheques_count,
    bounce_rate = EXCLUDED.bounce_rate,
    usual_days_of_week = EXCLUDED.usual_days_of_week,
    usual_hours = EXCLUDED.usual_hours,
    avg_days_between_txn = EXCLUDED.avg_days_between_txn,
    last_activity_at = EXCLUDED.last_activity_at,
    unique_payee_count = EXCLUDED.unique_payee_count,
    regular_payees = EXCLUDED.regular_payees,
    new_payee_rate = EXCLUDED.new_payee_rate,
    risk_category = EXCLUDED.risk_category,
    risk_score = EXCLUDED.risk_score,
    updated_at = NOW();

-- ============================================================
-- INSERT HISTORICAL TRANSACTIONS (Last 6 months)
-- Normal spending pattern for SWASTIKA PANDIT
-- ============================================================

-- Delete any existing test transactions for this account
DELETE FROM transactions WHERE account_id = (
    SELECT account_id FROM accounts WHERE account_number = '4404001000379'
);

-- Insert 45 historical transactions showing normal behavior
INSERT INTO transactions (account_id, txn_type, amount, balance_after, receiver_name, receiver_account, receiver_label, txn_date, txn_time, txn_number, created_at)
SELECT 
    a.account_id,
    'debit',
    t.amount,
    t.balance_after,
    t.receiver_name,
    t.receiver_account,
    t.receiver_label,
    t.txn_date,
    t.txn_time,
    t.txn_number,
    t.txn_date + t.txn_time
FROM accounts a
CROSS JOIN (VALUES
    -- Regular monthly bills (predictable pattern)
    (2500.00, 82500.00, 'Electric Bill', 'DPDC-001', 'regular', '2025-06-15'::DATE, '10:30:00'::TIME, 1),
    (1200.00, 81300.00, 'Phone Bill', 'GP-001', 'regular', '2025-06-18'::DATE, '11:00:00'::TIME, 2),
    (3500.00, 77800.00, 'Grocery Store', 'AGORA-001', 'regular', '2025-06-22'::DATE, '14:30:00'::TIME, 3),
    (5000.00, 72800.00, 'Self', 'SELF', 'regular', '2025-06-25'::DATE, '10:00:00'::TIME, 4),
    
    (2600.00, 70200.00, 'Electric Bill', 'DPDC-001', 'regular', '2025-07-15'::DATE, '10:45:00'::TIME, 5),
    (1200.00, 69000.00, 'Phone Bill', 'GP-001', 'regular', '2025-07-18'::DATE, '11:15:00'::TIME, 6),
    (4200.00, 64800.00, 'Grocery Store', 'AGORA-001', 'regular', '2025-07-20'::DATE, '15:00:00'::TIME, 7),
    (8000.00, 56800.00, 'Rent', 'LANDLORD-001', 'regular', '2025-07-01'::DATE, '09:30:00'::TIME, 8),
    (6000.00, 50800.00, 'Self', 'SELF', 'regular', '2025-07-28'::DATE, '10:30:00'::TIME, 9),
    
    (2550.00, 48250.00, 'Electric Bill', 'DPDC-001', 'regular', '2025-08-15'::DATE, '10:30:00'::TIME, 10),
    (1250.00, 47000.00, 'Phone Bill', 'GP-001', 'regular', '2025-08-17'::DATE, '11:00:00'::TIME, 11),
    (3800.00, 43200.00, 'Grocery Store', 'AGORA-001', 'regular', '2025-08-21'::DATE, '14:45:00'::TIME, 12),
    (8000.00, 35200.00, 'Rent', 'LANDLORD-001', 'regular', '2025-08-01'::DATE, '09:15:00'::TIME, 13),
    (4500.00, 30700.00, 'Self', 'SELF', 'regular', '2025-08-26'::DATE, '10:00:00'::TIME, 14),
    (2000.00, 28700.00, 'Medicine', 'PHARMACY-001', 'unique', '2025-08-10'::DATE, '16:30:00'::TIME, 15),
    
    (2700.00, 26000.00, 'Electric Bill', 'DPDC-001', 'regular', '2025-09-15'::DATE, '10:30:00'::TIME, 16),
    (1200.00, 24800.00, 'Phone Bill', 'GP-001', 'regular', '2025-09-18'::DATE, '11:00:00'::TIME, 17),
    (4000.00, 20800.00, 'Grocery Store', 'AGORA-001', 'regular', '2025-09-22'::DATE, '15:15:00'::TIME, 18),
    (8000.00, 12800.00, 'Rent', 'LANDLORD-001', 'regular', '2025-09-01'::DATE, '09:30:00'::TIME, 19),
    (5500.00, 7300.00, 'Self', 'SELF', 'regular', '2025-09-25'::DATE, '10:30:00'::TIME, 20),
    
    -- Some deposits to keep balance up
    -- (These are credits, but we'll simulate with positive balance_after)
    
    (2650.00, 77350.00, 'Electric Bill', 'DPDC-001', 'regular', '2025-10-15'::DATE, '10:30:00'::TIME, 21),
    (1300.00, 76050.00, 'Phone Bill', 'GP-001', 'regular', '2025-10-18'::DATE, '11:00:00'::TIME, 22),
    (3700.00, 72350.00, 'Grocery Store', 'AGORA-001', 'regular', '2025-10-20'::DATE, '14:30:00'::TIME, 23),
    (8000.00, 64350.00, 'Rent', 'LANDLORD-001', 'regular', '2025-10-01'::DATE, '09:30:00'::TIME, 24),
    (5000.00, 59350.00, 'Self', 'SELF', 'regular', '2025-10-28'::DATE, '10:00:00'::TIME, 25),
    (15000.00, 44350.00, 'Furniture Shop', 'HATIL-001', 'unique', '2025-10-12'::DATE, '16:00:00'::TIME, 26),
    
    (2600.00, 82400.00, 'Electric Bill', 'DPDC-001', 'regular', '2025-11-15'::DATE, '10:45:00'::TIME, 27),
    (1200.00, 81200.00, 'Phone Bill', 'GP-001', 'regular', '2025-11-18'::DATE, '11:00:00'::TIME, 28),
    (4100.00, 77100.00, 'Grocery Store', 'AGORA-001', 'regular', '2025-11-21'::DATE, '14:45:00'::TIME, 29),
    (8000.00, 69100.00, 'Rent', 'LANDLORD-001', 'regular', '2025-11-01'::DATE, '09:30:00'::TIME, 30),
    (6000.00, 63100.00, 'Self', 'SELF', 'regular', '2025-11-27'::DATE, '10:30:00'::TIME, 31),
    (3000.00, 60100.00, 'Gas Bill', 'TITAS-001', 'regular', '2025-11-10'::DATE, '10:00:00'::TIME, 32),
    (2500.00, 57600.00, 'Internet Bill', 'LINK3-001', 'regular', '2025-11-12'::DATE, '11:30:00'::TIME, 33),
    
    -- Recent December transactions (closer to "now")
    (2700.00, 85300.00, 'Electric Bill', 'DPDC-001', 'regular', '2025-12-01'::DATE, '10:30:00'::TIME, 34),
    (1250.00, 84050.00, 'Phone Bill', 'GP-001', 'regular', '2025-12-01'::DATE, '11:00:00'::TIME, 35),
    (8000.00, 76050.00, 'Rent', 'LANDLORD-001', 'regular', '2025-12-01'::DATE, '09:30:00'::TIME, 36),
    (3500.00, 72550.00, 'Grocery Store', 'AGORA-001', 'regular', '2025-12-02'::DATE, '15:00:00'::TIME, 37)
    
) AS t(amount, balance_after, receiver_name, receiver_account, receiver_label, txn_date, txn_time, txn_number)
WHERE a.account_number = '4404001000379';

-- ============================================================
-- UPDATE ACCOUNT BALANCE
-- ============================================================
UPDATE accounts 
SET balance = 85000.00  -- Current balance
WHERE account_number = '4404001000379';

-- ============================================================
-- VERIFY DATA
-- ============================================================
DO $$
DECLARE
    txn_count INT;
    profile_exists BOOLEAN;
    acct_balance NUMERIC;
BEGIN
    SELECT COUNT(*) INTO txn_count 
    FROM transactions t
    JOIN accounts a ON t.account_id = a.account_id
    WHERE a.account_number = '4404001000379';
    
    SELECT EXISTS(
        SELECT 1 FROM customer_profiles cp
        JOIN accounts a ON cp.account_id = a.account_id
        WHERE a.account_number = '4404001000379'
    ) INTO profile_exists;
    
    SELECT balance INTO acct_balance 
    FROM accounts WHERE account_number = '4404001000379';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FRAUD DETECTION TEST DATA LOADED';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Account: 4404001000379 (SWASTIKA PANDIT)';
    RAISE NOTICE 'Transactions loaded: %', txn_count;
    RAISE NOTICE 'Customer profile exists: %', profile_exists;
    RAISE NOTICE 'Current balance: ৳%', acct_balance;
    RAISE NOTICE '';
    RAISE NOTICE 'Normal Pattern:';
    RAISE NOTICE '  - Avg transaction: ৳5,500';
    RAISE NOTICE '  - Max transaction: ৳15,000';
    RAISE NOTICE '  - Regular payees: Bills, Rent, Self, Grocery';
    RAISE NOTICE '  - Usual hours: 9am-5pm weekdays';
    RAISE NOTICE '';
    RAISE NOTICE 'To trigger FRAUD ALERT, process a cheque with:';
    RAISE NOTICE '  - Amount > ৳15,000 (above max)';
    RAISE NOTICE '  - New payee (not in regular list)';
    RAISE NOTICE '  - Night time processing';
    RAISE NOTICE '  - Amount > ৳50,000 would be CRITICAL';
    RAISE NOTICE '============================================';
END $$;

-- Show summary
SELECT 
    'Account' as info,
    a.account_number,
    a.holder_name,
    a.balance::TEXT as value
FROM accounts a 
WHERE a.account_number = '4404001000379'
UNION ALL
SELECT 
    'Profile Avg Amt',
    '',
    '',
    cp.avg_transaction_amt::TEXT
FROM customer_profiles cp
JOIN accounts a ON cp.account_id = a.account_id
WHERE a.account_number = '4404001000379'
UNION ALL
SELECT 
    'Profile Max Amt',
    '',
    '',
    cp.max_transaction_amt::TEXT
FROM customer_profiles cp
JOIN accounts a ON cp.account_id = a.account_id
WHERE a.account_number = '4404001000379'
UNION ALL
SELECT 
    'Transaction Count',
    '',
    '',
    COUNT(*)::TEXT
FROM transactions t
JOIN accounts a ON t.account_id = a.account_id
WHERE a.account_number = '4404001000379';
