import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EMAIL = 'mohammed@chinesepalacegroup.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Cprg@1041';

async function cleanup() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  
  console.log('Querying QA tables...');
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('id, number')
    .eq('store_id', '0301');

  if (error) {
    console.error('Error selecting:', error);
    return;
  }

  const toDelete = data.filter(t => t.number.startsWith('QA-'));
  console.log(`Found ${toDelete.length} test tables to delete:`, toDelete.map(t => t.number));

  if (toDelete.length > 0) {
    const ids = toDelete.map(t => t.id);
    const { error: delError } = await supabase
      .from('restaurant_tables')
      .delete()
      .in('id', ids);

    if (delError) {
      console.error('Error deleting:', delError);
    } else {
      console.log('Successfully cleaned up all QA test tables.');
    }
  } else {
    console.log('No QA test tables found.');
  }
}

cleanup().catch(console.error);
