-- Migration: When auth.users is created with role=admin in raw_user_meta_data, insert public.admins
-- Purpose: Admin self-registration via signUp (with email confirmation) has no JWT until the user
--          confirms email, so the client cannot INSERT into admins under RLS. Mirror the edge-function
--          behavior by creating the admin profile in the same SECURITY DEFINER trigger as migration 015.
-- Date: 2026

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, password_hash, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND (NEW.raw_user_meta_data->>'role') <> '' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'role');
  END IF;

  IF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
    BEGIN
      INSERT INTO public.admins (user_id, business_name, updated_at)
      VALUES (
        NEW.id,
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'businessName', '')), ''),
        NOW()
      );
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;
