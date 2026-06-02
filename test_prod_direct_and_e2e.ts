import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EMAIL = 'mohammed@chinesepalacegroup.com';
const PASSWORD = process.env.TEST_PASSWORD || '';
const PROD_URL = 'https://tablemaitre-production.vercel.app/';

const directResults: Record<string, any> = {};
const e2eResults: Record<string, any> = {};

async function runDirectDBChecks() {
  console.log('\n--- STARTING DIRECT DATABASE PRODUCTION CHECKS ---');
  if (!PASSWORD) {
    console.error('❌ TEST_PASSWORD is not configured in env!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });
  if (authError) {
    console.error('❌ Direct auth failed:', authError.message);
    process.exit(1);
  }
  const uid = authData.user.id;
  console.log(`✅ Direct auth successful. UID: ${uid}`);

  // 1. Select profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  directResults['select_profile'] = profileErr ? `FAIL: ${profileErr.message}` : 'PASS';
  if (profile) {
    console.log(`Profile: role=${profile.role}, active_store=${profile.active_store}, assigned_stores=${profile.assigned_stores}`);
  }

  // Force active_store to '0301' for testing consistency
  console.log("Setting active_store to '0301' for testing...");
  await supabase.from('profiles').update({ active_store: '0301' }).eq('id', uid);

  // 2. Select tables where store_id = '0301'
  const { data: tables, error: selectTablesErr } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('store_id', '0301');
  directResults['select_tables_0301'] = selectTablesErr ? `FAIL: ${selectTablesErr.message}` : 'PASS';
  console.log(`Tables in store 0301: ${tables?.length || 0}`);

  // 3. Insert test table into store 0301
  const tempNumber = `TPROD_${Date.now().toString().slice(-4)}`;
  const { data: newTable, error: insertErr } = await supabase
    .from('restaurant_tables')
    .insert([{
      store_id: '0301',
      number: tempNumber,
      capacity: 4,
      x: 100,
      y: 100,
      status: 'available'
    }])
    .select()
    .single();
  
  directResults['insert_table_0301'] = insertErr ? `FAIL: ${insertErr.message} (code ${insertErr.code})` : 'PASS';

  if (newTable) {
    console.log(`✅ Inserted test table: id=${newTable.id}, number=${newTable.number}`);

    // 4. Update test table status
    const { error: updateStatusErr } = await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied' })
      .eq('id', newTable.id);
    
    // Check if status actually updated
    const { data: checkTable } = await supabase
      .from('restaurant_tables')
      .select('status')
      .eq('id', newTable.id)
      .single();

    directResults['update_table_status'] = (updateStatusErr || checkTable?.status !== 'occupied')
      ? `FAIL: ${updateStatusErr?.message || 'Status did not change'}` 
      : 'PASS';

    // 5. Update test table x/y
    const { error: updateCoordErr } = await supabase
      .from('restaurant_tables')
      .update({ x: 150, y: 150 })
      .eq('id', newTable.id);

    const { data: checkTableCoord } = await supabase
      .from('restaurant_tables')
      .select('x, y')
      .eq('id', newTable.id)
      .single();

    directResults['update_table_coords'] = (updateCoordErr || checkTableCoord?.x !== 150)
      ? `FAIL: ${updateCoordErr?.message || 'Coordinates did not change'}` 
      : 'PASS';

    // 6. Delete test table
    const { error: deleteErr } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', newTable.id);

    const { data: checkDeleted } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('id', newTable.id)
      .maybeSingle();

    directResults['delete_table'] = (deleteErr || checkDeleted)
      ? `FAIL: ${deleteErr?.message || 'Row still exists'}` 
      : 'PASS';
  } else {
    directResults['update_table_status'] = 'SKIP (Insert failed)';
    directResults['update_table_coords'] = 'SKIP (Insert failed)';
    directResults['delete_table'] = 'SKIP (Insert failed)';
  }

  console.log('Direct Database Results:', directResults);
}

async function runBrowserE2ETest() {
  console.log('\n--- STARTING BROWSER E2E PRODUCTION TESTS ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('supabase') || url.includes('restaurant_tables')) {
      console.log(`[E2E Request] ${req.method()} -> ${url}`);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('supabase') || url.includes('restaurant_tables')) {
      const method = res.request().method();
      const status = res.status();
      console.log(`[E2E Response] ${method} -> ${url} | HTTP ${status}`);
      try {
        const bodyText = await res.text();
        console.log(`  - Body: ${bodyText.substring(0, 300)}`);
      } catch (err) {}
    }
  });

  try {
    console.log(`Navigating to ${PROD_URL}...`);
    await page.goto(PROD_URL);
    await page.waitForTimeout(2000);

    // Login
    const hasEmail = await page.locator('input[type="email"]').count() > 0;
    if (hasEmail) {
      console.log('Logging in...');
      await page.fill('input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button:has-text("Enter Workspace")');
      await page.waitForTimeout(6000);
    }

    // Check store select
    const hasStoreButton = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
    if (hasStoreButton) {
      console.log('Store selector showing, selecting 0301...');
      await page.selectOption('select', '0301');
      await page.click('button:has-text("Initialize Store Workspace")');
      await page.waitForTimeout(5000);
    }

    // Confirm store is 0301 in dropdown
    const storeSelector = page.locator('#active-store-select');
    if (await storeSelector.count() > 0) {
      const activeStore = await storeSelector.inputValue();
      console.log(`Current active store in header selector: ${activeStore}`);
      if (activeStore !== '0301') {
        console.log("Switching to store 0301 via header selector...");
        await storeSelector.selectOption('0301');
        await page.waitForTimeout(5000);
      }
    }

    // Go to Floor Plan
    console.log('Navigating to Floor Plan...');
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(4000);

    // 1. Add a test table
    console.log('Adding table in UI...');
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log(`[Browser Alert Caught] "${alertMessage}"`);
      await dialog.accept();
    });

    const addBtn = page.locator('button[title="Add New Table"]');
    await addBtn.click();
    await page.waitForTimeout(3000);

    if (alertMessage) {
      e2eResults['ui_add_table'] = `FAIL: Alert shown: "${alertMessage}"`;
    } else {
      e2eResults['ui_add_table'] = 'PASS';
    }

    // Check if table is visible on floor (e.g. searching for the new table number)
    // The number is computed, let's find the max table number in UI
    const tablesCount = await page.locator('text=/^\\d+$/').count();
    console.log(`Tables displayed in UI: ${tablesCount}`);

    // Take screenshot
    await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/prod-test-result.png' });

  } catch (err: any) {
    console.error('❌ E2E Browser checks crashed:', err.message);
  } finally {
    await browser.close();
  }

  console.log('E2E Results:', e2eResults);
}

async function main() {
  await runDirectDBChecks();
  await runBrowserE2ETest();
}

main().catch(console.error);
