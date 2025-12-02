-- Migration: Add unique constraint on deep_verifications.cheque_id
-- This allows ON CONFLICT (cheque_id) to work for upserts
-- Run this if you get "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'deep_verifications_cheque_id_unique'
        OR indexname = 'idx_deep_ver_cheque_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_deep_ver_cheque_unique ON deep_verifications(cheque_id);
    END IF;
END $$;

-- Verify
SELECT indexname FROM pg_indexes WHERE tablename = 'deep_verifications' AND indexname LIKE '%unique%';

