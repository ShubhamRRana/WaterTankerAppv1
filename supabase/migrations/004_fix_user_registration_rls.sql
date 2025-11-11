-- ============================================================================
-- Fix User Registration RLS Policy
-- ============================================================================
-- This migration fixes the RLS policy to allow users to register themselves
-- The issue is that during signUp, the session might not be fully established
-- when we try to insert the user profile, causing RLS to block the insert.
-- ============================================================================

-- Drop the existing "Public can register users" policy if it exists
DROP POLICY IF EXISTS "Public can register users" ON users;

-- Create a function that can insert users with elevated privileges (bypasses RLS)
-- This function runs with SECURITY DEFINER, so it can insert even when RLS would block it
-- Handles duplicate key errors by checking if user already exists before inserting
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_auth_id UUID,
  p_phone TEXT,
  p_name TEXT,
  p_role user_role,
  p_email TEXT DEFAULT NULL,
  p_profile_image TEXT DEFAULT NULL,
  p_created_by_admin BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user with this auth_id already exists
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = p_auth_id;
  
  -- If user already exists, return existing ID
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Otherwise, insert new user
  INSERT INTO users (
    auth_id,
    phone,
    name,
    role,
    email,
    profile_image,
    created_by_admin
  ) VALUES (
    p_auth_id,
    p_phone,
    p_name,
    p_role,
    p_email,
    p_profile_image,
    p_created_by_admin
  )
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

-- Create a policy that allows users to insert their own profile
-- This works when the session is established and auth_id matches auth.uid()
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- Create a policy that allows public registration (fallback)
-- This is needed when the session isn't fully established yet
CREATE POLICY "Allow public user registration"
  ON users FOR INSERT
  WITH CHECK (true);

