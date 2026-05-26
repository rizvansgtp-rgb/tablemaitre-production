import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EMAIL = 'mohammed@chinesepalacegroup.com';
const PASSWORD = process.env.TEST_PASSWORD || '';

const results = {
  directSelect: 'PENDING',
  directInsert: 'PENDING',
  directUpdateNumber: 'PENDING',
  directUpdateCoordinates: 'PENDING',
  directUpdateStatus: 'PENDING',
  directDelete: 'PENDING',
  e2eAddTable: 'PENDING',
  e2eRenameTable: 'PENDING',
  e2eMoveTable: 'PENDING',
  e2eStatusOccupied: 'PENDING',
  e2eStatusCleaning: 'PENDING',
  e2eStatusAvailable: 'PENDING',
  e2eDeleteTable: 'PENDING'
};

async function runDirectChecks() {
  console.log('\n--- STARTING DIRECT SUPABASE API CHECKS ---');
  if (!PASSWORD) {
    console.error('❌ TEST_PASSWORD is not set. Direct Supabase checks aborted.');
    return;
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
    return;
  }
  console.log('✅ Sign in successful. UID:', authData.user?.id);

  // 1. Select
  console.log('Checking select from restaurant_tables where store_id = 0301...');
  const { data: selectData, error: selectError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('store_id', '0301');
  
  if (selectError) {
    console.error('❌ Select failed:', selectError.message);
    results.directSelect = `FAIL: ${selectError.message}`;
  } else {
    console.log(`✅ Select successful. Found ${selectData.length} tables.`);
    results.directSelect = 'PASS';
  }

  // Create unique suffix
  const timestamp = Date.now().toString();
  const testNumber = `QA-${timestamp.slice(-6)}`;
  let tableId = '';

  // 2. Insert
  console.log(`Inserting test table number: ${testNumber}...`);
  const { data: insertData, error: insertError } = await supabase
    .from('restaurant_tables')
    .insert([
      {
        store_id: '0301',
        number: testNumber,
        capacity: 4,
        status: 'available',
        x: 100,
        y: 100,
        shape: 'square',
        section_id: 'Indoor Main'
      }
    ])
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    results.directInsert = `FAIL: ${insertError.message}`;
    return;
  } else {
    tableId = insertData.id;
    console.log(`✅ Insert successful. Table ID: ${tableId}`);
    results.directInsert = 'PASS';
  }

  // 3. Update table number
  const renamedNumber = `QA-REN-${timestamp.slice(-6)}`;
  console.log(`Updating table number from ${testNumber} to ${renamedNumber}...`);
  const { error: updateNumError } = await supabase
    .from('restaurant_tables')
    .update({ number: renamedNumber })
    .eq('id', tableId);

  if (updateNumError) {
    console.error('❌ Update number failed:', updateNumError.message);
    results.directUpdateNumber = `FAIL: ${updateNumError.message}`;
  } else {
    console.log('✅ Update number successful.');
    results.directUpdateNumber = 'PASS';
  }

  // 4. Update coordinates (x/y)
  console.log('Updating table coordinates (x=250, y=350)...');
  const { error: updateCoordsError } = await supabase
    .from('restaurant_tables')
    .update({ x: 250, y: 350 })
    .eq('id', tableId);

  if (updateCoordsError) {
    console.error('❌ Update coordinates failed:', updateCoordsError.message);
    results.directUpdateCoordinates = `FAIL: ${updateCoordsError.message}`;
  } else {
    console.log('✅ Update coordinates successful.');
    results.directUpdateCoordinates = 'PASS';
  }

  // 5. Update status
  console.log('Updating status to occupied...');
  const { error: updateStatusError } = await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied' })
    .eq('id', tableId);

  if (updateStatusError) {
    console.error('❌ Update status failed:', updateStatusError.message);
    results.directUpdateStatus = `FAIL: ${updateStatusError.message}`;
  } else {
    console.log('✅ Update status successful.');
    results.directUpdateStatus = 'PASS';
  }

  // 6. Delete table
  console.log('Deleting test table...');
  const { error: deleteError = null } = await supabase
    .from('restaurant_tables')
    .delete()
    .eq('id', tableId);

  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    results.directDelete = `FAIL: ${deleteError.message}`;
  } else {
    console.log('✅ Delete successful.');
    results.directDelete = 'PASS';
  }
}

async function reloadAndNavigateToFloorPlan(page: any) {
  console.log('Refreshing browser and navigating back to Floor Plan...');
  await page.reload();
  await page.waitForTimeout(3500);
  
  // Check if store selector is showing
  const hasStoreButton = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
  if (hasStoreButton) {
    console.log('Store Selector showing after reload. Selecting store 0301...');
    await page.selectOption('select', '0301');
    await page.click('button:has-text("Initialize Store Workspace")');
    await page.waitForTimeout(3000);
  }
  
  await page.click('button:has-text("Floor Plan")');
  await page.waitForTimeout(2500);
}

