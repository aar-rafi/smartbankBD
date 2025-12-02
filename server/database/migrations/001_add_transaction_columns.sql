-- ============================================================
-- MIGRATION: Add enhanced columns to transactions table
-- Adds receiver info, time patterns, and branch data for fraud detection
-- ============================================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Receiver/Payee Info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='receiver_name') THEN
        ALTER TABLE transactions ADD COLUMN receiver_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='receiver_account') THEN
        ALTER TABLE transactions ADD COLUMN receiver_account VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='receiver_label') THEN
        ALTER TABLE transactions ADD COLUMN receiver_label VARCHAR(15) DEFAULT 'unique';
    END IF;
    
    -- Time & Location
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='txn_date') THEN
        ALTER TABLE transactions ADD COLUMN txn_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='txn_time') THEN
        ALTER TABLE transactions ADD COLUMN txn_time TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='branch_code') THEN
        ALTER TABLE transactions ADD COLUMN branch_code VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='branch_name') THEN
        ALTER TABLE transactions ADD COLUMN branch_name VARCHAR(100);
    END IF;
    
    -- Frequency Tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='txn_number') THEN
        ALTER TABLE transactions ADD COLUMN txn_number INT;
    END IF;
END $$;

-- Add indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_receiver') THEN
        CREATE INDEX idx_transactions_receiver ON transactions(receiver_name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_date') THEN
        CREATE INDEX idx_transactions_date ON transactions(txn_date);
    END IF;
END $$;

\echo 'Migration complete: transactions table updated'
