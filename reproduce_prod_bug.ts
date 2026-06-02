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
let failingStep = '';
let consoleErrors: string[] = [];
let networkLogs: any[] = [];
let currentUserInfo: any = null;

async function runDirectDBChecks() {
  console.log('\n==================================================');
  console.log('TASK 2: RUNNING DIRECT AUTHENTICATED SUPABASE CHECKS');
  console.log('==================================================');
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

  // 1. select from public.profiles for current user
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  directResults['1. select_profile'] = profileErr 
    ? { status: 'FAIL', code: profileErr.code, message: profileErr.message } 
    : { status: 'PASS', data: profile };
  if (profile) {
    currentUserInfo = profile;
    console.log(`Profile loads: role=${profile.role}, active_store=${profile.active_store}, assigned_stores=${profile.assigned_stores}`);
  }

  // Ensure active store is '0301'
  if (profile && profile.active_store !== '0301') {
    console.log("Direct DB: Setting active_store to '0301' for testing...");
    await supabase.from('profiles').update({ active_store: '0301' }).eq('id', uid);
  }

  // 2. select from public.restaurant_tables where store_id = '0301'
  const { data: tables, error: selectTablesErr } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('store_id', '0301');
  directResults['2. select_tables_0301'] = selectTablesErr 
    ? { status: 'FAIL', code: selectTablesErr.code, message: selectTablesErr.message } 
    : { status: 'PASS', count: tables?.length || 0 };

  // 3. insert test table into restaurant_tables
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
  
  directResults['3. insert_table_0301'] = insertErr 
    ? { status: 'FAIL', code: insertErr.code, message: insertErr.message } 
    : { status: 'PASS', data: newTable };

  if (newTable) {
    console.log(`✅ Inserted test table: id=${newTable.id}, number=${newTable.number}`);

    // 4. update test table status
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

    directResults['4. update_table_status'] = (updateStatusErr || checkTable?.status !== 'occupied')
      ? { status: 'FAIL', code: updateStatusErr?.code || 'CHECK_FAILED', message: updateStatusErr?.message || 'Status did not change' } 
      : { status: 'PASS' };

    // 5. update test table x/y
    const { error: updateCoordErr } = await supabase
      .from('restaurant_tables')
      .update({ x: 150, y: 150 })
      .eq('id', newTable.id);

    const { data: checkTableCoord } = await supabase
      .from('restaurant_tables')
      .select('x, y')
      .eq('id', newTable.id)
      .single();

    directResults['5. update_table_coords'] = (updateCoordErr || checkTableCoord?.x !== 150)
      ? { status: 'FAIL', code: updateCoordErr?.code || 'CHECK_FAILED', message: updateCoordErr?.message || 'Coordinates did not change' } 
      : { status: 'PASS' };

    // 6. delete test table
    const { error: deleteErr } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', newTable.id);

    const { data: checkDeleted } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('id', newTable.id)
      .maybeSingle();

    directResults['6. delete_table'] = (deleteErr || checkDeleted)
      ? { status: 'FAIL', code: deleteErr?.code || 'CHECK_FAILED', message: deleteErr?.message || 'Row still exists' } 
      : { status: 'PASS' };
  } else {
    directResults['4. update_table_status'] = { status: 'SKIP', message: 'Insert failed' };
    directResults['5. update_table_coords'] = { status: 'SKIP', message: 'Insert failed' };
    directResults['6. delete_table'] = { status: 'SKIP', message: 'Insert failed' };
  }

  console.log('\n--- DIRECT SUPABASE CHECK RESULTS ---');
  for (const [name, res] of Object.entries(directResults)) {
    console.log(`${name}: ${res.status} ${res.message ? `(${res.message})` : ''}`);
  }
}

