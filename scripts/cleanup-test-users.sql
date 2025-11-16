-- SQL script to delete all test users from Supabase
-- 
-- This script identifies and deletes test users based on phone number patterns
-- used in integration tests.
-- 
-- Usage:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this script
--   3. Run it
-- 
-- WARNING: This will permanently delete all test users!
-- Make sure you have a backup if needed.

-- Test phone number prefixes used in integration tests
-- These match the prefixes: 98765, 98766, 98767, 98768, 98769, 98770, 98799

-- Delete users from users table (this will cascade delete related records)
DELETE FROM users
WHERE phone LIKE '98765%'
   OR phone LIKE '98766%'
   OR phone LIKE '98767%'
   OR phone LIKE '98768%'
   OR phone LIKE '98769%'
   OR phone LIKE '98770%'
   OR phone LIKE '98799%';

-- Note: Auth users in auth.users table will need to be deleted separately
-- if you have access to the Supabase Admin API or Dashboard
-- You can use the Supabase Dashboard → Authentication → Users to delete them manually
-- Or use the cleanup script which handles both

-- To see how many users will be deleted before running:
-- SELECT COUNT(*) as test_users_count
-- FROM users
-- WHERE phone LIKE '98765%'
--    OR phone LIKE '98766%'
--    OR phone LIKE '98767%'
--    OR phone LIKE '98768%'
--    OR phone LIKE '98769%'
--    OR phone LIKE '98770%'
--    OR phone LIKE '98799%';

