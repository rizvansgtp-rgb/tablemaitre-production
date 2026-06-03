import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EMAIL = 'mohammed@chinesepalacegroup.com';
const PASSWORD = process.env.TEST_PASSWORD || '';

if (!PASSWORD) {
  console.error('TEST_PASSWORD environment variable is required');
  process.exit(1);
}

async function runCleanup() {
  console.log('Initializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log(`Signing in as ${EMAIL}...`);
  const login = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (login.error) {
    console.error('❌ Sign in failed:', login.error.message);
    process.exit(1);
  }
  console.log('✅ Sign in successful.');

  // 1. Clean tables
  console.log('Querying restaurant_tables to identify QA/test data...');
  const { data: tables, error: tableErr } = await supabase.from('restaurant_tables').select('id, number, store_id');
  if (tableErr) {
    console.error('Error fetching tables:', tableErr);
  } else if (tables) {
    const tablesToDelete = tables.filter(t => 
      t.number.startsWith('QA-') || 
      t.number.startsWith('PROD-QA-') || 
      t.number.startsWith('TPROD') ||
      t.number === 'T_DEL' ||
      (t.number === '104' && t.store_id === '0301')
    );
    console.log(`Found ${tablesToDelete.length} test tables to delete:`, tablesToDelete.map(t => `${t.store_id}:${t.number}`));
    if (tablesToDelete.length > 0) {
      const ids = tablesToDelete.map(t => t.id);
      const { error: delErr } = await supabase.from('restaurant_tables').delete().in('id', ids);
      if (delErr) {
        console.error('❌ Error deleting tables:', delErr);
      } else {
        console.log('✅ Successfully cleaned tables.');
      }
    }

    // Reset all remaining tables to available/pristine state
    console.log('Resetting all remaining tables to available...');
    const remainingTables = tables.filter(t => !tablesToDelete.some(td => td.id === t.id));
    if (remainingTables.length > 0) {
      const { error: resetErr } = await supabase
        .from('restaurant_tables')
        .update({
          status: 'available',
          guest_count: null,
          reservation_name: null,
          seated_at: null,
          waiter_name: null
        })
        .in('id', remainingTables.map(t => t.id));
      if (resetErr) {
        console.error('❌ Error resetting tables:', resetErr);
      } else {
        console.log('✅ Successfully reset all remaining tables to available.');
      }
    }
  }

  // 2. Clean reservations
  console.log('Querying reservations to identify QA/test data...');
  const { data: reservations, error: resErr } = await supabase.from('reservations').select('id, guest_name');
  if (resErr) {
    console.error('Error fetching reservations:', resErr);
  } else if (reservations) {
    const resToDelete = reservations.filter(r => 
      r.guest_name.startsWith('QA-') || 
      r.guest_name.startsWith('PROD-QA-')
    );
    console.log(`Found ${resToDelete.length} test reservations to delete:`, resToDelete.map(r => r.guest_name));
    if (resToDelete.length > 0) {
      const ids = resToDelete.map(r => r.id);
      const { error: delErr } = await supabase.from('reservations').delete().in('id', ids);
      if (delErr) {
        console.error('❌ Error deleting reservations:', delErr);
      } else {
        console.log('✅ Successfully cleaned reservations.');
      }
    }
  }

  // 3. Clean guests
  console.log('Querying guests to identify QA/test data...');
  const { data: guests, error: guestErr } = await supabase.from('guests').select('id, name');
  if (guestErr) {
    console.error('Error fetching guests:', guestErr);
  } else if (guests) {
    const guestsToDelete = guests.filter(g => 
      g.name.startsWith('QA-') || 
      g.name.startsWith('PROD-QA-')
    );
    console.log(`Found ${guestsToDelete.length} test guests to delete:`, guestsToDelete.map(g => g.name));
    if (guestsToDelete.length > 0) {
      const ids = guestsToDelete.map(g => g.id);
      const { error: delErr } = await supabase.from('guests').delete().in('id', ids);
      if (delErr) {
        console.error('❌ Error deleting guests:', delErr);
      } else {
        console.log('✅ Successfully cleaned guests.');
      }
    }
  }

  // 4. Clean waitlist
  console.log('Querying waitlist to identify QA/test data...');
  const { data: waitlist, error: wlErr } = await supabase.from('waitlist').select('id, guest_name');
  if (wlErr) {
    console.error('Error fetching waitlist:', wlErr);
  } else if (waitlist) {
    const wlToDelete = waitlist.filter(w => 
      w.guest_name.startsWith('QA-') || 
      w.guest_name.startsWith('PROD-QA-')
    );
    console.log(`Found ${wlToDelete.length} test waitlist entries to delete:`, wlToDelete.map(w => w.guest_name));
    if (wlToDelete.length > 0) {
      const ids = wlToDelete.map(w => w.id);
      const { error: delErr } = await supabase.from('waitlist').delete().in('id', ids);
      if (delErr) {
        console.error('❌ Error deleting waitlist entries:', delErr);
      } else {
        console.log('✅ Successfully cleaned waitlist.');
      }
    }
  }

  console.log('Cleanup script run complete.');
}

runCleanup().catch(console.error);
