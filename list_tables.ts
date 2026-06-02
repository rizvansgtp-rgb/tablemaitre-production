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

async function list() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('store_id', '0301');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Tables in DB:', data);
  }
}

list().catch(console.error);
