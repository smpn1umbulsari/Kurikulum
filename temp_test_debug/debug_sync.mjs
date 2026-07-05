/**
 * Debug Sync - SIKAD v4.0
 * Script untuk debug masalah sync
 */

import Dexie from 'dexie';

// We need to use dynamic import for ESM modules
const { db } = await import('../src/database/dexie/schema.ts');
const { supabase } = await import('../src/infrastructure/supabase/client.ts');

async function debugSync() {
  console.log('=== SIKAD v4.0 Sync Debug ===\n');

  // 1. Check sync queue
  console.log('1. Checking Sync Queue...');
  const pendingItems = await db.syncQueue
    .where('status')
    .equals('PENDING')
    .toArray();
  
  console.log(`   Total PENDING items: ${pendingItems.length}`);
  
  if (pendingItems.length > 0) {
    console.log('\n   Sample items:');
    pendingItems.slice(0, 3).forEach((item, i) => {
      console.log(`   [${i + 1}] Table: ${item.table_name}, Op: ${item.operation}, ID: ${item.record_id}`);
      console.log(`       Payload keys: ${Object.keys(item.payload).join(', ')}`);
    });

    // 2. Check table mappings
    console.log('\n2. Checking Table Mappings...');
    const tables = [...new Set(pendingItems.map(i => i.table_name))];
    console.log(`   Unique tables in queue: ${tables.join(', ')}`);

    // 3. Test Supabase connection
    console.log('\n3. Testing Supabase Connection...');
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      console.log(`   Authenticated as: ${sessionData.session.user.email}`);
    } else {
      console.log('   NOT AUTHENTICATED - This is likely the sync failure cause!');
    }

    // 4. Test if tables exist
    console.log('\n4. Testing Table Access...');
    for (const tableName of tables.slice(0, 3)) {
      try {
        const { data, error, status } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ERROR ${tableName}: ${error.message} (code: ${error.code})`);
        } else {
          console.log(`   OK ${tableName}: (${data?.length || 0} records)`);
        }
      } catch (e) {
        console.log(`   ERROR ${tableName}: ${e}`);
      }
    }

    // 5. Try to insert one item
    console.log('\n5. Testing Insert...');
    const testItem = pendingItems[0];
    console.log(`   Trying to insert into: ${testItem.table_name}`);
    console.log(`   Operation: ${testItem.operation}`);
    console.log(`   Payload:`, JSON.stringify(testItem.payload, null, 2).slice(0, 500));
    
    try {
      const { data, error, status } = await supabase
        .from(testItem.table_name)
        .insert(testItem.payload);
      
      console.log(`   Status: ${status}`);
      if (error) {
        console.log(`   ERROR: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Details: ${JSON.stringify(error.details)}`);
      } else {
        console.log(`   Success!`);
      }
    } catch (e) {
      console.log(`   Exception: ${e.message || e}`);
    }
  }

  // 6. Check failed items
  console.log('\n6. Checking Failed Items...');
  const failedItems = await db.syncQueue
    .where('status')
    .equals('FAILED')
    .toArray();
  console.log(`   Total FAILED items: ${failedItems.length}`);
  if (failedItems.length > 0) {
    failedItems.slice(0, 3).forEach((item, i) => {
      console.log(`   [${i + 1}] ${item.table_name}: ${item.last_error}`);
    });
  }

  console.log('\n=== Debug Complete ===');
}

// Run
debugSync()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Debug error:', e);
    process.exit(1);
  });
