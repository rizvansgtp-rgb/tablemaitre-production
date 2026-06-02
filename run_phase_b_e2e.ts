import { chromium } from '@playwright/test';
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

const results = {
  seatingSync: 'PENDING',
  cancellationSync: 'PENDING',
  lifecycleGuardBlocked: 'PENDING',
  lifecycleGuardFlow: 'PENDING',
  tableTransfer: 'PENDING'
};

async function reloadAndNavigateTo(page: any, tabName: string) {
  console.log(`Refreshing browser and navigating to ${tabName}...`);
  await page.reload();
  await page.waitForTimeout(3500);

  const hasStoreButton = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
  if (hasStoreButton) {
    await page.selectOption('select', '0301');
    await page.click('button:has-text("Initialize Store Workspace")');
    await page.waitForTimeout(3000);
  }

  await page.click(`button[title="${tabName}"], button:has-text("${tabName}")`);
  await page.waitForTimeout(2500);
}

async function run() {
  console.log('--- INITIAL DATABASE CLEANUP ---');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const login = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (login.error) {
    console.error('❌ Supabase Auth failed:', login.error.message);
    process.exit(1);
  }

  // Cleanup old QA tables and reservations
  const { data: dbTables } = await supabase.from('restaurant_tables').select('id, number').eq('store_id', '0301');
  if (dbTables) {
    const toDel = dbTables.filter(t => t.number.startsWith('QA-B-'));
    if (toDel.length > 0) {
      console.log('Cleaning up existing QA-B tables:', toDel.map(t => t.number));
      await supabase.from('restaurant_tables').delete().in('id', toDel.map(t => t.id));
    }
  }

  const { data: dbReservations } = await supabase.from('reservations').select('id, guest_name').eq('store_id', '0301');
  if (dbReservations) {
    const toDelRes = dbReservations.filter(r => r.guest_name.startsWith('QA-B-'));
    if (toDelRes.length > 0) {
      console.log('Cleaning up existing QA-B reservations:', toDelRes.map(r => r.guest_name));
      await supabase.from('reservations').delete().in('id', toDelRes.map(r => r.id));
    }
  }

  console.log('\n--- STARTING BROWSER E2E ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let dialogMessage = '';
  page.on('dialog', async dialog => {
    dialogMessage = dialog.message();
    console.log(`[Dialog Triggered] Type: ${dialog.type()} | Message: "${dialogMessage}"`);
    await dialog.accept();
  });

  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
  });

  const timestamp = Date.now().toString().slice(-6);
  const testTableNameA = `QA-B-T1-${timestamp}`;
  const testTableNameB = `QA-B-T2-${timestamp}`;
  const testGuestName = `QA-B-GUEST-${timestamp}`;
  const testPhone = `+97150${timestamp}`;

  try {
    const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl);
    await page.waitForTimeout(3000);

    // Login if needed
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
    if (hasEmailInput) {
      await page.fill('input[type="email"]', EMAIL);
      await page.fill('input[type="password"]', PASSWORD);
      await page.click('button:has-text("Enter Workspace")');
      await page.waitForTimeout(4500);
    }

    const hasStoreButton = await page.locator('button:has-text("Initialize Store Workspace")').count() > 0;
    if (hasStoreButton) {
      await page.selectOption('select', '0301');
      await page.click('button:has-text("Initialize Store Workspace")');
      await page.waitForTimeout(3500);
    }

    // --- STEP 1: CREATE QA TABLES ---
    console.log('Creating QA tables...');
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(3000);

    // Get the first section tab name dynamically
    const sectionTabs = page.locator('.relative.flex.items-center button');
    const secNameA = await sectionTabs.nth(0).locator('span').first().innerText();
    console.log(`Navigating to Section: "${secNameA}"`);
    await sectionTabs.nth(0).click();
    await page.waitForTimeout(1500);

    // Add Table A
    console.log(`Adding table ${testTableNameA}...`);
    await page.click('button[title="Add New Table"]');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.fill('form input[type="text"]', testTableNameA);
    await page.click('button:has-text("Update Properties")');
    await page.waitForTimeout(2500);
    await page.locator('.fixed.inset-0 button').first().click(); // Close details modal
    await page.waitForTimeout(1000);

    // Add Table B
    console.log(`Adding table ${testTableNameB}...`);
    await page.click('button[title="Add New Table"]');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.fill('form input[type="text"]', testTableNameB);
    await page.click('button:has-text("Update Properties")');
    await page.waitForTimeout(2500);
    await page.locator('.fixed.inset-0 button').first().click(); // Close details modal
    await page.waitForTimeout(1000);


    // --- STEP 2: CREATE QA RESERVATION & SEAT IT (TEST CASE A) ---
    console.log('\n--- TEST CASE A: Reservation Seating Sync ---');
    await page.click('button[title="Reservations"], button:has-text("Reservations")');
    await page.waitForTimeout(2500);

    console.log('Creating test reservation...');
    await page.click('button:has-text("Create Booking")');
    await page.waitForTimeout(1500);

    await page.fill('form input[placeholder="Charles Leclerc"]', testGuestName);
    await page.fill('form input[placeholder="+971 50 123 4567"]', testPhone);
    
    // Assign to Table A
    console.log(`Assigning reservation to Table ${testTableNameA}...`);
    await page.locator('label:has-text("Assign Table") + select').selectOption({ label: `Table ${testTableNameA} (Cap 4)` });
    await page.click('button:has-text("Commit Booking")');
    await page.waitForTimeout(3000);

    // Now seat the reservation
    console.log('Seating the reservation...');
    const reservationCard = page.locator('div.group', { hasText: testGuestName });
    await reservationCard.locator('button[title="Seat"]').click();
    await page.waitForTimeout(3000);

    // Verify reservation status in UI
    const statusText = await reservationCard.locator('span.rounded').innerText();
    console.log(`Reservation card status is now: ${statusText}`);

    // Verify table status on Floor Plan
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(3000);

    const tableNodeA = page.locator('.table-node-interactive', { hasText: testTableNameA });
    // Click table A to open details
    await tableNodeA.click();
    await page.waitForTimeout(2000);

    // Verify details in sidebar
    const detailHeader = await page.locator('.fixed.inset-0 span.text-2xl').innerText();
    const tableStatusText = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Table details header: ${detailHeader} | Status: ${tableStatusText}`);

    // Verify guest count and reservation name in inputs/labels
    const reservationNameValue = await page.locator('.fixed.inset-0 p.text-\\[10px\\]').innerText();
    console.log(`Table section subtitle: ${reservationNameValue}`);

    if (tableStatusText.toLowerCase() === 'occupied') {
      console.log('✅ Success: Seating sync updated table to occupied.');
      results.seatingSync = 'PASS';
    } else {
      console.error('❌ Fail: Table status did not shift to occupied.');
      results.seatingSync = 'FAIL';
    }

    // Close details modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);

    // Refresh and verify persistence
    await reloadAndNavigateTo(page, 'Floor Plan');
    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(1500);
    const tableStatusPostRefresh = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Table A status post-refresh: ${tableStatusPostRefresh}`);
    if (tableStatusPostRefresh.toLowerCase() !== 'occupied') {
      results.seatingSync = 'FAIL';
    }
    await page.locator('.fixed.inset-0 button').first().click(); // Close modal
    await page.waitForTimeout(1000);


    // --- STEP 3: TEST CASE C: Lifecycle Guard Blocked & Valid Shifts ---
    console.log('\n--- TEST CASE C: Lifecycle guards ---');
    // Try to move available Table B directly to billing
    const tableNodeB = page.locator('.table-node-interactive', { hasText: testTableNameB });
    await tableNodeB.click();
    await page.waitForTimeout(1500);

    console.log('Trying transition: available -> billing directly (should be blocked)...');
    dialogMessage = '';
    await page.click('button:has-text("Request Bill")');
    await page.waitForTimeout(1500);

    if (dialogMessage.includes('Invalid Shift') || dialogMessage.includes('blocked') || dialogMessage.includes('Transition')) {
      console.log('✅ Success: Lifecycle guard blocked invalid transition available -> billing.');
      results.lifecycleGuardBlocked = 'PASS';
    } else {
      console.error('❌ Fail: Invalid transition was not blocked or no warning dialog appeared.');
      results.lifecycleGuardBlocked = 'FAIL';
    }

    // Now test valid transition path: available -> occupied -> billing -> cleaning -> available
    console.log('Testing valid lifecycle path...');
    // available -> occupied
    await page.click('button:has-text("Seat Guest")');
    await page.waitForTimeout(1500);
    let statusDesk = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Status after Seat Guest: ${statusDesk}`);

    // occupied -> billing
    await page.click('button:has-text("Request Bill")');
    await page.waitForTimeout(1500);
    statusDesk = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Status after Request Bill: ${statusDesk}`);

    // billing -> cleaning
    await page.click('button:has-text("Send to Cleaning")');
    await page.waitForTimeout(1500);
    statusDesk = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Status after Send to Cleaning: ${statusDesk}`);

    // cleaning -> available
    await page.click('button:has-text("Open Table")');
    await page.waitForTimeout(1500);
    statusDesk = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Status after Open Table: ${statusDesk}`);

    if (statusDesk.toLowerCase() === 'available') {
      console.log('✅ Success: Valid lifecycle flow completed successfully.');
      results.lifecycleGuardFlow = 'PASS';
    } else {
      console.error('❌ Fail: Valid lifecycle flow did not return table to available.');
      results.lifecycleGuardFlow = 'FAIL';
    }

    // Close details modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);


    // --- STEP 4: TEST CASE D: Table Transfer ---
    console.log('\n--- TEST CASE D: Table Transfer ---');
    // First, make sure Table A is selected and occupied
    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(1500);

    console.log(`Transferring session from Table ${testTableNameA} to ${testTableNameB}...`);
    await page.selectOption('select:has(option:has-text("Select Destination Table"))', { label: `Table ${testTableNameB} (Cap 4)` });
    await page.waitForTimeout(500);

    // Choose Clean Action
    await page.selectOption('select:has(option:has-text("Send Source Table to Cleaning"))', { label: 'Send Source Table to Cleaning' });
    await page.waitForTimeout(500);

    // Execute transfer
    await page.click('button:has-text("Execute Table Transfer")');
    await page.waitForTimeout(3000);

    // Verify Table B details
    console.log('Checking Destination Table B...');
    await page.locator('.table-node-interactive', { hasText: testTableNameB }).click();
    await page.waitForTimeout(1500);
    const destStatus = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Destination Table B status: ${destStatus}`);
    
    // Close modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);

    // Verify Source Table A details
    console.log('Checking Source Table A...');
    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(1500);
    const srcStatus = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Source Table A status: ${srcStatus}`);

    // Close modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);

    // Verify reservation table_id in reservations screen
    console.log('Checking linked reservation table allocation...');
    await page.click('button[title="Reservations"], button:has-text("Reservations")');
    await page.waitForTimeout(2500);
    
    const transferResCard = page.locator('div.group', { hasText: testGuestName });
    await transferResCard.locator('button[title="Edit/Update Attributes"]').click();
    await page.waitForTimeout(1500);
    const currentAllocatedTable = await page.locator('label:has-text("Assign Table") + select').inputValue();
    console.log(`Allocated table ID in edit reservation modal: ${currentAllocatedTable}`);

    // Close booking modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);

    if (destStatus.toLowerCase() === 'occupied' && srcStatus.toLowerCase() === 'cleaning') {
      console.log('✅ Success: Table session successfully transferred.');
      results.tableTransfer = 'PASS';
    } else {
      console.error('❌ Fail: Table transfer states incorrect.');
      results.tableTransfer = 'FAIL';
    }


    // --- STEP 5: TEST CASE B: Cancellation Sync ---
    console.log('\n--- TEST CASE B: Cancellation Sync ---');
    console.log('Cancelling the reservation...');
    await transferResCard.locator('button[title="Cancel"]').click();
    await page.waitForTimeout(3000);

    // Verify reservation status in UI is cancelled
    const finalResStatusText = await transferResCard.locator('span.rounded').innerText();
    console.log(`Final reservation card status: ${finalResStatusText}`);

    // Verify Table B (the new linked table) is now cleaning (since it was occupied)
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(3000);

    await page.locator('.table-node-interactive', { hasText: testTableNameB }).click();
    await page.waitForTimeout(1500);
    const tableBStatusAfterCancel = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Table B status after reservation cancel: ${tableBStatusAfterCancel}`);

    if (finalResStatusText.toLowerCase() === 'cancelled' && tableBStatusAfterCancel.toLowerCase() === 'cleaning') {
      console.log('✅ Success: Cancellation sync cleared and updated table status to cleaning.');
      results.cancellationSync = 'PASS';
    } else {
      console.error('❌ Fail: Cancellation sync failed.');
      results.cancellationSync = 'FAIL';
    }

    // Close details modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);


    // --- STEP 6: CLEANUP QA TABLES ---
    console.log('\nCleaning up QA tables used in test...');
    // Re-open Table A to remove it
    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Remove Table")');
    await page.waitForTimeout(2000);

    // Re-open Table B to remove it
    await page.locator('.table-node-interactive', { hasText: testTableNameB }).click();
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Remove Table")');
    await page.waitForTimeout(2000);

  } catch (err: any) {
    console.error('❌ E2E run crashed:', err);
    try {
      await page.screenshot({ path: 'C:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-crash.png' });
      console.log('Saved crash screenshot.');
    } catch (screenErr) {
      console.error('Failed to capture crash screenshot:', screenErr);
    }
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n================ PHASE B E2E RESULTS ================\n');
  console.table(results);
  console.log('\n======================================================\n');

  const failed = Object.values(results).some(val => val.startsWith('FAIL') || val === 'PENDING');
  if (failed) {
    console.error('❌ Some Phase B E2E checks failed!');
    process.exit(1);
  } else {
    console.log('✅ All Phase B E2E checks passed successfully!');
    process.exit(0);
  }
}

run();
