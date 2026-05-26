import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EMAIL = 'mohammed@chinesepalacegroup.com';
const PASSWORD = process.env.TEST_PASSWORD || '';

const results = {
  dbSetupAssignedStores: 'PENDING',
  directInsertQAData: 'PENDING',
  directVerifySeparation: 'PENDING',
  e2eConfirmInitial0301: 'PENDING',
  e2eFloorPlan0301Isolated: 'PENDING',
  e2eSwitchTo0302: 'PENDING',
  e2eFloorPlan0302Isolated: 'PENDING',
  e2eReservations0302Isolated: 'PENDING',
  e2eSwitchBackTo0301: 'PENDING',
  e2eReservations0301Restored: 'PENDING',
  e2eReportsStoreScoped: 'PENDING',
  e2eRefreshPersistsActiveStore: 'PENDING',
  dbCleanupQAData: 'PENDING'
};

let insertedTable0301Id = '';
let insertedTable0302Id = '';
let insertedRes0301Id = '';
let insertedRes0302Id = '';

const getLocalDateString = (d: Date = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

async function runDirectChecks() {
  console.log('\n--- STARTING DIRECT STORE SEPARATION SUPABASE API CHECKS ---');
  if (!PASSWORD) {
    console.error('❌ TEST_PASSWORD is not set. Direct Supabase checks aborted.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Login
  console.log(`Signing in as ${EMAIL}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });

  if (authError) {
    console.error('❌ Authentication failed:', authError.message);
    process.exit(1);
  }
  console.log('✅ Sign in successful. UID:', authData.user?.id);

  // 1. Update owner assigned_stores to include both 0301 and 0302
  console.log('Updating owner assigned_stores to [0301, 0302]...');
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ 
      assigned_stores: ['0301', '0302'],
      active_store: '0301' // Reset active store to 0301 initially
    })
    .eq('id', authData.user.id);

  if (profileUpdateError) {
    console.error('❌ Owner profile update failed:', profileUpdateError.message);
    results.dbSetupAssignedStores = `FAIL: ${profileUpdateError.message}`;
    process.exit(1);
  }
  console.log('✅ Owner profile updated successfully.');
  results.dbSetupAssignedStores = 'PASS';

  // Clean up any old QA data from previous aborted runs
  console.log('Cleaning up old store switching QA data...');
  await supabase.from('reservations').delete().like('guest_name', 'QA Res Store%');
  await supabase.from('restaurant_tables').delete().in('number', ['T91', 'T92']);

  // 2. Insert one QA table in store 0301
  console.log('Inserting QA table T91 in store 0301...');
  const { data: t0301, error: t0301Err } = await supabase
    .from('restaurant_tables')
    .insert([{
      store_id: '0301',
      number: 'T91',
      capacity: 4,
      status: 'available',
      shape: 'square',
      x: 120,
      y: 120
    }])
    .select()
    .single();

  if (t0301Err) {
    console.error('❌ Table 0301 insert failed:', t0301Err.message);
    results.directInsertQAData = `FAIL: ${t0301Err.message}`;
    return;
  }
  insertedTable0301Id = t0301.id;

  // 3. Insert one QA table in store 0302
  console.log('Inserting QA table T92 in store 0302...');
  const { data: t0302, error: t0302Err } = await supabase
    .from('restaurant_tables')
    .insert([{
      store_id: '0302',
      number: 'T92',
      capacity: 2,
      status: 'available',
      shape: 'round',
      x: 180,
      y: 180
    }])
    .select()
    .single();

  if (t0302Err) {
    console.error('❌ Table 0302 insert failed:', t0302Err.message);
    results.directInsertQAData = `FAIL: ${t0302Err.message}`;
    return;
  }
  insertedTable0302Id = t0302.id;

  // 4. Insert one QA reservation in store 0301
  const todayStr = getLocalDateString();
  const datetime0301 = new Date(`${todayStr}T12:00:00`).toISOString();
  console.log('Inserting QA reservation in store 0301...');
  const { data: r0301, error: r0301Err } = await supabase
    .from('reservations')
    .insert([{
      store_id: '0301',
      guest_name: 'QA Res Store 0301',
      phone: '+971500000091',
      party_size: 2,
      datetime: datetime0301,
      status: 'booked'
    }])
    .select()
    .single();

  if (r0301Err) {
    console.error('❌ Reservation 0301 insert failed:', r0301Err.message);
    results.directInsertQAData = `FAIL: ${r0301Err.message}`;
    return;
  }
  insertedRes0301Id = r0301.id;

  // 5. Insert one QA reservation in store 0302
  const datetime0302 = new Date(`${todayStr}T14:00:00`).toISOString();
  console.log('Inserting QA reservation in store 0302...');
  const { data: r0302, error: r0302Err } = await supabase
    .from('reservations')
    .insert([{
      store_id: '0302',
      guest_name: 'QA Res Store 0302',
      phone: '+971500000092',
      party_size: 4,
      datetime: datetime0302,
      status: 'booked'
    }])
    .select()
    .single();

  if (r0302Err) {
    console.error('❌ Reservation 0302 insert failed:', r0302Err.message);
    results.directInsertQAData = `FAIL: ${r0302Err.message}`;
    return;
  }
  insertedRes0302Id = r0302.id;

  console.log('✅ QA Data insertion successful.');
  results.directInsertQAData = 'PASS';

  // 6. Query tables/reservations by store_id and confirm separation
  console.log('Querying store 0301 tables and reservations...');
  const { data: dbTables0301 } = await supabase.from('restaurant_tables').select('number').eq('store_id', '0301');
  const { data: dbRes0301 } = await supabase.from('reservations').select('guest_name').eq('store_id', '0301');

  console.log('Querying store 0302 tables and reservations...');
  const { data: dbTables0302 } = await supabase.from('restaurant_tables').select('number').eq('store_id', '0302');
  const { data: dbRes0302 } = await supabase.from('reservations').select('guest_name').eq('store_id', '0302');

  const t0301Nums = (dbTables0301 || []).map(t => t.number);
  const t0302Nums = (dbTables0302 || []).map(t => t.number);
  const r0301Names = (dbRes0301 || []).map(r => r.guest_name);
  const r0302Names = (dbRes0302 || []).map(r => r.guest_name);

  console.log('ST-0301 tables numbers:', t0301Nums);
  console.log('ST-0302 tables numbers:', t0302Nums);
  console.log('ST-0301 reservations guest names:', r0301Names);
  console.log('ST-0302 reservations guest names:', r0302Names);

  // Separation validations
  const tablesSeparated = t0301Nums.includes('T91') && !t0301Nums.includes('T92') && t0302Nums.includes('T92') && !t0302Nums.includes('T91');
  const resSeparated = r0301Names.includes('QA Res Store 0301') && !r0301Names.includes('QA Res Store 0302') && r0302Names.includes('QA Res Store 0302') && !r0302Names.includes('QA Res Store 0301');

  if (tablesSeparated && resSeparated) {
    console.log('✅ Direct database store separation check PASSED!');
    results.directVerifySeparation = 'PASS';
  } else {
    console.error('❌ Direct database store separation check FAILED!');
    results.directVerifySeparation = 'FAIL';
  }
}

async function runBrowserE2ETest() {
  console.log('\n--- STARTING BROWSER E2E STORE SWITCHING TEST ---');
  if (!PASSWORD) return;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[Browser Page Uncaught Error] ${err.message}`);
  });

  try {
    // 1. Open TableMaître
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // 2. Login as owner
    console.log('Checking if login is required...');
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    if (hasEmailInput) {
      console.log('Logging in...');
      await page.fill('input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button:has-text("Enter Workspace")');
      await page.waitForTimeout(5000);
    }

    // Check if store selector is showing (since assigned_stores has >1 store now)
    const hasStoreButton = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
    if (hasStoreButton) {
      console.log('Store Selector showing. Selecting store 0301...');
      await page.selectOption('select', '0301');
      await page.click('button:has-text("Initialize Store Workspace")');
      await page.waitForTimeout(4000);
    }

    // 3. Confirm current store is 0301 in the header selector
    const headerSelect = page.locator('#active-store-select');
    await headerSelect.waitFor({ state: 'visible', timeout: 5000 });
    const selectedStore = await headerSelect.inputValue();
    console.log(`Initial active store in header dropdown: ${selectedStore}`);
    
    if (selectedStore === '0301') {
      results.e2eConfirmInitial0301 = 'PASS';
    } else {
      results.e2eConfirmInitial0301 = 'FAIL';
      console.error(`Expected store to start at 0301, got: ${selectedStore}`);
    }

    // 4. Open Live Floor and verify table T91 is present, T92 is absent
    console.log('Navigating to Live Floor plan...');
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(3000);

    const hasT91_0301 = await page.locator('text=T91').count() > 0;
    const hasT92_0301 = await page.locator('text=T92').count() > 0;
    console.log(`Tables in ST-0301 Live Floor - T91 present: ${hasT91_0301}, T92 present: ${hasT92_0301}`);

    if (hasT91_0301 && !hasT92_0301) {
      results.e2eFloorPlan0301Isolated = 'PASS';
      console.log('✅ Floor plan correctly isolates store 0301 tables.');
    } else {
      results.e2eFloorPlan0301Isolated = 'FAIL';
      console.error('❌ Floor plan failed isolation test for 0301.');
    }

    // 5. Switch active store to 0302 via header dropdown
    console.log('Switching active store to ST-0302 in header selector...');
    await headerSelect.selectOption('0302');
    await page.waitForTimeout(4500); // Wait for profile refresh and reload

    const switchedStore = await page.locator('#active-store-select').inputValue();
    console.log(`Active store after switching: ${switchedStore}`);
    if (switchedStore === '0302') {
      results.e2eSwitchTo0302 = 'PASS';
    } else {
      results.e2eSwitchTo0302 = 'FAIL';
      console.error(`Failed to switch store in header dropdown to 0302. Got: ${switchedStore}`);
    }

    // 6. Confirm 0302 QA table appears, 0301 table disappears
    // Note: switching store reloads tables automatically because of useEffect [profile?.active_store] in FloorPlan
    const hasT91_0302 = await page.locator('text=T91').count() > 0;
    const hasT92_0302 = await page.locator('text=T92').count() > 0;
    console.log(`Tables in ST-0302 Live Floor - T91 present: ${hasT91_0302}, T92 present: ${hasT92_0302}`);

    if (!hasT91_0302 && hasT92_0302) {
      results.e2eFloorPlan0302Isolated = 'PASS';
      console.log('✅ Floor plan correctly isolates store 0302 tables.');
    } else {
      results.e2eFloorPlan0302Isolated = 'FAIL';
      console.error('❌ Floor plan failed isolation test for 0302.');
    }

    // 7. Open Reservations tab and confirm only 0302 reservation appears
    console.log('Navigating to Reservations...');
    await page.click('button[title="Reservations"], button:has-text("Reservations")');
    await page.waitForTimeout(3000);

    const hasRes0301_0302 = await page.locator('text=QA Res Store 0301').count() > 0;
    const hasRes0302_0302 = await page.locator('text=QA Res Store 0302').count() > 0;
    console.log(`Reservations under ST-0302 - Res 0301 present: ${hasRes0301_0302}, Res 0302 present: ${hasRes0302_0302}`);

    if (!hasRes0301_0302 && hasRes0302_0302) {
      results.e2eReservations0302Isolated = 'PASS';
      console.log('✅ Reservations panel correctly isolates store 0302.');
    } else {
      results.e2eReservations0302Isolated = 'FAIL';
      console.error('❌ Reservations panel failed isolation test for 0302.');
    }

    // 8. Switch back to 0301 using header
    console.log('Switching back to store 0301...');
    await page.locator('#active-store-select').selectOption('0301');
    await page.waitForTimeout(4500);

    const storeReturned = await page.locator('#active-store-select').inputValue();
    if (storeReturned === '0301') {
      results.e2eSwitchBackTo0301 = 'PASS';
    } else {
      results.e2eSwitchBackTo0301 = 'FAIL';
    }

    // 9. Confirm only 0301 reservation appears
    const hasRes0301_0301 = await page.locator('text=QA Res Store 0301').count() > 0;
    const hasRes0302_0301 = await page.locator('text=QA Res Store 0302').count() > 0;
    console.log(`Reservations after switching back to ST-0301 - Res 0301 present: ${hasRes0301_0301}, Res 0302 present: ${hasRes0302_0301}`);

    if (hasRes0301_0301 && !hasRes0302_0301) {
      results.e2eReservations0301Restored = 'PASS';
      console.log('✅ Reservations panel successfully restored 0301 data.');
    } else {
      results.e2eReservations0301Restored = 'FAIL';
      console.error('❌ Reservations panel failed restoration test for 0301.');
    }

    // 10. Open Reports and check if Reports activeStore matches 0301
    console.log('Navigating to Reports...');
    await page.click('button[title="Reports"], button:has-text("Reports")');
    await page.waitForTimeout(3000);

    const reportsActiveStore = await page.locator('select').first().inputValue();
    console.log(`Reports active store selector value: ${reportsActiveStore}`);
    if (reportsActiveStore === '0301') {
      results.e2eReportsStoreScoped = 'PASS';
      console.log('✅ Reports page follows global active store 0301.');
    } else {
      results.e2eReportsStoreScoped = 'FAIL';
      console.error(`Expected reports store filter to be 0301, got: ${reportsActiveStore}`);
    }

    // 11. Refresh browser
    console.log('Refreshing browser to check session active store persistence...');
    await page.reload();
    await page.waitForTimeout(5000);

    // Make sure we check if store selector or layout active store is set
    const storeSelectorShowing = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
    if (storeSelectorShowing) {
      console.log('Unexpected Store Selector showing after refresh. Selecting 0301...');
      await page.selectOption('select', '0301');
      await page.click('button:has-text("Initialize Store Workspace")');
      await page.waitForTimeout(3500);
    }

    const activeStoreAfterRefresh = await page.locator('#active-store-select').inputValue().catch(() => '');
    console.log(`Active store selector value after refresh: ${activeStoreAfterRefresh}`);
    if (activeStoreAfterRefresh === '0301') {
      results.e2eRefreshPersistsActiveStore = 'PASS';
      console.log('✅ Active store successfully persisted across page reloads!');
    } else {
      results.e2eRefreshPersistsActiveStore = 'FAIL';
      console.error(`Active store did not persist. Got: ${activeStoreAfterRefresh}`);
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-store-switching-fail.png' });
    }

  } catch (err: any) {
    console.error('❌ Browser E2E store-switching test crashed:', err);
    try {
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-store-switching-crash.png' });
    } catch (scre) {
      console.error('Failed to take screenshot:', scre);
    }
  } finally {
    // Delete QA data
    console.log('Cleaning up QA test data from Supabase...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    
    if (insertedRes0301Id) await supabase.from('reservations').delete().eq('id', insertedRes0301Id);
    if (insertedRes0302Id) await supabase.from('reservations').delete().eq('id', insertedRes0302Id);
    if (insertedTable0301Id) await supabase.from('restaurant_tables').delete().eq('id', insertedTable0301Id);
    if (insertedTable0302Id) await supabase.from('restaurant_tables').delete().eq('id', insertedTable0302Id);
    
    console.log('Cleanup completed.');
    results.dbCleanupQAData = 'PASS';
    
    await browser.close();
  }
}

async function main() {
  await runDirectChecks();
  await runBrowserE2ETest();

  console.log('\n======================================');
  console.log('STORE SWITCHING E2E TEST SUMMARY RESULTS');
  console.log('======================================');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
