/* =========================================================
   SIKAD v4.0 - Migration 2200: Auth Guru Link
   
   Purpose: 
   1. Add auth_user_id link columns to gurus and custom_users
   2. Create link functions
   3. Create v_guru_auth_status view
   4. Auto-create Supabase Auth accounts for existing gurus
   
   Fixes G1, G2 from implementation plan
   ========================================================= */

-- ============================================
-- STEP 1: Add auth_user_id to gurus table
-- ============================================

ALTER TABLE gurus ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for RLS lookups
CREATE INDEX IF NOT EXISTS idx_gurus_auth_user_id ON gurus(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ============================================
-- STEP 2: Add auth_user_id to custom_users table  
-- ============================================

ALTER TABLE custom_users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add guru_id link if not exists (for linking custom_users to gurus)
ALTER TABLE custom_users ADD COLUMN IF NOT EXISTS guru_id UUID REFERENCES gurus(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custom_users_auth_user_id ON custom_users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_users_guru_id ON custom_users(guru_id) WHERE guru_id IS NOT NULL;

-- ============================================
-- STEP 3: Create link_guru_to_auth function
-- ============================================

CREATE OR REPLACE FUNCTION public.link_guru_to_auth(
  p_guru_id UUID,
  p_auth_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Update gurus table
  UPDATE gurus SET auth_user_id = p_auth_user_id WHERE id = p_guru_id;
  
  -- Insert GURU role for this auth user
  INSERT INTO user_roles (user_id, role_id)
  VALUES (p_auth_user_id, (SELECT id FROM roles WHERE kode = 'GURU'))
  ON CONFLICT DO NOTHING;
  
  -- Also update custom_users if guru has one
  UPDATE custom_users 
  SET auth_user_id = p_auth_user_id 
  WHERE guru_id = p_guru_id AND auth_user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Create link_custom_user_to_auth function
-- ============================================

CREATE OR REPLACE FUNCTION public.link_custom_user_to_auth(
  p_custom_user_id UUID,
  p_auth_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE custom_users SET auth_user_id = p_auth_user_id WHERE id = p_custom_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Create v_guru_auth_status view
-- ============================================

CREATE OR REPLACE VIEW public.v_guru_auth_status AS
SELECT
  g.id AS guru_id,
  g.nama,
  g.nip,
  cu.id AS custom_user_id,
  g.auth_user_id,
  CASE 
    WHEN g.auth_user_id IS NOT NULL THEN '✅ Linked'
    WHEN cu.id IS NOT NULL AND cu.auth_user_id IS NOT NULL THEN '✅ Linked (via custom_user)'
    ELSE '❌ Not Linked'
  END AS web_account_status,
  CASE 
    WHEN g.nip IS NOT NULL AND g.nip != '' THEN g.nip || '@spenturi.sch.id'
    ELSE LOWER(REPLACE(REGEXP_REPLACE(g.nama, '[^a-zA-Z0-9]', '', 'g'), ' ', '')) || '@spenturi.sch.id'
  END AS suggested_email
FROM gurus g
LEFT JOIN custom_users cu ON cu.guru_id = g.id;

-- Grant access to view
GRANT SELECT ON public.v_guru_auth_status TO authenticated;

-- ============================================
-- STEP 6: Auto-create Supabase Auth accounts
-- Note: This uses service_role for admin operations
-- Run separately with: psql $DATABASE_URL -f this_file.sql
-- Or via Edge Function for better error handling
-- ============================================

/*
-- Function to generate email for guru
CREATE OR REPLACE FUNCTION public.generate_guru_email(guru_row gurus)
RETURNS TEXT AS $$
BEGIN
  IF guru_row.nip IS NOT NULL AND guru_row.nip != '' THEN
    RETURN guru_row.nip || '@spenturi.sch.id';
  ELSE
    RETURN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(guru_row.nama, '[^a-zA-Z0-9]', '', 'g'), '\s+', '', 'g')) || '@spenturi.sch.id';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: Actual user creation should be done via Edge Function
-- because we need to call auth.admin.createUser()
-- See: supabase/functions/register-guru-web/index.ts
*/

-- ============================================
-- STEP 7: Grant permissions for web panel
-- ============================================

GRANT EXECUTE ON FUNCTION public.link_guru_to_auth TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_custom_user_to_auth TO authenticated;
GRANT SELECT ON public.v_guru_auth_status TO authenticated;

-- ============================================
-- VERIFICATION: Run this to check status
-- SELECT * FROM v_guru_auth_status;
-- ============================================
