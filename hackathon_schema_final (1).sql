-- ============================================================
-- CHEQUE FRAUD DETECTION - PRUNED SCHEMA (16 Tables)
-- Hackathon Ready - Clean & Simple
-- CORRECTED VERSION - All FKs verified
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. BANKS
-- ============================================================
CREATE TABLE banks (
    bank_id         SERIAL PRIMARY KEY,
    bank_code       VARCHAR(20) UNIQUE NOT NULL,
    bank_name       VARCHAR(100) NOT NULL,
    bank_type       VARCHAR(20) DEFAULT 'commercial',  -- commercial, central
    routing_number  VARCHAR(20)
);

INSERT INTO banks (bank_code, bank_name, bank_type, routing_number) VALUES
('BANK_A', 'Alpha Bank Ltd', 'commercial', '010123456'),
('BANK_B', 'Beta Bank Ltd', 'commercial', '020234567'),
('BB', 'Bangladesh Bank', 'central', '000000000');

-- ============================================================
-- 2. ACCOUNTS
-- ============================================================
CREATE TABLE accounts (
    account_id      SERIAL PRIMARY KEY,
    bank_id         INT NOT NULL REFERENCES banks(bank_id),
    account_number  VARCHAR(20) UNIQUE NOT NULL,
    holder_name     VARCHAR(100) NOT NULL,
    account_type    VARCHAR(20) DEFAULT 'savings',  -- savings, current
    balance         NUMERIC(18,2) DEFAULT 0,
    status          VARCHAR(10) DEFAULT 'active',   -- active, frozen, closed
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_bank ON accounts(bank_id);

-- ============================================================
-- 3. CUSTOMER_PROFILES (AI Behavior Data)
-- ============================================================
CREATE TABLE customer_profiles (
    profile_id              SERIAL PRIMARY KEY,
    account_id              INT UNIQUE NOT NULL REFERENCES accounts(account_id),
    national_id             VARCHAR(50),
    phone                   VARCHAR(20),
    
    -- KYC
    kyc_status              VARCHAR(15) DEFAULT 'pending',  -- pending, verified, expired
    kyc_verified_at         TIMESTAMPTZ,
    
    -- ========== TRANSACTION PATTERNS ==========
    avg_transaction_amt     NUMERIC(18,2) DEFAULT 0,
    max_transaction_amt     NUMERIC(18,2) DEFAULT 0,
    min_transaction_amt     NUMERIC(18,2) DEFAULT 0,
    stddev_transaction_amt  NUMERIC(18,2) DEFAULT 0,        -- How much amounts vary
    total_transaction_count INT DEFAULT 0,
    monthly_avg_count       NUMERIC(5,2) DEFAULT 0,         -- Avg cheques per month
    
    -- ========== CHEQUE PATTERNS ==========
    total_cheques_issued    INT DEFAULT 0,
    bounced_cheques_count   INT DEFAULT 0,
    bounce_rate             NUMERIC(5,2) DEFAULT 0,         -- % of cheques bounced
    cancelled_cheques_count INT DEFAULT 0,
    
    -- ========== TIME PATTERNS ==========
    usual_days_of_week      INT[] DEFAULT '{}',             -- [1,2,5] = Mon,Tue,Fri
    usual_hours             INT[] DEFAULT '{}',             -- [9,10,11,14,15] = 9am-11am, 2-3pm
    avg_days_between_txn    NUMERIC(5,2) DEFAULT 0,         -- Avg gap between transactions
    last_activity_at        TIMESTAMPTZ,
    days_since_last_activity INT DEFAULT 0,
    
    -- ========== PAYEE PATTERNS ==========
    unique_payee_count      INT DEFAULT 0,
    regular_payees          TEXT[] DEFAULT '{}',            -- Top 5 frequent payees
    new_payee_rate          NUMERIC(5,2) DEFAULT 0,         -- % of txn to new payees
    
    -- ========== RISK SCORING ==========
    risk_category           VARCHAR(10) DEFAULT 'medium',   -- low, medium, high, critical
    risk_score              NUMERIC(5,2) DEFAULT 50,        -- 0-100 computed score
    
    -- ========== AI VECTOR (for advanced similarity) ==========
    behavior_vector         VECTOR(512),                    -- Embedding of all above features
    
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_national_id ON customer_profiles(national_id);
CREATE INDEX idx_profiles_risk ON customer_profiles(risk_category);

-- ============================================================
-- 4. KYC_DOCUMENTS
-- ============================================================
CREATE TABLE kyc_documents (
    document_id     SERIAL PRIMARY KEY,
    account_id      INT NOT NULL REFERENCES accounts(account_id),
    doc_type        VARCHAR(30) NOT NULL,  -- nid, passport, utility_bill
    doc_number      VARCHAR(50),
    image_path      VARCHAR(255),
    ocr_data        JSONB,
    is_verified     BOOLEAN DEFAULT FALSE,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kyc_account ON kyc_documents(account_id);

-- ============================================================
-- 5. CHEQUE_BOOKS
-- ============================================================
CREATE TABLE cheque_books (
    cheque_book_id  SERIAL PRIMARY KEY,
    account_id      INT NOT NULL REFERENCES accounts(account_id),
    serial_start    BIGINT NOT NULL,
    serial_end      BIGINT NOT NULL,
    issued_date     DATE DEFAULT CURRENT_DATE,
    status          VARCHAR(10) DEFAULT 'active',  -- active, exhausted, lost, stolen
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chequebooks_account ON cheque_books(account_id);

-- ============================================================
-- 6. CHEQUE_LEAVES
-- ============================================================
CREATE TABLE cheque_leaves (
    leaf_id         SERIAL PRIMARY KEY,
    cheque_book_id  INT NOT NULL REFERENCES cheque_books(cheque_book_id),
    cheque_number   BIGINT NOT NULL,
    status          VARCHAR(10) DEFAULT 'unused',  -- unused, used, cancelled, lost, stopped
    stop_payment    BOOLEAN DEFAULT FALSE,
    used_at         TIMESTAMPTZ,
    UNIQUE(cheque_book_id, cheque_number)
);

CREATE INDEX idx_leaves_cheque_number ON cheque_leaves(cheque_number);

-- ============================================================
-- 7. ACCOUNT_SIGNATURES (Reference for AI matching)
-- ============================================================
CREATE TABLE account_signatures (
    signature_id    SERIAL PRIMARY KEY,
    account_id      INT NOT NULL REFERENCES accounts(account_id),
    image_path      VARCHAR(255),
    feature_vector  VECTOR(512),
    is_primary      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signatures_account ON account_signatures(account_id);

-- ============================================================
-- 8. CHEQUES (Main Entity)
-- ============================================================
CREATE TABLE cheques (
    cheque_id               SERIAL PRIMARY KEY,
    cheque_number           BIGINT NOT NULL,
    leaf_id                 INT REFERENCES cheque_leaves(leaf_id),
    
    -- Drawer (Bank-B side - who wrote it)
    drawer_account_id       INT NOT NULL REFERENCES accounts(account_id),
    drawer_bank_id          INT NOT NULL REFERENCES banks(bank_id),
    
    -- Depositor (Bank-A side - who deposited it)
    depositor_account_id    INT REFERENCES accounts(account_id),
    presenting_bank_id      INT REFERENCES banks(bank_id),
    
    -- Cheque Details
    payee_name              VARCHAR(100) NOT NULL,
    amount                  NUMERIC(18,2) NOT NULL,
    amount_in_words         VARCHAR(200),
    issue_date              DATE NOT NULL,
    micr_code               VARCHAR(30),
    
    -- Images
    cheque_image_path       VARCHAR(255),
    signature_image_path    VARCHAR(255),
    
    -- Status tracking
    status                  VARCHAR(15) DEFAULT 'received',
    -- received → validated → clearing → approved/rejected/flagged → settled/bounced
    
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cheques_status ON cheques(status);
CREATE INDEX idx_cheques_drawer ON cheques(drawer_account_id);
CREATE INDEX idx_cheques_number ON cheques(cheque_number);

-- ============================================================
-- 9. INITIAL_VALIDATIONS (Stage 1 - Bank A)
-- ============================================================
CREATE TABLE initial_validations (
    validation_id       SERIAL PRIMARY KEY,
    cheque_id           INT NOT NULL REFERENCES cheques(cheque_id),
    
    -- Field Checks
    all_fields_present  BOOLEAN,
    date_valid          BOOLEAN,
    micr_readable       BOOLEAN,
    
    -- OCR
    ocr_amount          NUMERIC(18,2),
    ocr_confidence      NUMERIC(5,2),  -- 0-100
    amount_match        BOOLEAN,
    
    -- Result
    validation_status   VARCHAR(15) NOT NULL,  -- passed, failed
    failure_reason      TEXT,
    validated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_initial_val_cheque ON initial_validations(cheque_id);

-- ============================================================
-- 10. BLACKLIST
-- ============================================================
CREATE TABLE blacklist (
    blacklist_id    SERIAL PRIMARY KEY,
    entry_type      VARCHAR(20) NOT NULL,  -- account, cheque, person
    account_number  VARCHAR(20),
    cheque_number   BIGINT,
    national_id     VARCHAR(50),
    reason          VARCHAR(30),  -- fraud, stolen, lost, stop_payment
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blacklist_account ON blacklist(account_number);
CREATE INDEX idx_blacklist_cheque ON blacklist(cheque_number);
CREATE INDEX idx_blacklist_national_id ON blacklist(national_id);

-- ============================================================
-- 11. BB_CLEARINGS (Stage 2 - Bangladesh Bank)
-- FIXED: Added blacklist_match_id FK
-- ============================================================
CREATE TABLE bb_clearings (
    clearing_id         SERIAL PRIMARY KEY,
    cheque_id           INT NOT NULL REFERENCES cheques(cheque_id),
    clearing_reference  VARCHAR(30) UNIQUE,
    
    -- Routing
    from_bank_id        INT REFERENCES banks(bank_id),
    to_bank_id          INT REFERENCES banks(bank_id),
    received_at         TIMESTAMPTZ DEFAULT NOW(),
    forwarded_at        TIMESTAMPTZ,
    
    -- BB Checks (with FK to show which blacklist entry matched)
    blacklist_hit       BOOLEAN DEFAULT FALSE,
    blacklist_match_id  INT REFERENCES blacklist(blacklist_id),  -- ← FIXED: Now connected!
    duplicate_hit       BOOLEAN DEFAULT FALSE,
    duplicate_of_cheque INT REFERENCES cheques(cheque_id),       -- ← ADDED: Which cheque is duplicate of
    stop_payment_hit    BOOLEAN DEFAULT FALSE,
    
    -- Status
    status              VARCHAR(15) DEFAULT 'pending',  -- pending, forwarded, responded
    response_status     VARCHAR(15),  -- approved, rejected, flagged
    response_at         TIMESTAMPTZ
);

CREATE INDEX idx_bb_clearing_cheque ON bb_clearings(cheque_id);
CREATE INDEX idx_bb_clearing_status ON bb_clearings(status);

-- ============================================================
-- 12. DEEP_VERIFICATIONS (Stage 3 - Bank B + AI)
-- FIXED: Added matched_signature_id FK
-- ============================================================
CREATE TABLE deep_verifications (
    verification_id     SERIAL PRIMARY KEY,
    cheque_id           INT NOT NULL REFERENCES cheques(cheque_id),
    
    -- Basic Checks
    account_active      BOOLEAN,
    sufficient_funds    BOOLEAN,
    cheque_leaf_valid   BOOLEAN,
    
    -- AI: Signature (with FK to matched signature)
    matched_signature_id INT REFERENCES account_signatures(signature_id),
    signature_score     NUMERIC(5,2),  -- 0-100
    signature_match     VARCHAR(15),   -- match, no_match, inconclusive
    
    -- ========== AI: BEHAVIOR ANALYSIS ==========
    behavior_score      NUMERIC(5,2),  -- 0-100 (higher = more anomalous)
    
    -- Individual behavior checks (for explainability!)
    amount_deviation    NUMERIC(5,2),  -- How many std devs from avg
    is_unusual_amount   BOOLEAN,       -- Amount > 3x their usual max
    is_new_payee        BOOLEAN,       -- First time paying this person
    is_unusual_day      BOOLEAN,       -- Transaction on unusual day
    is_unusual_time     BOOLEAN,       -- Transaction at unusual hour
    is_high_velocity    BOOLEAN,       -- Too many cheques in short period
    is_dormant_account  BOOLEAN,       -- Account was inactive > 90 days
    velocity_24h        INT,           -- Cheques in last 24h
    
    behavior_flags      TEXT[],        -- Summary: ['unusual_amount', 'new_payee']
    
    -- ========== AI: COMBINED RISK ==========
    fraud_risk_score    NUMERIC(5,2),  -- 0-100 (weighted: 40% sig + 60% behavior)
    risk_level          VARCHAR(10),   -- low, medium, high, critical
    ai_decision         VARCHAR(20),   -- approve, reject, flag_for_review
    ai_confidence       NUMERIC(5,2),  -- 0-100
    ai_reasoning        TEXT,          -- "High risk: unusual amount + new payee"
    
    -- Final
    final_decision      VARCHAR(15),   -- approved, rejected
    decision_by         VARCHAR(15),   -- system, supervisor
    decision_notes      TEXT,
    verified_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deep_ver_cheque ON deep_verifications(cheque_id);

-- ============================================================
-- 13. FRAUD_FLAGS (Supervisor Queue)
-- ============================================================
CREATE TABLE fraud_flags (
    flag_id         SERIAL PRIMARY KEY,
    cheque_id       INT NOT NULL REFERENCES cheques(cheque_id),
    reason          TEXT NOT NULL,
    priority        VARCHAR(10) DEFAULT 'medium',  -- low, medium, high, urgent
    
    -- Review
    status          VARCHAR(15) DEFAULT 'pending',  -- pending, approved, rejected
    review_notes    TEXT,
    reviewed_at     TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_flags_cheque ON fraud_flags(cheque_id);
CREATE INDEX idx_fraud_flags_status ON fraud_flags(status);

-- ============================================================
-- 14. SETTLEMENTS (Money Movement)
-- ============================================================
CREATE TABLE settlements (
    settlement_id       SERIAL PRIMARY KEY,
    cheque_id           INT NOT NULL REFERENCES cheques(cheque_id),
    
    -- Debit (from drawer)
    from_account_id     INT NOT NULL REFERENCES accounts(account_id),
    debit_amount        NUMERIC(18,2) NOT NULL,
    debited_at          TIMESTAMPTZ,
    
    -- Credit (to depositor)
    to_account_id       INT NOT NULL REFERENCES accounts(account_id),
    credit_amount       NUMERIC(18,2) NOT NULL,
    credited_at         TIMESTAMPTZ,
    
    status              VARCHAR(15) DEFAULT 'pending',  -- pending, completed, failed
    completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_settlements_cheque ON settlements(cheque_id);

-- ============================================================
-- 15. TRANSACTIONS (Ledger)
-- ============================================================
CREATE TABLE transactions (
    transaction_id  SERIAL PRIMARY KEY,
    settlement_id   INT REFERENCES settlements(settlement_id),
    cheque_id       INT REFERENCES cheques(cheque_id),
    account_id      INT NOT NULL REFERENCES accounts(account_id),
    txn_type        VARCHAR(10) NOT NULL,  -- debit, credit
    amount          NUMERIC(18,2) NOT NULL,
    balance_after   NUMERIC(18,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_cheque ON transactions(cheque_id);

-- ============================================================
-- 16. CHEQUE_BOUNCES
-- ============================================================
CREATE TABLE cheque_bounces (
    bounce_id       SERIAL PRIMARY KEY,
    cheque_id       INT NOT NULL REFERENCES cheques(cheque_id),
    reason_code     VARCHAR(20) NOT NULL,  -- INSUF_FUNDS, SIG_MISMATCH, etc.
    reason_text     TEXT,
    bounced_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bounces_cheque ON cheque_bounces(cheque_id);

-- ============================================================
-- QUICK VIEWS FOR DASHBOARD
-- ============================================================

-- Supervisor Review Queue
CREATE VIEW v_review_queue AS
SELECT 
    f.flag_id, f.priority, f.reason, f.status, f.created_at,
    c.cheque_id, c.cheque_number, c.amount, c.payee_name,
    a.account_number, a.holder_name,
    d.fraud_risk_score, d.risk_level, d.ai_decision
FROM fraud_flags f
JOIN cheques c ON f.cheque_id = c.cheque_id
JOIN accounts a ON c.drawer_account_id = a.account_id
LEFT JOIN deep_verifications d ON c.cheque_id = d.cheque_id
WHERE f.status = 'pending'
ORDER BY CASE f.priority 
    WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 ELSE 4 END;

-- Today's Stats
CREATE VIEW v_today_stats AS
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'received') AS received,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved,
    COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
    COUNT(*) FILTER (WHERE status = 'flagged') AS flagged,
    SUM(amount) AS total_amount
FROM cheques WHERE created_at::date = CURRENT_DATE;

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

-- ============================================================
-- RELATIONSHIP SUMMARY (All FKs verified ✓)
-- ============================================================
-- banks              ← accounts.bank_id
-- accounts           ← customer_profiles.account_id
-- accounts           ← kyc_documents.account_id
-- accounts           ← cheque_books.account_id
-- accounts           ← account_signatures.account_id
-- accounts           ← cheques.drawer_account_id
-- accounts           ← cheques.depositor_account_id
-- accounts           ← settlements.from_account_id
-- accounts           ← settlements.to_account_id
-- accounts           ← transactions.account_id
-- banks              ← cheques.drawer_bank_id
-- banks              ← cheques.presenting_bank_id
-- banks              ← bb_clearings.from_bank_id
-- banks              ← bb_clearings.to_bank_id
-- cheque_books       ← cheque_leaves.cheque_book_id
-- cheque_leaves      ← cheques.leaf_id
-- cheques            ← initial_validations.cheque_id
-- cheques            ← bb_clearings.cheque_id
-- cheques            ← bb_clearings.duplicate_of_cheque  ← NEW
-- cheques            ← deep_verifications.cheque_id
-- cheques            ← fraud_flags.cheque_id
-- cheques            ← settlements.cheque_id
-- cheques            ← transactions.cheque_id
-- cheques            ← cheque_bounces.cheque_id
-- blacklist          ← bb_clearings.blacklist_match_id   ← FIXED
-- account_signatures ← deep_verifications.matched_signature_id  ← FIXED
-- settlements        ← transactions.settlement_id
-- ============================================================

-- DONE! 16 TABLES, ALL RELATIONSHIPS VERIFIED ✓
