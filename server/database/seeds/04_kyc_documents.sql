-- ============================================================
-- KYC DOCUMENTS SEED DATA
-- Run after 02_accounts.sql
-- ============================================================

INSERT INTO kyc_documents (document_id, account_id, doc_type, doc_number, image_path, ocr_data, is_verified, uploaded_at) VALUES

-- Alice Rahman - NID + Utility Bill
(1, 1, 'nid', '1990123456789', '/kyc/alice_nid.jpg', 
 '{"name": "Alice Rahman", "dob": "1990-05-15", "address": "House 12, Road 5, Dhanmondi, Dhaka"}', 
 TRUE, '2024-06-15 10:00:00+06'),
(2, 1, 'utility_bill', 'DESCO-2024-001234', '/kyc/alice_utility.jpg',
 '{"provider": "DESCO", "address": "House 12, Road 5, Dhanmondi", "bill_month": "May 2024"}',
 TRUE, '2024-06-15 10:05:00+06'),

-- Bob Chowdhury - NID + Passport
(3, 2, 'nid', '1985234567890', '/kyc/bob_nid.jpg',
 '{"name": "Bob Chowdhury", "dob": "1985-08-22", "address": "Flat 4B, Green Tower, Gulshan, Dhaka"}',
 TRUE, '2024-03-20 11:30:00+06'),
(4, 2, 'passport', 'AB1234567', '/kyc/bob_passport.jpg',
 '{"name": "Bob Chowdhury", "passport_no": "AB1234567", "expiry": "2028-03-15"}',
 TRUE, '2024-03-20 11:35:00+06'),

-- Carol Ahmed - NID
(5, 3, 'nid', '1978345678901', '/kyc/carol_nid.jpg',
 '{"name": "Carol Ahmed", "dob": "1978-12-03", "address": "Villa 8, Baridhara, Dhaka"}',
 TRUE, '2023-12-10 09:00:00+06'),

-- David Khan - NID
(6, 4, 'nid', '1992456789012', '/kyc/david_nid.jpg',
 '{"name": "David Khan", "dob": "1992-03-18", "address": "Apt 302, City Center, Uttara, Dhaka"}',
 TRUE, '2024-08-05 14:00:00+06'),

-- Eve Hossain - NID + Passport
(7, 5, 'nid', '1980567890123', '/kyc/eve_nid.jpg',
 '{"name": "Eve Hossain", "dob": "1980-07-25", "address": "Penthouse, Platinum Towers, Banani, Dhaka"}',
 TRUE, '2023-09-25 11:00:00+06'),
(8, 5, 'passport', 'CD9876543', '/kyc/eve_passport.jpg',
 '{"name": "Eve Hossain", "passport_no": "CD9876543", "expiry": "2030-09-20"}',
 TRUE, '2023-09-25 11:10:00+06'),

-- A. H. M. MANSUR - NID + Trade License
(9, 7, 'nid', '1988678901234', '/kyc/mansur_nid.jpg',
 '{"name": "A. H. M. MANSUR", "dob": "1988-11-10", "address": "Shop 45, New Market, Dhaka"}',
 TRUE, '2025-01-15 10:30:00+06'),
(10, 7, 'trade_license', 'TL-DHK-2024-5678', '/kyc/mansur_trade.jpg',
 '{"business_name": "Mansur Trading", "license_no": "TL-DHK-2024-5678", "valid_until": "2025-12-31"}',
 TRUE, '2025-01-15 10:40:00+06'),

-- SWASTIKA PANDIT - NID
(11, 8, 'nid', '1995789012345', '/kyc/swastika_nid.jpg',
 '{"name": "SWASTIKA PANDIT", "dob": "1995-02-28", "address": "House 23, College Road, Rajshahi"}',
 TRUE, '2025-06-20 09:45:00+06')

ON CONFLICT (document_id) DO NOTHING;

-- Reset sequence
SELECT setval('kyc_documents_document_id_seq', (SELECT MAX(document_id) FROM kyc_documents));
