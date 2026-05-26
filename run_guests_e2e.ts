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
  directUpdateName: 'PENDING',
  directUpdateNationality: 'PENDING',
  directUpdateAttributes: 'PENDING',
  directDelete: 'PENDING',
  e2eAddGuest: 'PENDING',
  e2eRenameGuest: 'PENDING',
  e2eMarkVip: 'PENDING',
  e2eSearchByName: 'PENDING',
  e2eSearchByPhone: 'PENDING'
};

async function runDirectChecks() {
  console.log('\n--- STARTING DIRECT GUESTS SUPABASE API CHECKS ---');
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
  console.log('Checking select from guests...');
  const { data: selectData, error: selectError } = await supabase
    .from('guests')
    .select('*');
  
  if (selectError) {
    console.error('❌ Select failed:', selectError.message);
    results.directSelect = `FAIL: ${selectError.message}`;
  } else {
    console.log(`✅ Select successful. Found ${selectData.length} guests.`);
    results.directSelect = 'PASS';
  }

  // Create unique suffix
  const timestamp = Date.now().toString();
  const testGuestName = `QA Direct Guest ${timestamp.slice(-6)}`;
  const testPhone = `+97150${timestamp.slice(-6)}`;
  const testEmail = `qa-direct-guest-${timestamp.slice(-6)}@example.com`;
  let guestId = '';

  // 2. Insert
  console.log(`Inserting test guest: ${testGuestName}...`);
  const { data: insertData, error: insertError } = await supabase
    .from('guests')
    .insert([
      {
        name: testGuestName,
        phone: testPhone,
        email: testEmail,
        nationality: 'SG',
        is_vip: false,
        preferences: ['Still Water'],
        allergies: ['None'],
        notes: 'Direct test notes'
      }
    ])
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    results.directInsert = `FAIL: ${insertError.message}`;
    return;
  } else {
    guestId = insertData.id;
    console.log(`✅ Insert successful. Guest ID: ${guestId}`);
    results.directInsert = 'PASS';
  }

  // 3. Update guest name
  const renamedGuestName = `QA Direct Renamed ${timestamp.slice(-6)}`;
  console.log(`Updating guest name to: ${renamedGuestName}...`);
  const { error: updateNameError } = await supabase
    .from('guests')
    .update({ name: renamedGuestName })
    .eq('id', guestId);

  if (updateNameError) {
    console.error('❌ Update name failed:', updateNameError.message);
    results.directUpdateName = `FAIL: ${updateNameError.message}`;
  } else {
    console.log('✅ Update name successful.');
    results.directUpdateName = 'PASS';
  }

  // 4. Update nationality
  console.log('Updating nationality to: US...');
  const { error: updateNatError } = await supabase
    .from('guests')
    .update({ nationality: 'US' })
    .eq('id', guestId);

  if (updateNatError) {
    console.error('❌ Update nationality failed:', updateNatError.message);
    results.directUpdateNationality = `FAIL: ${updateNatError.message}`;
  } else {
    console.log('✅ Update nationality successful.');
    results.directUpdateNationality = 'PASS';
  }

  // 5. Update attributes (notes/preferences/allergies)
  console.log('Updating preferences, allergies, and notes...');
  const { error: updateAttrError } = await supabase
    .from('guests')
    .update({
      preferences: ['Sparkling Water', 'Window Seat'],
      allergies: ['Peanuts'],
      notes: 'Direct test updated notes'
    })
    .eq('id', guestId);

  if (updateAttrError) {
    console.error('❌ Update attributes failed:', updateAttrError.message);
    results.directUpdateAttributes = `FAIL: ${updateAttrError.message}`;
  } else {
    console.log('✅ Update attributes successful.');
    results.directUpdateAttributes = 'PASS';
  }

  // 6. Delete test guest
  console.log('Deleting test guest...');
  const { error: deleteError } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId);

  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    results.directDelete = `FAIL: ${deleteError.message}`;
  } else {
    console.log('✅ Delete successful.');
    results.directDelete = 'PASS';
  }
}

