-- Initial Superadmin User Setup
-- Run this AFTER Supabase Auth user is created

-- NOTE: Supabase Auth requires email format for authentication
-- Username for login: superadmin@shidiq2492
-- Password: shidiq2492

-- Create SUPERADMIN role if not exists
INSERT INTO roles (kode, nama) VALUES
('SUPERADMIN', 'Super Administrator')
ON CONFLICT (kode) DO NOTHING;

-- Link user to SUPERADMIN role
DO $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'superadmin@shidiq2492';
  
  -- Find SUPERADMIN role
  SELECT id INTO v_role_id 
  FROM roles 
  WHERE kode = 'SUPERADMIN';
  
  -- Create user_roles entry
  IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Superadmin role assigned successfully';
  ELSE
    RAISE WARNING 'User or role not found. Make sure to create auth user first.';
  END IF;
END $$;