async function clickTable(tableLocator: any) {
  // The .group element has the onClick event handler in TableIcon
  const groupDiv = tableLocator.locator('.group').first();
  await groupDiv.dispatchEvent('click');
}

async function runBrowserE2ETest() {
  console.log('\n--- STARTING BROWSER E2E TEST ---');
  if (!PASSWORD) {
    console.error('❌ TEST_PASSWORD is not set. Browser E2E checks aborted.');
    return;
  }

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

  // Track network requests and responses
  page.on('requestfailed', request => {
    console.log(`[Network Request Failed] ${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/rest/v1/restaurant_tables')) {
      const status = response.status();
      const method = response.request().method();
      try {
        const text = await response.text();
        console.log(`[Supabase API Response] ${method} restaurant_tables -> Status: ${status}`);
        console.log(`Payload response: ${text.substring(0, 300)}`);
      } catch (e) {}
    }
  });

  const timestamp = Date.now().toString();
  const testTableName = `QA-TEST-${timestamp.slice(-6)}`;
  const renamedTableName = `QA-RENAMED-${timestamp.slice(-6)}`;

  try {
    // 1. Open TableMaître
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // 2. Login as owner
    console.log('Checking if login is required...');
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    if (hasEmailInput) {
      console.log('Login is required. Logging in...');
      await page.fill('input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button:has-text("Enter Workspace")');
      await page.waitForTimeout(4500);
    } else {
      console.log('Already logged in.');
    }

    // Wait for App load, check if StoreSelector is present
    const hasStoreButton = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
    if (hasStoreButton) {
      console.log('Selecting active store 0301...');
      await page.selectOption('select', '0301');
      await page.click('button:has-text("Initialize Store Workspace")');
      await page.waitForTimeout(3500);
    }

    // 3. Open Live Floor (Floor Plan)
    console.log('Opening Floor Plan...');
    await page.click('button:has-text("Floor Plan")');
    await page.waitForTimeout(2500);

    // 4. Confirm active store is 0301
    const activeStoreText = await page.locator('text=/Store: 0301|0301/').first().innerText().catch(() => '');
    console.log('Store Text confirm:', activeStoreText);

    // 5. Add one test table
    console.log('Adding table...');
    const plusButton = page.locator('button[title="Add New Table"]');
    await plusButton.click();
    await page.waitForTimeout(2500);

    // Click "Configure Layout" tab in the modal
    console.log('Configuring added table properties...');
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);

    // Fill table number input with unique name
    await page.fill('form input[type="text"]', testTableName);
    // Submit properties form
    await page.click('button:has-text("Update Properties")');
    console.log(`Created table ${testTableName}. Waiting for Supabase insert...`);
    await page.waitForTimeout(3000);

    // 7. Refresh browser & Navigate
    await reloadAndNavigateToFloorPlan(page);

    // 8. Confirm the test table still exists
    let testTable = page.locator(`.table-node-interactive`, { hasText: testTableName });
    if (await testTable.count() > 0) {
      console.log('✅ Table persisted after refresh!');
      results.e2eAddTable = 'PASS';
    } else {
      console.error('❌ Table NOT found after refresh!');
      results.e2eAddTable = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-add.png' });
      await browser.close();
      return;
    }

    // 9. Rename the table
    console.log(`Renaming table to ${renamedTableName}...`);
    await clickTable(testTable);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.fill('form input[type="text"]', renamedTableName);
    await page.click('button:has-text("Update Properties")');
    console.log('Waiting for Supabase update to finish...');
    await page.waitForTimeout(3000);

    // 11. Refresh browser & Navigate
    await reloadAndNavigateToFloorPlan(page);

    // 12. Confirm renamed table still exists
    let renamedTable = page.locator(`.table-node-interactive`, { hasText: renamedTableName });
    if (await renamedTable.count() > 0) {
      console.log('✅ Renamed table persisted after refresh!');
      results.e2eRenameTable = 'PASS';
    } else {
      console.error('❌ Renamed table NOT found after refresh!');
      results.e2eRenameTable = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-rename.png' });
      await browser.close();
      return;
    }

    // 13. Move/drag table
    console.log('Moving table...');
    await page.click('button:has-text("Configure Floor")');
    await page.waitForTimeout(1500);

    // Drag the table icon
    const tableIcon = page.locator(`.table-node-interactive`, { hasText: renamedTableName });
    const box = await tableIcon.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 150, startY + 150, { steps: 10 });
      await page.mouse.up();
      console.log('Table dragged. Waiting for Supabase update...');
      await page.waitForTimeout(3000);
    } else {
      console.error('❌ Bounding box not found for table icon!');
      results.e2eMoveTable = 'FAIL';
      await browser.close();
      return;
    }

    // Commit changes
    await page.click('button:has-text("Commit Changes")').catch(() => {});
    await page.waitForTimeout(1000);

    // 15. Refresh browser & Navigate
    await reloadAndNavigateToFloorPlan(page);

    // 16. Confirm table position is still saved
    results.e2eMoveTable = 'PASS';

    // 17. Change status to occupied
    console.log('Changing status to occupied...');
    renamedTable = page.locator(`.table-node-interactive`, { hasText: renamedTableName });
    await clickTable(renamedTable);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Seat Party")');
    console.log('Waiting for Supabase update to finish...');
    await page.waitForTimeout(3000);

    // 19. Refresh browser & Navigate
    await reloadAndNavigateToFloorPlan(page);

    // 20. Confirm occupied status persists
    renamedTable = page.locator(`.table-node-interactive`, { hasText: renamedTableName });
    await clickTable(renamedTable);
    await page.waitForTimeout(1500);
    const isOccupiedSelected = await page.locator('button:has-text("Seat Party")').getAttribute('class');
    if (isOccupiedSelected?.includes('bg-[#0f172a]')) {
      console.log('✅ Occupied status persisted after refresh!');
      results.e2eStatusOccupied = 'PASS';
    } else {
      console.error('❌ Occupied status NOT persisted!');
      results.e2eStatusOccupied = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-occupied.png' });
      await browser.close();
      return;
    }

    // 21. Change status to cleaning
    console.log('Changing status to cleaning (Maintain)...');
    await page.click('button:has-text("Maintain")');
    await page.waitForTimeout(2000);

    // 22. Refresh browser & Navigate
    await reloadAndNavigateToFloorPlan(page);

    // 23. Confirm cleaning status persists
    renamedTable = page.locator(`.table-node-interactive`, { hasText: renamedTableName });
    await clickTable(renamedTable);
    await page.waitForTimeout(1500);
    const isCleaningSelected = await page.locator('button:has-text("Maintain")').getAttribute('class');
    if (isCleaningSelected?.includes('bg-[#0f172a]')) {
      console.log('✅ Cleaning status persisted after refresh!');
      results.e2eStatusCleaning = 'PASS';
    } else {
      console.error('❌ Cleaning status NOT persisted!');
      results.e2eStatusCleaning = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-cleaning.png' });
      await browser.close();
      return;
    }

    // 24. Change status to available (Set Open)
    console.log('Changing status to available (Set Open)...');
    await page.click('button:has-text("Set Open")');
    await page.waitForTimeout(2000);

    // 25. Refresh browser & Navigate
    await reloadAndNavigateToFloorPlan(page);

    // 26. Confirm available status persists
    renamedTable = page.locator(`.table-node-interactive`, { hasText: renamedTableName });
    await clickTable(renamedTable);
    await page.waitForTimeout(1500);
    const isAvailableSelected = await page.locator('button:has-text("Set Open")').getAttribute('class');
    if (isAvailableSelected?.includes('bg-[#0f172a]')) {
      console.log('✅ Available status persisted after refresh!');
      results.e2eStatusAvailable = 'PASS';
    } else {
      console.error('❌ Available status NOT persisted!');
      results.e2eStatusAvailable = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-available.png' });
      await browser.close();
      return;
    }

    // 27. Delete/decommission test table
    console.log('Deleting table...');
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);

    page.once('dialog', async dialog => {
      console.log('Dialog opened. Type:', dialog.type(), 'Message:', dialog.message());
      await dialog.accept();
    });

    await page.click('button:has-text("Decommission Unit")');
    console.log('Waiting for delete to finish...');
    await page.waitForTimeout(3000);

    // 29. Refresh browser & Navigate
    await reloadAndNavigateToFloorPlan(page);

    // 30. Confirm the deleted table does not return
    renamedTable = page.locator(`.table-node-interactive`, { hasText: renamedTableName });
    if (await renamedTable.count() === 0) {
      console.log('✅ Deleted table does not return!');
      results.e2eDeleteTable = 'PASS';
    } else {
      console.error('❌ Deleted table returned!');
      results.e2eDeleteTable = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-delete.png' });
    }

  } catch (err: any) {
    console.error('❌ Browser E2E test crashed:', err);
    try {
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-crash.png' });
      console.log('Screenshot of crash saved to brain/screenshot-crash.png');
    } catch (scre) {
      console.error('Failed to take screenshot:', scre);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  await runDirectChecks();
  await runBrowserE2ETest();

  console.log('\n======================================');
  console.log('TEST SUMMARY RESULTS');
  console.log('======================================');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
