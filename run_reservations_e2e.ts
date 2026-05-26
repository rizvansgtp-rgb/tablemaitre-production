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
  directUpdateConfirmed: 'PENDING',
  directUpdateSeated: 'PENDING',
  directUpdateCancelled: 'PENDING',
  directDelete: 'PENDING',
  e2eAddReservation: 'PENDING',
  e2eRenameReservation: 'PENDING',
  e2eStatusConfirmed: 'PENDING',
  e2eStatusSeated: 'PENDING',
  e2eStatusCancelled: 'PENDING'
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
  console.log('Checking select from reservations where store_id = 0301...');
  const { data: selectData, error: selectError } = await supabase
    .from('reservations')
    .select('*')
    .eq('store_id', '0301');
  
  if (selectError) {
    console.error('❌ Select failed:', selectError.message);
    results.directSelect = `FAIL: ${selectError.message}`;
  } else {
    console.log(`✅ Select successful. Found ${selectData.length} reservations.`);
    results.directSelect = 'PASS';
  }

  // Create unique suffix
  const timestamp = Date.now().toString();
  const testGuestName = `QA Direct Res ${timestamp.slice(-6)}`;
  const futureDateTime = new Date(Date.now() + 86400000 * 2).toISOString(); // 2 days in future
  let resId = '';

  // 2. Insert
  console.log(`Inserting test reservation: ${testGuestName}...`);
  const { data: insertData, error: insertError } = await supabase
    .from('reservations')
    .insert([
      {
        store_id: '0301',
        guest_name: testGuestName,
        phone: '+971500000001',
        party_size: 3,
        datetime: futureDateTime,
        status: 'booked',
        notes: 'manual'
      }
    ])
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    results.directInsert = `FAIL: ${insertError.message}`;
    return;
  } else {
    resId = insertData.id;
    console.log(`✅ Insert successful. Reservation ID: ${resId}`);
    results.directInsert = 'PASS';
  }

  // 3. Update reservation status to confirmed
  console.log('Updating status to confirmed...');
  const { error: updateConfError } = await supabase
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', resId);

  if (updateConfError) {
    console.error('❌ Update confirmed failed:', updateConfError.message);
    results.directUpdateConfirmed = `FAIL: ${updateConfError.message}`;
  } else {
    console.log('✅ Update confirmed successful.');
    results.directUpdateConfirmed = 'PASS';
  }

  // 4. Update reservation status to seated
  console.log('Updating status to seated...');
  const { error: updateSeatedError } = await supabase
    .from('reservations')
    .update({ status: 'seated' })
    .eq('id', resId);

  if (updateSeatedError) {
    console.error('❌ Update seated failed:', updateSeatedError.message);
    results.directUpdateSeated = `FAIL: ${updateSeatedError.message}`;
  } else {
    console.log('✅ Update seated successful.');
    results.directUpdateSeated = 'PASS';
  }

  // 5. Update reservation status to cancelled
  console.log('Updating status to cancelled...');
  const { error: updateCancelError } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', resId);

  if (updateCancelError) {
    console.error('❌ Update cancelled failed:', updateCancelError.message);
    results.directUpdateCancelled = `FAIL: ${updateCancelError.message}`;
  } else {
    console.log('✅ Update cancelled successful.');
    results.directUpdateCancelled = 'PASS';
  }

  // 6. Delete reservation
  console.log('Deleting test reservation...');
  const { error: deleteError } = await supabase
    .from('reservations')
    .delete()
    .eq('id', resId);

  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    results.directDelete = `FAIL: ${deleteError.message}`;
  } else {
    console.log('✅ Delete successful.');
    results.directDelete = 'PASS';
  }
}

