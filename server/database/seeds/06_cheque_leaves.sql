-- ============================================================
-- CHEQUE LEAVES SEED DATA
-- Run after 05_cheque_books.sql
-- Creates individual leaves for each cheque book
-- Only creating first 10 leaves per book for demo purposes
-- ============================================================

-- Helper: Generate leaves for active books
-- Book 1: Alice Rahman (100001-100025)
INSERT INTO cheque_leaves (leaf_id, cheque_book_id, cheque_number, status, stop_payment, used_at) VALUES
(1, 1, 100001, 'used', FALSE, '2024-07-15 10:00:00+06'),
(2, 1, 100002, 'used', FALSE, '2024-08-20 11:30:00+06'),
(3, 1, 100003, 'used', FALSE, '2024-09-10 14:00:00+06'),
(4, 1, 100004, 'cancelled', FALSE, NULL),
(5, 1, 100005, 'unused', FALSE, NULL),
(6, 1, 100006, 'unused', FALSE, NULL),
(7, 1, 100007, 'unused', FALSE, NULL),
(8, 1, 100008, 'unused', FALSE, NULL),
(9, 1, 100009, 'unused', FALSE, NULL),
(10, 1, 100010, 'unused', FALSE, NULL),

-- Book 3: Bob Chowdhury current book (200051-200100)
(11, 3, 200051, 'used', FALSE, '2024-09-20 09:00:00+06'),
(12, 3, 200052, 'used', FALSE, '2024-10-05 10:30:00+06'),
(13, 3, 200053, 'used', FALSE, '2024-10-15 11:00:00+06'),
(14, 3, 200054, 'used', FALSE, '2024-11-01 14:00:00+06'),
(15, 3, 200055, 'stopped', TRUE, NULL),  -- Stop payment issued
(16, 3, 200056, 'unused', FALSE, NULL),
(17, 3, 200057, 'unused', FALSE, NULL),
(18, 3, 200058, 'unused', FALSE, NULL),
(19, 3, 200059, 'unused', FALSE, NULL),
(20, 3, 200060, 'unused', FALSE, NULL),

-- Book 4: Carol Ahmed (300001-300050)
(21, 4, 300001, 'used', FALSE, '2024-02-10 10:00:00+06'),
(22, 4, 300002, 'used', FALSE, '2024-03-15 11:00:00+06'),
(23, 4, 300003, 'used', FALSE, '2024-04-20 09:30:00+06'),
(24, 4, 300004, 'used', FALSE, '2024-05-25 14:00:00+06'),
(25, 4, 300005, 'used', FALSE, '2024-06-30 10:00:00+06'),
(26, 4, 300006, 'unused', FALSE, NULL),
(27, 4, 300007, 'unused', FALSE, NULL),
(28, 4, 300008, 'unused', FALSE, NULL),
(29, 4, 300009, 'unused', FALSE, NULL),
(30, 4, 300010, 'unused', FALSE, NULL),

-- Book 5: David Khan (400001-400025)
(31, 5, 400001, 'used', FALSE, '2024-08-20 15:00:00+06'),
(32, 5, 400002, 'used', FALSE, '2024-09-10 16:00:00+06'),
(33, 5, 400003, 'lost', FALSE, NULL),  -- Lost cheque
(34, 5, 400004, 'unused', FALSE, NULL),
(35, 5, 400005, 'unused', FALSE, NULL),
(36, 5, 400006, 'unused', FALSE, NULL),
(37, 5, 400007, 'unused', FALSE, NULL),
(38, 5, 400008, 'unused', FALSE, NULL),
(39, 5, 400009, 'unused', FALSE, NULL),
(40, 5, 400010, 'unused', FALSE, NULL),

-- Book 7: Eve Hossain current book (500051-500100)
(41, 7, 500051, 'used', FALSE, '2024-06-15 10:00:00+06'),
(42, 7, 500052, 'used', FALSE, '2024-07-20 11:00:00+06'),
(43, 7, 500053, 'used', FALSE, '2024-08-25 09:00:00+06'),
(44, 7, 500054, 'used', FALSE, '2024-09-30 14:00:00+06'),
(45, 7, 500055, 'used', FALSE, '2024-10-15 10:30:00+06'),
(46, 7, 500056, 'unused', FALSE, NULL),
(47, 7, 500057, 'unused', FALSE, NULL),
(48, 7, 500058, 'unused', FALSE, NULL),
(49, 7, 500059, 'unused', FALSE, NULL),
(50, 7, 500060, 'unused', FALSE, NULL),

-- Book 8: A. H. M. MANSUR (600001-600025)
(51, 8, 600001, 'used', FALSE, '2025-02-10 10:00:00+06'),
(52, 8, 600002, 'used', FALSE, '2025-03-15 11:30:00+06'),
(53, 8, 600003, 'unused', FALSE, NULL),
(54, 8, 600004, 'unused', FALSE, NULL),
(55, 8, 600005, 'unused', FALSE, NULL),
(56, 8, 600006, 'unused', FALSE, NULL),
(57, 8, 600007, 'unused', FALSE, NULL),
(58, 8, 600008, 'unused', FALSE, NULL),
(59, 8, 600009, 'unused', FALSE, NULL),
(60, 8, 600010, 'unused', FALSE, NULL),

-- Book 9: SWASTIKA PANDIT (700001-700025)
(61, 9, 700001, 'used', FALSE, '2025-07-10 10:00:00+06'),
(62, 9, 700002, 'used', FALSE, '2025-08-15 11:00:00+06'),
(63, 9, 700003, 'unused', FALSE, NULL),
(64, 9, 700004, 'unused', FALSE, NULL),
(65, 9, 700005, 'unused', FALSE, NULL),
(66, 9, 700006, 'unused', FALSE, NULL),
(67, 9, 700007, 'unused', FALSE, NULL),
(68, 9, 700008, 'unused', FALSE, NULL),
(69, 9, 700009, 'unused', FALSE, NULL),
(70, 9, 700010, 'unused', FALSE, NULL)

ON CONFLICT (leaf_id) DO NOTHING;

-- Reset sequence
SELECT setval('cheque_leaves_leaf_id_seq', (SELECT MAX(leaf_id) FROM cheque_leaves));
