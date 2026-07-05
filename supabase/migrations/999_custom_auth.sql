-- Custom Authentication Table
-- Alternative login using username + password

CREATE TABLE IF NOT EXISTS public.custom_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  role_id UUID REFERENCES public.roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_users_username ON public.custom_users(username);

-- Function to hash password (using pgcrypto)
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
  SELECT crypt(password, gen_salt('bf'));
$$ LANGUAGE SQL STRICT;

-- Function to verify password
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql STRICT;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_custom_users_updated_at ON public.custom_users;
CREATE TRIGGER trigger_custom_users_updated_at
  BEFORE UPDATE ON public.custom_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default superadmin user
-- Password: shidiq2492
INSERT INTO public.custom_users (username, password_hash, full_name, role_id, email)
VALUES (
  'superadmin',
  hash_password('shidiq2492'),
  'Super Administrator',
  (SELECT id FROM public.roles WHERE kode = 'SUPERADMIN'),
  'superadmin@shidiq2492'
) ON CONFLICT (username) DO NOTHING;