async function runBrowserE2ETest() {
  console.log('\n==================================================');
  console.log('TASK 1: RUNNING PRODUCTION BROWSER E2E TEST');
  console.log('==================================================');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const timestamp = Date.now();
  const testTableName = `PROD-QA-TABLE-${timestamp}`;

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[Browser Console ${type.toUpperCase()}] ${text}`);
    if (type === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('request', req => {
    const url = req.url();
    const method = req.method();
    if (url.includes('supabase') || url.includes('restaurant_tables')) {
      const payload = req.postData();
      networkLogs.push({
        type: 'request',
        method,
        url,
        payload: payload || null,
        timestamp: Date.now()
      });
      console.log(`[Network Request] ${method} -> ${url}`);
      if (payload) {
        console.log(`  - Payload: ${payload}`);
      }
    }
  });

  page.on('response', async res => {
    const url = res.url();
    const method = res.request().method();
    if (url.includes('supabase') || url.includes('restaurant_tables')) {
      const status = res.status();
      let body = '';
      try {
        body = await res.text();
      } catch (err) {}
      
      networkLogs.push({
        type: 'response',
        method,
        url,
        status,
        body,
        timestamp: Date.now()
      });
      console.log(`[Network Response] ${method} -> ${url} | HTTP ${status}`);
      if (body) {
        console.log(`  - Body: ${body.substring(0, 300)}`);
      }
    }
  });

  try {
    // 1. Open production URL.
    failingStep = '1. Open production URL';
    console.log(`Navigating to ${PROD_URL}...`);
    await page.goto(PROD_URL);
    await page.waitForTimeout(4000);

    // 2. Login as existing owner user.
    failingStep = '2. Login as owner';
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      console.log('Logging in...');
      await emailInput.fill(EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button:has-text("Enter Workspace")');
      await page.waitForTimeout(8000);
    }

    // 3. Confirm profile loads.
    failingStep = '3. Confirm profile loads';
    const hasWorkspaceSelector = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
    const hasLiveFloorLink = await page.locator('button[title="Floor Plan"], button:has-text("Floor Plan")').count() > 0;
    if (!hasWorkspaceSelector && !hasLiveFloorLink) {
      throw new Error('Profile/Workspace page did not load.');
    }
    console.log('✅ Profile loaded successfully.');

    // 4. Confirm active store is 0301.
    failingStep = '4. Confirm active store is 0301';
    if (hasWorkspaceSelector) {
      console.log('Workspace initialization selector displayed. Selecting store 0301...');
      await page.selectOption('select', '0301');
      await page.click('button:has-text("Initialize Store Workspace")');
      await page.waitForTimeout(6000);
    }

    const storeSelector = page.locator('#active-store-select');
    if (await storeSelector.count() > 0) {
      const activeStore = await storeSelector.inputValue();
      console.log(`Active store selected in header dropdown: ${activeStore}`);
      if (activeStore !== '0301') {
        console.log('Switching store selector to 0301...');
        await storeSelector.selectOption('0301');
        await page.waitForTimeout(6000);
      }
    }

    // 5. Open Live Floor.
    failingStep = '5. Open Live Floor';
    console.log('Navigating to Live Floor...');
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(5000);

    // 6. Add a test table named PROD-QA-TABLE-[timestamp].
    failingStep = '6. Add a test table';
    console.log('Adding table...');
    
    // Auto-accept alert if any
    let alertText = '';
    page.on('dialog', async dialog => {
      alertText = dialog.message();
      console.log(`[Alert Dialog] "${alertText}"`);
      await dialog.accept();
    });

    const addBtn = page.locator('button[title="Add New Table"]');
    if (await addBtn.count() === 0) {
      throw new Error('"Add New Table" button not found on Live Floor.');
    }
    await addBtn.click();
    await page.waitForTimeout(4000);

    if (alertText) {
      throw new Error(`Failed to add table in UI: Alert shown: "${alertText}"`);
    }

    // A table was added and the modal should be open.
    // Switch to config tab to rename
    failingStep = '6. Rename added table to PROD-QA-TABLE-[timestamp]';
    console.log('Switching to Configure Layout tab in modal...');
    const configTab = page.locator('button:has-text("Configure Layout")');
    if (await configTab.count() === 0) {
      throw new Error('"Configure Layout" tab not found in table modal.');
    }
    await configTab.click();
    await page.waitForTimeout(2000);

    console.log(`Setting table name to: ${testTableName}`);
    const nameInput = page.locator('form input[type="text"]');
    await nameInput.fill(testTableName);
    await page.waitForTimeout(1000);

    console.log('Clicking Update Properties...');
    await page.click('button:has-text("Update Properties")');
    await page.waitForTimeout(4000);

    // Close the modal
    console.log('Closing table modal...');
    await page.locator('.fixed.inset-0.z-50 button.bg-slate-900').first().click();
    await page.waitForTimeout(2000);

    // 10. Refresh production browser.
    failingStep = '10. Refresh production browser after add';
    console.log('Refreshing browser...');
    await page.reload();
    await page.waitForTimeout(6000);

    console.log('Navigating back to Floor Plan after refresh...');
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(5000);

    // 11. Confirm whether table persists.
    failingStep = '11. Confirm whether table persists';
    console.log(`Checking if table ${testTableName} persists on layout...`);
    const tableTextLocator = page.getByText(testTableName, { exact: true });
    if (await tableTextLocator.count() === 0) {
      throw new Error(`Table ${testTableName} did not persist on layout after refresh.`);
    }
    console.log('✅ Table persisted successfully.');

    // 12. Change table status to occupied.
    failingStep = '12. Change table status to occupied';
    console.log(`Clicking on table ${testTableName} to open modal...`);
    const tableContainer = page.locator('.table-node-interactive').filter({ hasText: testTableName }).first();
    await tableContainer.click({ force: true });
    await page.waitForTimeout(3000);

    console.log('Clicking "Seat Party" (occupied) button...');
    const seatBtn = page.locator('button:has-text("Seat Party")');
    if (await seatBtn.count() === 0) {
      throw new Error('"Seat Party" button not found in modal.');
    }
    await seatBtn.click();
    await page.waitForTimeout(4000);

    // Close the modal
    console.log('Closing table modal...');
    await page.locator('.fixed.inset-0.z-50 button.bg-slate-900').first().click();
    await page.waitForTimeout(2000);

    // 14. Refresh production browser.
    failingStep = '14. Refresh production browser after status update';
    console.log('Refreshing browser...');
    await page.reload();
    await page.waitForTimeout(6000);

    console.log('Navigating back to Floor Plan after refresh...');
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(5000);

    // 15. Confirm whether status persists.
    failingStep = '15. Confirm whether status persists';
    console.log(`Clicking on table ${testTableName} to verify status...`);
    await page.locator('.table-node-interactive').filter({ hasText: testTableName }).first().click({ force: true });
    await page.waitForTimeout(3000);

    // Look for status badge showing "occupied"
    const occupiedBadge = page.locator('span:has-text("occupied")');
    if (await occupiedBadge.count() === 0) {
      throw new Error('Table status "occupied" did not persist after refresh.');
    }
    console.log('✅ Status "occupied" persisted successfully.');

    // 16. Delete/cleanup the QA table if possible.
    failingStep = '16. Delete/cleanup QA table';
    console.log('Cleaning up: Switching to Configure Layout tab...');
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(2000);

    console.log('Clicking Decommission Unit...');
    const deleteBtn = page.locator('button:has-text("Decommission Unit")');
    if (await deleteBtn.count() === 0) {
      throw new Error('"Decommission Unit" button not found.');
    }
    await deleteBtn.click();
    await page.waitForTimeout(4000);
    console.log('✅ QA table decommissioned/cleaned up.');

    console.log('\n==================================================');
    console.log('🎉 ALL BROWSER E2E CHECKS PASSED SUCCESSFULLY!');
    console.log('==================================================');
    failingStep = ''; // Success

  } catch (err: any) {
    console.error(`\n❌ E2E TEST FAILED AT STEP: "${failingStep}"`);
    console.error(`Error: ${err.message}`);

    // Print failing diagnostics requested:
    console.log('\n================ FAIL DIAGNOSTICS ================');
    console.log(`Failing Step: ${failingStep}`);
    console.log(`Browser Console Error Logs:\n`, consoleErrors.join('\n'));

    // Find failing Supabase requests in logs
    const supLogs = networkLogs.filter(n => n.url.includes('supabase') || n.url.includes('restaurant_tables'));
    const lastResponses = supLogs.filter(n => n.type === 'response');
    const lastRequests = supLogs.filter(n => n.type === 'request');

    console.log('\nLast Network Requests to Supabase:');
    lastRequests.slice(-3).forEach(req => {
      console.log(`- ${req.method} ${req.url} (Payload: ${req.payload})`);
    });

    console.log('\nLast Network Responses from Supabase:');
    lastResponses.slice(-3).forEach(res => {
      console.log(`- ${res.method} ${res.url} | HTTP ${res.status}`);
      console.log(`  Response Body: ${res.body}`);
    });

    console.log('\nCurrent Logged-in User Context in Direct DB:');
    if (currentUserInfo) {
      console.log(`- ID: ${currentUserInfo.id}`);
      console.log(`- Email: ${currentUserInfo.email}`);
      console.log(`- Role: ${currentUserInfo.role}`);
      console.log(`- Active Store: ${currentUserInfo.active_store}`);
      console.log(`- Assigned Stores: ${currentUserInfo.assigned_stores}`);
    } else {
      console.log('- (User info not loaded from profiles)');
    }
    console.log('==================================================\n');
    
    // Save a fail screenshot
    await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/prod-fail-screenshot.png' });
    console.log('Screenshot of failure saved to: c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/prod-fail-screenshot.png');
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

async function main() {
  await runDirectDBChecks();
  await runBrowserE2ETest();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