async function reloadAndNavigateToGuests(page: any) {
  console.log('Refreshing browser and navigating back to Guests...');
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
  
  await page.click('button:has-text("Guests")');
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
    if (url.includes('/rest/v1/guests')) {
      const status = response.status();
      const method = response.request().method();
      try {
        const text = await response.text();
        console.log(`[Supabase API Response] ${method} guests -> Status: ${status}`);
        console.log(`Payload response: ${text.substring(0, 300)}`);
      } catch (e) {}
    }
  });

  const timestamp = Date.now().toString();
  const testGuestName = `QA-GUEST-${timestamp.slice(-6)}`;
  const testPhone = `+97150${timestamp.slice(-6)}`;
  const testEmail = `qa-guest-${timestamp.slice(-6)}@example.com`;
  const renamedGuestName = `QA-GUEST-VIP-${timestamp.slice(-6)}`;

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

    // 3. Open Guests/CRM page
    console.log('Opening Guests/CRM page...');
    await page.click('button:has-text("Guests")');
    await page.waitForTimeout(2500);

    // 4. Add a unique test guest
    console.log(`Creating guest: ${testGuestName}...`);
    await page.click('button:has-text("Register Profile")');
    await page.waitForTimeout(1000);

    await page.fill('form input[placeholder="E.g., Julianne Moore"]', testGuestName);
    await page.fill('form input[placeholder="e.g., j.moore@client.com"]', testEmail);
    await page.fill('form input[placeholder="e.g., +1 212 555 0198"]', testPhone);
    await page.fill('form input[placeholder="E.g., Window Seat, Still Water, Vegan Option"]', 'Window Seat, Still Water');
    await page.fill('form textarea', 'QA test notes');

    console.log('Committing Identity Profile...');
    await page.click('button:has-text("Commit Identity Profile")');
    await page.waitForTimeout(3000);

    // 5. Refresh browser
    await reloadAndNavigateToGuests(page);

    // 6. Confirm guest still exists
    let guestCard = page.locator('div.group', { hasText: testGuestName }).first();
    if (await guestCard.count() > 0) {
      console.log('✅ Guest persisted after refresh!');
      results.e2eAddGuest = 'PASS';
    } else {
      console.error('❌ Guest NOT found after refresh!');
      results.e2eAddGuest = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-guest-add.png' });
      await browser.close();
      return;
    }

    // 7. Edit guest details
    console.log('Selecting guest to edit details...');
    await guestCard.dispatchEvent('click');
    await page.waitForTimeout(1500);

    console.log('Clicking Update Profile...');
    await page.click('button:has-text("Update Profile")');
    await page.waitForTimeout(1000);

    console.log(`Renaming guest to: ${renamedGuestName} and checking VIP checkbox...`);
    await page.fill('form input[placeholder="E.g., Julianne Moore"]', renamedGuestName);
    await page.click('label[for="isVipCheck"]');
    await page.click('button:has-text("Update Guest Profile")');
    await page.waitForTimeout(3000);

    // 8. Refresh browser
    await reloadAndNavigateToGuests(page);

    // 9. Confirm edits and VIP persist
    guestCard = page.locator('div.group', { hasText: renamedGuestName }).first();
    await guestCard.waitFor({ state: 'visible', timeout: 5000 });
    if (await guestCard.count() > 0) {
      console.log('✅ Renamed guest persisted after refresh!');
      results.e2eRenameGuest = 'PASS';
      
      // Select updated guest card to verify details panel
      await guestCard.click();
      const detailsH3 = page.locator('.sticky h3:has-text("' + renamedGuestName + '")');
      await detailsH3.waitFor({ state: 'visible', timeout: 5000 });
      
      const detailsText = await page.locator('.sticky h3:has-text("' + renamedGuestName + '") + p').innerText();
      console.log('Details text:', detailsText);
      if (detailsText.toLowerCase().includes('vip protected')) {
        console.log('✅ VIP status persisted after refresh!');
        results.e2eMarkVip = 'PASS';
      } else {
        console.error('❌ VIP status NOT persisted in details panel!');
        results.e2eMarkVip = 'FAIL';
        await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-guest-vip.png' });
        await browser.close();
        return;
      }
    } else {
      console.error('❌ Renamed guest NOT found after refresh!');
      results.e2eRenameGuest = 'FAIL';
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-fail-guest-rename.png' });
      await browser.close();
      return;
    }

    // 10. Search by name
    console.log(`Searching guest list by name: ${renamedGuestName}...`);
    await page.fill('input[placeholder="Query database for identity (Name, Email, Phone)..."]', renamedGuestName);
    await page.waitForTimeout(1500);
    let searchCount = await page.locator('div.group', { hasText: renamedGuestName }).count();
    if (searchCount === 1) {
      console.log('✅ Search by name matches exactly 1 guest.');
      results.e2eSearchByName = 'PASS';
    } else {
      console.error(`❌ Search by name matches: ${searchCount} guests (expected 1)!`);
      results.e2eSearchByName = 'FAIL';
    }

    // 11. Search by phone
    console.log(`Searching guest list by phone: ${testPhone}...`);
    await page.fill('input[placeholder="Query database for identity (Name, Email, Phone)..."]', testPhone);
    await page.waitForTimeout(1500);
    searchCount = await page.locator('div.group', { hasText: renamedGuestName }).count();
    if (searchCount === 1) {
      console.log('✅ Search by phone matches exactly 1 guest.');
      results.e2eSearchByPhone = 'PASS';
    } else {
      console.error(`❌ Search by phone matches: ${searchCount} guests (expected 1)!`);
      results.e2eSearchByPhone = 'FAIL';
    }

  } catch (err: any) {
    console.error('❌ Browser E2E test crashed:', err);
    try {
      await page.screenshot({ path: 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/screenshot-guest-crash.png' });
      console.log('Screenshot of crash saved to brain/screenshot-guest-crash.png');
    } catch (scre) {
      console.error('Failed to take screenshot:', scre);
    }
  } finally {
    // Delete E2E test guest from Supabase for database hygiene
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    const { data: selectToClean } = await supabase.from('guests').select('id').or(`name.eq."${testGuestName}",name.eq."${renamedGuestName}"`);
    if (selectToClean && selectToClean.length > 0) {
      const ids = selectToClean.map(g => g.id);
      console.log('Cleaning up browser E2E test guests:', ids);
      await supabase.from('guests').delete().in('id', ids);
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
