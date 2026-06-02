import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EMAIL = process.env.TEST_EMAIL || 'mohammed@chinesepalacegroup.com';
const PASSWORD = process.env.TEST_PASSWORD || '';

if (!PASSWORD) {
  console.error('TEST_PASSWORD environment variable is required');
  process.exit(1);
}

const results = {
  addWaitlistGuest: 'PENDING',
  editWaitlistGuest: 'PENDING',
  noAvailableTableGuard: 'PENDING',
  seatWaitlistGuest: 'PENDING',
  dashboardCountSync: 'PENDING',
  cancelWaitlistEntry: 'PENDING'
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

  // Cleanup old QA tables and waitlist entries
  const { data: dbTables } = await supabase.from('restaurant_tables').select('id, number').eq('store_id', '0301');
  if (dbTables) {
    const toDel = dbTables.filter(t => t.number.startsWith('QA-C-'));
    if (toDel.length > 0) {
      console.log('Cleaning up existing QA-C tables:', toDel.map(t => t.number));
      await supabase.from('restaurant_tables').delete().in('id', toDel.map(t => t.id));
    }
  }

  const { data: dbWaitlist } = await supabase.from('waitlist').select('id, guest_name').eq('store_id', '0301');
  if (dbWaitlist) {
    const toDelWl = dbWaitlist.filter(w => w.guest_name.startsWith('QA-WAIT-') || w.guest_name.startsWith('QA-EDIT-'));
    if (toDelWl.length > 0) {
      console.log('Cleaning up existing QA waitlist entries:', toDelWl.map(w => w.guest_name));
      await supabase.from('waitlist').delete().in('id', toDelWl.map(w => w.id));
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
  const testTableNameA = `QA-C-T1-${timestamp}`;
  const testGuestNameA = `QA-WAIT-${timestamp}`;
  const testGuestNameB = `QA-WAIT-B-${timestamp}`;
  const testPhoneA = `+97150${timestamp}`;
  const testPhoneB = `+971509${timestamp}`;

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

    // Capture initial dashboard waitlist and occupied counts
    console.log('Capturing initial dashboard telemetry...');
    await page.click('button[title="Dashboard"], button:has-text("Dashboard")');
    await page.waitForTimeout(2500);

    const initialWaitCard = page.locator('div.rounded-2xl', { hasText: 'Waitlist' });
    const initialWaitCountText = await initialWaitCard.locator('.text-3xl').innerText();
    const initialWaitCount = parseInt(initialWaitCountText) || 0;
    const initialOccupiedCard = page.locator('div.rounded-2xl', { hasText: 'Occupied' });
    const initialOccupiedText = await initialOccupiedCard.locator('.text-3xl').innerText();
    const initialOccupiedCount = parseInt(initialOccupiedText) || 0;
    console.log(`Initial Dashboard Counts -> Waitlist: ${initialWaitCount} | Occupied: ${initialOccupiedCount}`);

    // --- STEP 1: CREATE QA TABLE (Table A) ---
    console.log('Creating QA table for seating...');
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(3000);

    // Navigate to Section: "SEC A" or first section tab dynamically
    const sectionTabs = page.locator('.relative.flex.items-center button');
    const secNameA = await sectionTabs.nth(0).locator('span').first().innerText();
    console.log(`Navigating to Section: "${secNameA}"`);
    await sectionTabs.nth(0).click();
    await page.waitForTimeout(1500);

    // Add Table A (defaults to available)
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


    // --- STEP 2: TEST CASE A: Add Waitlist Guest ---
    console.log('\n--- TEST CASE A: Add Waitlist Guest ---');
    await page.click('button[title="Waitlist"], button:has-text("Waitlist")');
    await page.waitForTimeout(2500);

    console.log(`Adding waitlist guest ${testGuestNameA}...`);
    await page.click('button:has-text("Add Walk-In")');
    await page.waitForTimeout(1000);
    await page.fill('form input[placeholder="E.g., Pierre Gasly"]', testGuestNameA);
    await page.fill('form input[placeholder="+971 50 123 4567"]', testPhoneA);
    await page.fill('form input[type="number"]', '3');
    await page.fill('form textarea', 'QA Test Notes for Seating');
    await page.click('form button[type="submit"]');
    await page.waitForTimeout(3000);

    // Verify waitlist card exists
    let guestCardA = page.locator('div.group', { hasText: testGuestNameA });
    const waitlistTextContent = await guestCardA.innerText();
    console.log(`Waitlist card A found: ${waitlistTextContent.includes(testGuestNameA)}`);

    if (waitlistTextContent.includes(testGuestNameA) && waitlistTextContent.includes('3')) {
      console.log('✅ Success: Guest successfully added to waitlist UI.');
      results.addWaitlistGuest = 'PASS';
    } else {
      results.addWaitlistGuest = 'FAIL';
    }

    // Refresh and verify persistence
    await reloadAndNavigateTo(page, 'Waitlist');
    guestCardA = page.locator('div.group', { hasText: testGuestNameA });
    const cardTextPostRefresh = await guestCardA.innerText();
    if (!cardTextPostRefresh.includes(testGuestNameA)) {
      results.addWaitlistGuest = 'FAIL';
      console.error('❌ Fail: Waitlist guest did not persist after refresh.');
    }


    // --- STEP 3: TEST CASE B: Edit Waitlist Guest ---
    console.log('\n--- TEST CASE B: Edit Waitlist Guest ---');
    console.log('Editing details of Guest A...');
    const renamedGuestNameA = `QA-EDIT-${timestamp}`;
    await guestCardA.locator('button[title="Edit Details"]').click();
    await page.waitForTimeout(1500);
    await page.fill('form input[placeholder="E.g., Pierre Gasly"]', renamedGuestNameA);
    await page.fill('form input[type="number"]', '4');
    await page.fill('form textarea', 'QA Modified Notes');
    await page.click('button:has-text("Apply Changes")');
    await page.waitForTimeout(3000);

    // Refresh and verify persistence
    await reloadAndNavigateTo(page, 'Waitlist');
    guestCardA = page.locator('div.group', { hasText: renamedGuestNameA });
    const cardTextPostEditRefresh = await guestCardA.innerText();
    console.log(`Card text after edit refresh: ${cardTextPostEditRefresh}`);
    if (cardTextPostEditRefresh.includes(renamedGuestNameA) && cardTextPostEditRefresh.includes('4') && cardTextPostEditRefresh.includes('QA Modified Notes')) {
      console.log('✅ Success: Waitlist guest edits persisted.');
      results.editWaitlistGuest = 'PASS';
    } else {
      results.editWaitlistGuest = 'FAIL';
    }


    // --- STEP 4: TEST CASE C: No Available Table Guard ---
    console.log('\n--- TEST CASE C: No Available Table Guard ---');
    // Fetch all available tables for store 0301 from database
    const { data: availableTbls, error: fetchErr } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('store_id', '0301')
      .eq('status', 'available');

    if (fetchErr) throw fetchErr;
    const availableIds = (availableTbls || []).map(t => t.id);
    console.log(`Temporarily marking ${availableIds.length} available tables as 'occupied' in DB...`);

    if (availableIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('restaurant_tables')
        .update({ status: 'occupied' })
        .in('id', availableIds);
      if (updateErr) throw updateErr;
    }

    // Reload Waitlist page to fetch updated table status
    await reloadAndNavigateTo(page, 'Waitlist');

    dialogMessage = '';
    console.log('Attempting to seat guest when no tables are available (should block)...');
    guestCardA = page.locator('div.group', { hasText: renamedGuestNameA });
    await guestCardA.locator('button:has-text("Seat Guest")').click();
    await page.waitForTimeout(2000);

    if (dialogMessage.includes('No tables available') || dialogMessage.includes('block') || dialogMessage.includes('open/clear')) {
      console.log('✅ Success: Seating blocked successfully due to zero available tables.');
      results.noAvailableTableGuard = 'PASS';
    } else {
      results.noAvailableTableGuard = 'FAIL';
      console.error('❌ Fail: Seating alert did not trigger or block seating.');
    }

    // Restore tables back to available
    console.log('Restoring tables back to available in DB...');
    if (availableIds.length > 0) {
      const { error: restoreErr } = await supabase
        .from('restaurant_tables')
        .update({ status: 'available' })
        .in('id', availableIds);
      if (restoreErr) throw restoreErr;
    }

    // Reload Waitlist page again to restore UI state
    await reloadAndNavigateTo(page, 'Waitlist');
    guestCardA = page.locator('div.group', { hasText: renamedGuestNameA });


    // --- STEP 5: TEST CASE D: Seat Waitlist Guest ---
    console.log('\n--- STEP 5: TEST CASE D: Seat Waitlist Guest ---');
    // Now navigate back to Waitlist and seat
    await page.click('button[title="Waitlist"], button:has-text("Waitlist")');
    await page.waitForTimeout(2500);

    console.log(`Seating ${renamedGuestNameA} to Table ${testTableNameA}...`);
    await guestCardA.locator('button:has-text("Seat Guest")').click();
    await page.waitForTimeout(1500);

    // Select Table A in dropdown and click Confirm Seating
    await page.selectOption('select:has(option:has-text("Choose Available Table"))', { label: `Table ${testTableNameA} (Cap 4)` });
    await page.waitForTimeout(500);
    dialogMessage = '';
    await page.click('button:has-text("Confirm Seating")');
    await page.waitForTimeout(3000);

    // Guest should be removed from active waiting list
    const guestCountInList = await page.locator('div.group', { hasText: renamedGuestNameA }).count();
    console.log(`Guest card count in active queue: ${guestCountInList}`);

    // Verify Table A occupied state on Floor Plan
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(3000);

    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(2000);

    const tblHeader = await page.locator('.fixed.inset-0 span.text-2xl').innerText();
    const tblStatus = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Table details after seating -> Header: ${tblHeader} | Status: ${tblStatus}`);

    // Verify details in Supabase
    const { data: dbTableData, error: dbTableErr } = await supabase
      .from('restaurant_tables')
      .select('status, guest_count, reservation_name, seated_at')
      .eq('number', testTableNameA)
      .single();

    if (dbTableErr) throw dbTableErr;
    console.log('Seated table DB check:', dbTableData);

    const isTableOccupied = dbTableData.status === 'occupied';
    const isGuestCountCorrect = dbTableData.guest_count === 4;
    const isReservationNameCorrect = dbTableData.reservation_name === renamedGuestNameA;
    const isSeatedAtSet = !!dbTableData.seated_at;

    if (tblStatus.toLowerCase() === 'occupied' && guestCountInList === 0 && isTableOccupied && isGuestCountCorrect && isReservationNameCorrect && isSeatedAtSet) {
      console.log('✅ Success: Seating waitlist guest updated table metadata.');
      results.seatWaitlistGuest = 'PASS';
    } else {
      console.error('❌ Fail: Table data verification failed:', {
        tblStatus,
        guestCountInList,
        isTableOccupied,
        isGuestCountCorrect,
        isReservationNameCorrect,
        isSeatedAtSet
      });
      results.seatWaitlistGuest = 'FAIL';
    }

    // Close details modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);

    // Refresh and verify persistence
    await reloadAndNavigateTo(page, 'Floor Plan');
    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(1500);
    const postRefreshStatus = await page.locator('.fixed.inset-0 span.px-2\\.5').innerText();
    console.log(`Status post-refresh: ${postRefreshStatus}`);
    if (postRefreshStatus.toLowerCase() !== 'occupied') {
      results.seatWaitlistGuest = 'FAIL';
      console.error('❌ Fail: Table occupied state did not persist after refresh.');
    }
    await page.locator('.fixed.inset-0 button').first().click(); // Close details modal
    await page.waitForTimeout(1000);


    // --- STEP 6: TEST CASE E: Dashboard Count Sync ---
    console.log('\n--- TEST CASE E: Dashboard Count Sync ---');
    await page.click('button[title="Dashboard"], button:has-text("Dashboard")');
    await page.waitForTimeout(3000);

    const newWaitCard = page.locator('div.rounded-2xl', { hasText: 'Waitlist' });
    const newWaitCountText = await newWaitCard.locator('.text-3xl').innerText();
    const newWaitCount = parseInt(newWaitCountText) || 0;
    const newOccupiedCard = page.locator('div.rounded-2xl', { hasText: 'Occupied' });
    const newOccupiedText = await newOccupiedCard.locator('.text-3xl').innerText();
    const newOccupiedCount = parseInt(newOccupiedText) || 0;
    console.log(`New Dashboard Counts -> Waitlist: ${newWaitCount} | Occupied: ${newOccupiedCount}`);

    // Waitlist count should decrease by 1, Occupied count should increase by 1
    // (Wait, since we created Guest A and seated it, waitlist count net change should be initial - 1, and occupied count should be initial + 1)
    if (newWaitCount === initialWaitCount && newOccupiedCount === initialOccupiedCount + 1) {
      console.log('✅ Success: Dashboard telemetry counts correctly synchronized.');
      results.dashboardCountSync = 'PASS';
    } else {
      console.log(`Delta analysis -> Waitlist expected: ${initialWaitCount - 1} actual: ${newWaitCount} | Occupied expected: ${initialOccupiedCount + 1} actual: ${newOccupiedCount}`);
      // Wait, is it initialWaitCount - 1? No! We ADDED a guest and then SEATED it.
      // So waitlist count went: initial -> initial + 1 (add) -> initial (seated).
      // So waitlist net count should equal initialWaitCount! Yes!
      // And occupied tables count went: initial -> initial + 1 (seated).
      // So occupied count should be initialOccupiedCount + 1!
      // This is exactly what was checked!
      if (newWaitCount === initialWaitCount && newOccupiedCount === initialOccupiedCount + 1) {
        results.dashboardCountSync = 'PASS';
      } else {
        results.dashboardCountSync = 'FAIL';
      }
    }


    // --- STEP 7: TEST CASE F: Cancel Waitlist Entry ---
    console.log('\n--- TEST CASE F: Cancel Waitlist Entry ---');
    await page.click('button[title="Waitlist"], button:has-text("Waitlist")');
    await page.waitForTimeout(2500);

    console.log(`Adding second waitlist guest ${testGuestNameB}...`);
    await page.click('button:has-text("Add Walk-In")');
    await page.waitForTimeout(1000);
    await page.fill('form input[placeholder="E.g., Pierre Gasly"]', testGuestNameB);
    await page.fill('form input[placeholder="+971 50 123 4567"]', testPhoneB);
    await page.fill('form input[type="number"]', '2');
    await page.click('form button[type="submit"]');
    await page.waitForTimeout(3000);

    let guestCardB = page.locator('div.group', { hasText: testGuestNameB });
    
    dialogMessage = '';
    console.log('Cancelling guest B...');
    // We set up page.on('dialog') to automatically accept confirm dialogs, so confirm is handled.
    await guestCardB.locator('button[title="Cancel"]').click();
    await page.waitForTimeout(3000);

    // Verify it disappeared from list
    const guestCardBCount = await page.locator('div.group', { hasText: testGuestNameB }).count();
    console.log(`Guest card B count in active queue: ${guestCardBCount}`);

    // Refresh and verify persistence
    await reloadAndNavigateTo(page, 'Waitlist');
    const guestCardBCountPostRefresh = await page.locator('div.group', { hasText: testGuestNameB }).count();
    console.log(`Guest card B count after refresh: ${guestCardBCountPostRefresh}`);

    if (guestCardBCount === 0 && guestCardBCountPostRefresh === 0) {
      console.log('✅ Success: Cancellation persisted and removed waitlist card.');
      results.cancelWaitlistEntry = 'PASS';
    } else {
      results.cancelWaitlistEntry = 'FAIL';
    }


    // --- STEP 8: CLEANUP ---
    console.log('\nCleaning up QA tables and waitlist entries used in test...');
    // Remove Table A
    await page.click('button[title="Floor Plan"], button:has-text("Floor Plan")');
    await page.waitForTimeout(2500);
    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Remove Table")');
    await page.waitForTimeout(2000);

  } catch (err: any) {
    console.error('❌ E2E run crashed:', err);
    try {
      await page.screenshot({ path: 'C:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-waitlist-crash.png' });
      console.log('Saved crash screenshot.');
    } catch (screenErr) {
      console.error('Failed to capture crash screenshot:', screenErr);
    }
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n================ PHASE C E2E RESULTS ================\n');
  console.table(results);
  console.log('\n======================================================\n');

  const failed = Object.values(results).some(val => val.startsWith('FAIL') || val === 'PENDING');
  if (failed) {
    console.error('❌ Some Phase C E2E checks failed!');
    process.exit(1);
  } else {
    console.log('✅ All Phase C E2E checks passed successfully!');
    process.exit(0);
  }
}

run();