async function reloadAndNavigateToReservations(page: any) {
  console.log('Refreshing browser and navigating back to Reservations...');
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
  
  await page.click('button:has-text("Reservations")');
  await page.waitForTimeout(2500);
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
    if (url.includes('/rest/v1/reservations')) {
      const status = response.status();
      const method = response.request().method();
      try {
        const text = await response.text();
        console.log(`[Supabase API Response] ${method} reservations -> Status: ${status}`);
        console.log(`Payload response: ${text.substring(0, 300)}`);
      } catch (e) {}
    }
  });

  const timestamp = Date.now().toString();
  const testGuestName = `QA-RES-${timestamp.slice(-6)}`;
  const renamedGuestName = `QA-REN-${timestamp.slice(-6)}`;

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

    // 3. Open Reservations page
    console.log('Opening Reservations page...');
    await page.click('button:has-text("Reservations")');
    await page.waitForTimeout(2500);

    // 4. Create a unique test reservation
    console.log(`Creating reservation for: ${testGuestName}...`);
    await page.click('button:has-text("Create Booking")');
    await page.waitForTimeout(1000);

    await page.fill('form input[placeholder="Charles Leclerc"]', testGuestName);
    await page.fill('form input[placeholder="+971 50 123 4567"]', '+971500000003');
    await page.fill('form label:has-text("Adult Count") + input, form input[type="number"]:first-of-type', '2');
    await page.fill('form label:has-text("Child Count") + input, form input[type="number"]:last-of-type', '1');
    await page.fill('form textarea', 'manual');
    
    console.log('Committing booking...');
    await page.click('button:has-text("Commit Booking")');
    await page.waitForTimeout(3000);

    // 5. Refresh browser
    await reloadAndNavigateToReservations(page);

    // 6. Confirm reservation still exists
    let resRow = page.locator('div.group', { hasText: testGuestName });
    if (await resRow.count() > 0) {
      console.log('✅ Reservation persisted after refresh!');
      results.e2eAddReservation = 'PASS';
    } else {
      console.error('❌ Reservation NOT found after refresh!');
      results.e2eAddReservation = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-res-add.png' });
      await browser.close();
      return;
    }

    // 7. Edit reservation details
    console.log(`Editing reservation name to: ${renamedGuestName}...`);
    await resRow.locator('button[title="Edit/Update Attributes"]').click();
    await page.waitForTimeout(1000);
    await page.fill('form input[placeholder="Charles Leclerc"]', renamedGuestName);
    await page.click('button:has-text("Apply Modifications")');
    await page.waitForTimeout(3000);

    // 8. Refresh browser
    await reloadAndNavigateToReservations(page);

    // 9. Confirm edit persists
    resRow = page.locator('div.group', { hasText: renamedGuestName });
    if (await resRow.count() > 0) {
      console.log('✅ Renamed reservation persisted after refresh!');
      results.e2eRenameReservation = 'PASS';
    } else {
      console.error('❌ Renamed reservation NOT found after refresh!');
      results.e2eRenameReservation = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-res-rename.png' });
      await browser.close();
      return;
    }

    // 10. Change status to confirmed
    console.log('Changing status to confirmed...');
    await resRow.locator('button[title="Confirm"]').click();
    await page.waitForTimeout(3000);

    // 11. Refresh browser
    await reloadAndNavigateToReservations(page);

    // 12. Confirm status persists
    resRow = page.locator('div.group', { hasText: renamedGuestName });
    let statusText = await resRow.locator('span.rounded').innerText().catch(() => '');
    console.log('Current status:', statusText);
    if (statusText.toLowerCase() === 'confirmed') {
      console.log('✅ Status confirmed persisted after refresh!');
      results.e2eStatusConfirmed = 'PASS';
    } else {
      console.error('❌ Status confirmed NOT persisted!');
      results.e2eStatusConfirmed = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-res-confirmed.png' });
      await browser.close();
      return;
    }

    // 13. Seat reservation
    console.log('Changing status to seated...');
    await resRow.locator('button[title="Seat"]').click();
    await page.waitForTimeout(3000);

    // 14. Refresh browser
    await reloadAndNavigateToReservations(page);

    // 15. Confirm seated status persists
    resRow = page.locator('div.group', { hasText: renamedGuestName });
    statusText = await resRow.locator('span.rounded').innerText().catch(() => '');
    console.log('Current status:', statusText);
    if (statusText.toLowerCase() === 'seated') {
      console.log('✅ Status seated persisted after refresh!');
      results.e2eStatusSeated = 'PASS';
    } else {
      console.error('❌ Status seated NOT persisted!');
      results.e2eStatusSeated = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-res-seated.png' });
      await browser.close();
      return;
    }

    // 16. Cancel reservation
    console.log('Changing status to cancelled...');
    await resRow.locator('button[title="Cancel"]').click();
    await page.waitForTimeout(3000);

    // 17. Refresh browser
    await reloadAndNavigateToReservations(page);

    // 18. Confirm cancelled status persists
    // Cancelled reservations are hidden or shown depending on status Filter.
    // By default, filtered list matches matchesStatus = statusFilter === 'All' || r.status === statusFilter.toLowerCase();
    // Since statusFilter starts as 'All', it should be visible!
    resRow = page.locator('div.group', { hasText: renamedGuestName });
    statusText = await resRow.locator('span.rounded').innerText().catch(() => '');
    console.log('Current status:', statusText);
    if (statusText.toLowerCase() === 'cancelled') {
      console.log('✅ Status cancelled persisted after refresh!');
      results.e2eStatusCancelled = 'PASS';
    } else {
      console.error('❌ Status cancelled NOT persisted!');
      results.e2eStatusCancelled = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-res-cancelled.png' });
    }

  } catch (err: any) {
    console.error('❌ Browser E2E test crashed:', err);
    try {
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-res-crash.png' });
      console.log('Screenshot of crash saved to brain/screenshot-res-crash.png');
    } catch (scre) {
      console.error('Failed to take screenshot:', scre);
    }
  } finally {
    // Delete E2E test reservation from Supabase for database hygiene
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    const { data: selectToClean } = await supabase.from('reservations').select('id').or(`guest_name.eq."${testGuestName}",guest_name.eq."${renamedGuestName}"`);
    if (selectToClean && selectToClean.length > 0) {
      const ids = selectToClean.map(r => r.id);
      console.log('Cleaning up browser E2E test reservations:', ids);
      await supabase.from('reservations').delete().in('id', ids);
    }
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
