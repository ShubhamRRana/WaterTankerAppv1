-- Migration: Allow admins to read users and user_roles (Driver Management screen)
-- Purpose: getUsers() runs .from('users').select('*') and .from('user_roles').select('*').
--          Only customers had SELECT policies; admins had none, so the query failed or returned
--          nothing and Driver Management showed "Failed to load drivers."
-- Uses: has_role() from migration 004.
-- Date: 2025

-- Allow admins to read all users (needed to list drivers and their profiles)
DROP POLICY IF EXISTS "Admins can read users" ON users;
CREATE POLICY "Admins can read users"
ON users
FOR SELECT
TO authenticated
USING (has_role('admin'));

-- Allow admins to read all user_roles (needed to list drivers by role)
DROP POLICY IF EXISTS "Admins can read user_roles" ON user_roles;
CREATE POLICY "Admins can read user_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (has_role('admin'));

COMMENT ON POLICY "Admins can read users" ON users IS 'Enables Driver Management to load user list for driver listing.';
COMMENT ON POLICY "Admins can read user_roles" ON user_roles IS 'Enables Driver Management to load roles for driver listing.';
