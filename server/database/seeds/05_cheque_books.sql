-- ============================================================
-- CHEQUE BOOKS SEED DATA
-- Run after 02_accounts.sql
-- Each account gets 1-2 cheque books
-- ============================================================

INSERT INTO cheque_books (cheque_book_id, account_id, serial_start, serial_end, issued_date, status) VALUES

-- Alice Rahman - 1 active book (25 leaves)
(1, 1, 100001, 100025, '2024-06-20', 'active'),

-- Bob Chowdhury - 2 books (business needs more cheques)
(2, 2, 200001, 200050, '2024-03-25', 'exhausted'),  -- First book used up
(3, 2, 200051, 200100, '2024-09-15', 'active'),      -- Current book

-- Carol Ahmed - 1 active book (50 leaves, high net worth)
(4, 3, 300001, 300050, '2024-01-10', 'active'),

-- David Khan - 1 active book
(5, 4, 400001, 400025, '2024-08-10', 'active'),

-- Eve Hossain - 2 books (corporate executive)
(6, 5, 500001, 500050, '2023-10-01', 'exhausted'),
(7, 5, 500051, 500100, '2024-06-01', 'active'),

-- A. H. M. MANSUR - 1 active book (IBBL)
(8, 7, 600001, 600025, '2025-01-20', 'active'),

-- SWASTIKA PANDIT - 1 active book (Sonali Bank)
(9, 8, 700001, 700025, '2025-06-25', 'active')

ON CONFLICT (cheque_book_id) DO NOTHING;

-- Reset sequence
SELECT setval('cheque_books_cheque_book_id_seq', (SELECT MAX(cheque_book_id) FROM cheque_books));
