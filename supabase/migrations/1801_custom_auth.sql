/* =========================================================
   SIKAD v4.0 - Custom Username-Based Auth Functions
   Matches actual custom_users table structure
   ========================================================= */

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_user_by_username(TEXT) CASCADE;

-- Create function to get user by username with role info
CREATE OR REPLACE FUNCTION public.get_user_by_username(p_username TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  full_name TEXT,
  password_hash TEXT,
  role_kode TEXT,
  role_nama TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.password_hash,
    r.kode as role_kode,
    r.nama as role_nama
  FROM public.custom_users u
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  LEFT JOIN public.roles r ON ur.role_id = r.id
  WHERE u.username = p_username AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_by_username TO anon, authenticated;
