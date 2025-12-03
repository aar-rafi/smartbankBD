-- Migration: Extend cheques.status column to support 'validation_failed' status
-- This allows storing cheques that fail basic validation (faulty attempts)

-- Drop dependent views first
DROP VIEW IF EXISTS v_today_stats;
DROP VIEW IF EXISTS v_supervisor_queue;

-- Extend status column from VARCHAR(15) to VARCHAR(20)
ALTER TABLE cheques ALTER COLUMN status TYPE VARCHAR(20);

-- Recreate v_today_stats view with validation_failed count
CREATE VIEW v_today_stats AS
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'received') AS received,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved,
    COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
    COUNT(*) FILTER (WHERE status = 'flagged') AS flagged,
    COUNT(*) FILTER (WHERE status = 'validation_failed') AS validation_failed,
    SUM(amount) AS total_amount
FROM cheques WHERE created_at::date = CURRENT_DATE;

-- Verify
SELECT column_name, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'cheques' AND column_name = 'status';

