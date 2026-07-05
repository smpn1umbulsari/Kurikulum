import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import dns from 'dns';
const { Client } = pkg;
import { fileURLToPath } from 'url';

// Force Node.js to prefer IPv6, because Supabase db endpoints are IPv6 only
dns.setDefaultResultOrder('ipv6first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'install_all.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');

  let connectionString = 'postgresql://postgres:Shidiq2492@db.cqplwszjjjqqykqwmuyx.supabase.co:5432/postgres';
  
  // They included brackets, so we might need them:
  if (process.argv[2] === '--with-brackets') {
    connectionString = 'postgresql://postgres:[Shidiq2492]@db.cqplwszjjjqqykqwmuyx.supabase.co:5432/postgres';
  }

  console.log(`Connecting to database...`);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected! Executing SQL (this may take a minute for 113KB)...');
    await client.query(sqlContent);
    console.log('✅ SQL executed successfully!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
    console.log('\nIf authentication failed, try running: node scripts/run-sql.js --with-brackets');
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
