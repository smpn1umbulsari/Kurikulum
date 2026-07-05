import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log('Connecting to Supabase:', supabaseUrl);
  
  // 1. Log in as superadmin
  const email = 'superadmin@shidiq2492';
  const password = 'shidiq2492';
  
  console.log(`Logging in as ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error('Auth Error:', authError.message);
    process.exit(1);
  }
  
  const user = authData.user;
  console.log('Successfully logged in!');
  console.log('User ID:', user.id);
  console.log('Email:', user.email);
  console.log('User Metadata:', user.user_metadata);
  
  // 2. Query user_roles
  console.log('\nQuerying user_roles for this user...');
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        kode,
        nama
      )
    `)
    .eq('user_id', user.id);
    
  if (rolesError) {
    console.error('Failed to fetch user roles:', rolesError.message);
  } else {
    console.log('Roles in database:', JSON.stringify(rolesData, null, 2));
  }

  // 3. Try to query gurus
  console.log('\nTrying to select from gurus...');
  const { data: gurusData, error: gurusError } = await supabase
    .from('gurus')
    .select('*')
    .limit(5);
    
  if (gurusError) {
    console.error('Failed to fetch gurus (RLS active/blocked?):', gurusError.message);
  } else {
    console.log(`Successfully fetched ${gurusData.length} gurus:`, gurusData);
  }
}

inspect();
