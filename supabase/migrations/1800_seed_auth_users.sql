/* =========================================================
   SIKAD v4.0 - Seed Auth Users for @spenturi domain
   Creates superadmin user in Supabase Auth
   ========================================================= */

-- Create superadmin user in auth.users with @spenturi domain
DELETE FROM auth.users WHERE email = 'superadmin@spenturi';

INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  'superadmin@spenturi',
  crypt('shidiq2492', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Link to SUPERADMIN role (only user_id and role_id columns)
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'superadmin@spenturi')
  AND role_id = (SELECT id FROM public.roles WHERE kode = 'SUPERADMIN');

INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN public.roles r
WHERE u.email = 'superadmin@spenturi' AND r.kode = 'SUPERADMIN';

-- Verify
SELECT 'Created: ' || email FROM auth.users WHERE email = 'superadmin@spenturi';
