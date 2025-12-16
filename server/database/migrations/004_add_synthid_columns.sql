-- ============================================================
-- MIGRATION: Add SynthID columns to cheques table
-- Stores AI detection results from Gemini SynthID analysis
-- ============================================================

DO $$
BEGIN
    -- Add synth_id_confidence column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cheques' AND column_name = 'synth_id_confidence'
    ) THEN
        ALTER TABLE cheques ADD COLUMN synth_id_confidence NUMERIC(5,2);
        RAISE NOTICE 'Added synth_id_confidence column to cheques table.';
    ELSE
        RAISE NOTICE 'Column synth_id_confidence already exists.';
    END IF;

    -- Add is_ai_generated column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cheques' AND column_name = 'is_ai_generated'
    ) THEN
        ALTER TABLE cheques ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_ai_generated column to cheques table.';
    ELSE
        RAISE NOTICE 'Column is_ai_generated already exists.';
    END IF;
END $$;

\echo 'Migration complete: Added SynthID columns to cheques table'

