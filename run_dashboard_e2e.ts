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
  dashboardInitialCounts: 'PENDING',
  occupiedUpdate: 'PENDING',
  availableUpdate: 'PENDING',
  sectionRename: 'PENDING',
  colorClassVerification: 'PENDING',
  colorPersistAfterRefresh: 'PENDING',
  storeSwitching: 'PENDING'
};

async function clickTable(tableLocator: any) {
  const groupDiv = tableLocator.locator('.group').first();
  await groupDiv.dispatchEvent('click');
}

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

  await page.click(`button:has-text("${tabName}")`);
  await page.waitForTimeout(2500);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[Browser Page Uncaught Error] ${err.message}`);
  });

  const timestamp = Date.now().toString().slice(-6);
  const testTableName = `QA-DASH-${timestamp}`;

  try {
    // 1. Open TableMaître
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // 2. Login
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

    // 3. Initial Dashboard counts
    console.log('Verifying initial dashboard counts...');
    await page.click('button:has-text("Dashboard")');
    await page.waitForTimeout(3000);

    // Read initial values using robust locators
    const availableCardBefore = page.locator('div.rounded-2xl', { hasText: 'Available' });
    const availableValBefore = parseInt(await availableCardBefore.locator('.text-3xl').innerText()) || 0;

    const occupiedCardBefore = page.locator('div.rounded-2xl', { hasText: 'Occupied' });
    const occupiedValBefore = parseInt(await occupiedCardBefore.locator('.text-3xl').innerText()) || 0;

    console.log(`Initial Dashboard - Available: ${availableValBefore}, Occupied: ${occupiedValBefore}`);
    results.dashboardInitialCounts = 'PASS';

    // 4. Navigate to Floor Plan and Add Table
    console.log('Navigating to Floor Plan...');
    await page.click('button:has-text("Floor Plan")');
    await page.waitForTimeout(2000);

    console.log(`Adding table: ${testTableName}...`);
    await page.click('button[title="Add New Table"]');
    await page.waitForTimeout(2500);

    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.fill('form input[type="text"]', testTableName);
    await page.click('button:has-text("Update Properties")');
    await page.waitForTimeout(3000);

    // Change status to occupied
    console.log('Setting table status to Occupied...');
    let table = page.locator(`.table-node-interactive`, { hasText: testTableName });
    await clickTable(table);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Seat Party")');
    await page.waitForTimeout(3000);

    // 5. Verify counts updated
    console.log('Navigating to Dashboard to check counts after status change to Occupied...');
    await reloadAndNavigateTo(page, 'Dashboard');

    const availableCardAfterOccupied = page.locator('div.rounded-2xl', { hasText: 'Available' });
    const availableValAfterOccupied = parseInt(await availableCardAfterOccupied.locator('.text-3xl').innerText()) || 0;

    const occupiedCardAfterOccupied = page.locator('div.rounded-2xl', { hasText: 'Occupied' });
    const occupiedValAfterOccupied = parseInt(await occupiedCardAfterOccupied.locator('.text-3xl').innerText()) || 0;

    console.log(`After Occupied - Available: ${availableValAfterOccupied}, Occupied: ${occupiedValAfterOccupied}`);

    if (occupiedValAfterOccupied === occupiedValBefore + 1) {
      console.log('✅ Dashboard occupied count updated correctly!');
      results.occupiedUpdate = 'PASS';
    } else {
      console.error(`❌ Dashboard occupied count mismatch. Expected ${occupiedValBefore + 1}, got ${occupiedValAfterOccupied}`);
      results.occupiedUpdate = 'FAIL';
    }

    // 6. Change table to available
    console.log('Navigating to Floor Plan to set table to Available...');
    await reloadAndNavigateTo(page, 'Floor Plan');

    table = page.locator(`.table-node-interactive`, { hasText: testTableName });
    await clickTable(table);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Set Open")');
    await page.waitForTimeout(3000);

    // 7. Verify counts updated back
    console.log('Checking counts after setting to Available...');
    await reloadAndNavigateTo(page, 'Dashboard');

    const availableCardAfterAvailable = page.locator('div.rounded-2xl', { hasText: 'Available' });
    const availableValAfterAvailable = parseInt(await availableCardAfterAvailable.locator('.text-3xl').innerText()) || 0;

    const occupiedCardAfterAvailable = page.locator('div.rounded-2xl', { hasText: 'Occupied' });
    const occupiedValAfterAvailable = parseInt(await occupiedCardAfterAvailable.locator('.text-3xl').innerText()) || 0;

    console.log(`After Available - Available: ${availableValAfterAvailable}, Occupied: ${occupiedValAfterAvailable}`);

    // Since we added a new table, setting it to available increases available by 1, and occupied returns to initial
    if (occupiedValAfterAvailable === occupiedValBefore && availableValAfterAvailable === availableValBefore + 1) {
      console.log('✅ Dashboard available count updated correctly!');
      results.availableUpdate = 'PASS';
    } else {
      console.error(`❌ Dashboard counts mismatch. Expected Available: ${availableValBefore + 1}, Occupied: ${occupiedValBefore}; got Available: ${availableValAfterAvailable}, Occupied: ${occupiedValAfterAvailable}`);
      results.availableUpdate = 'FAIL';
    }

    // 8. Rename section
    console.log('Navigating to Floor Plan to rename section...');
    await reloadAndNavigateTo(page, 'Floor Plan');

    // Go to Configure Floor mode
    await page.click('button:has-text("Configure Floor")');
    await page.waitForTimeout(1500);

    // Target the first section tab button dynamically using its CSS classes
    const firstSectionTab = page.locator('.relative.flex.items-center button').first();
    const oldSectionName = await firstSectionTab.locator('span').first().innerText();
    console.log(`Renaming section "${oldSectionName}"...`);

    const editIcon = firstSectionTab.locator('svg').first();
    const newSectionName = `QA-SEC-${timestamp}`;
    page.once('dialog', async dialog => {
      console.log(`Rename Dialog prompted. Entering: ${newSectionName}`);
      await dialog.accept(newSectionName);
    });

    await editIcon.click();
    await page.waitForTimeout(3000);

    // Click Save / Commit changes
    await page.click('button:has-text("Commit Changes")').catch(() => {});
    await page.waitForTimeout(1500);

    // Refresh and navigate back
    await reloadAndNavigateTo(page, 'Floor Plan');

    // Verify renamed section exists
    const hasRenamedSection = await page.locator(`.relative.flex.items-center button:has-text("${newSectionName}")`).count() > 0;
    if (hasRenamedSection) {
      console.log('✅ Section rename persisted after refresh!');
      results.sectionRename = 'PASS';
    } else {
      console.error('❌ Section rename did not persist!');
      results.sectionRename = 'FAIL';
    }

    // 9. Change table to reserved/billing/cleaning and verify colors
    console.log('Testing status colors for reserved, billing, cleaning...');
    
    // Let's test reserved first
    table = page.locator(`.table-node-interactive`, { hasText: testTableName });
    await clickTable(table);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Book Spot")'); // Sets to reserved
    await page.waitForTimeout(3000);

    // Check stroke color
    let strokeClass = await table.locator('.table-body-shape').getAttribute('class');
    console.log('Reserved stroke class:', strokeClass);
    if (strokeClass?.includes('stroke-amber-500')) {
      console.log('✅ Reserved status has correct amber stroke color!');
    } else {
      console.error('❌ Reserved status missing stroke-amber-500 class!');
      results.colorClassVerification = 'FAIL';
    }

    // Test billing
    await clickTable(table);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Process Bill")'); // Sets to billing
    await page.waitForTimeout(3000);
    strokeClass = await table.locator('.table-body-shape').getAttribute('class');
    console.log('Billing stroke class:', strokeClass);
    if (strokeClass?.includes('stroke-violet-500')) {
      console.log('✅ Billing status has correct violet stroke color!');
    } else {
      console.error('❌ Billing status missing stroke-violet-500 class!');
      results.colorClassVerification = 'FAIL';
    }

    // Test cleaning
    await clickTable(table);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Maintain")'); // Sets to cleaning
    await page.waitForTimeout(3000);
    strokeClass = await table.locator('.table-body-shape').getAttribute('class');
    console.log('Cleaning stroke class:', strokeClass);
    if (strokeClass?.includes('stroke-cyan-500')) {
      console.log('✅ Cleaning status has correct cyan stroke color!');
      if (results.colorClassVerification !== 'FAIL') {
        results.colorClassVerification = 'PASS';
      }
    } else {
      console.error('❌ Cleaning status missing stroke-cyan-500 class!');
      results.colorClassVerification = 'FAIL';
    }

    // 10. Refresh and confirm status/color remains correct
    await reloadAndNavigateTo(page, 'Floor Plan');
    table = page.locator(`.table-node-interactive`, { hasText: testTableName });
    strokeClass = await table.locator('.table-body-shape').getAttribute('class');
    console.log('After refresh, stroke class:', strokeClass);
    if (strokeClass?.includes('stroke-cyan-500')) {
      console.log('✅ Cleaning status persisted correctly after refresh!');
      results.colorPersistAfterRefresh = 'PASS';
    } else {
      console.error('❌ Cleaning status NOT persisted correctly after refresh!');
      results.colorPersistAfterRefresh = 'FAIL';
    }

    // 11. Store switching works
    console.log('Testing store switching...');
    const headerSelect = page.locator('#active-store-select');
    await headerSelect.waitFor({ state: 'visible', timeout: 5000 });
    
    // Switch active store to 0302 via header dropdown
    console.log('Switching active store to 0302 in header selector...');
    await headerSelect.selectOption('0302');
    await page.waitForTimeout(4500); // Wait for profile refresh and reload

    const switchedStore = await headerSelect.inputValue();
    console.log(`Active store after switching: ${switchedStore}`);
    if (switchedStore === '0302') {
      console.log('✅ Store switching successful!');
      results.storeSwitching = 'PASS';
    } else {
      console.error(`Failed to switch store in header dropdown to 0302. Got: ${switchedStore}`);
      results.storeSwitching = 'FAIL';
    }

    // Switch back to 0301 to cleanup
    console.log('Switching back to 0301...');
    await headerSelect.selectOption('0301');
    await page.waitForTimeout(4500);

    // Clean up test table
    console.log('Cleaning up test table...');
    await reloadAndNavigateTo(page, 'Floor Plan');
    table = page.locator(`.table-node-interactive`, { hasText: testTableName });
    await clickTable(table);
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);

    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.click('button:has-text("Decommission Unit")');
    await page.waitForTimeout(3000);

    // Revert section rename
    console.log(`Reverting section name back to "${oldSectionName}"...`);
    await page.click('button:has-text("Configure Floor")');
    await page.waitForTimeout(1500);
    const renamedSectionTab = page.locator(`.relative.flex.items-center button:has-text("${newSectionName}")`);
    const editIconRenamed = renamedSectionTab.locator('svg').first();
    page.once('dialog', async dialog => {
      await dialog.accept(oldSectionName);
    });
    await editIconRenamed.click();
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Commit Changes")').catch(() => {});
    await page.waitForTimeout(1000);

    console.log('✅ Cleanup finished.');

  } catch (err: any) {
    console.error('❌ E2E Test execution failed:', err);
  } finally {
    await browser.close();
  }

  // Print results table
  console.log('\n================ E2E RESULTS ================\n');
  console.table(results);
  console.log('\n=============================================\n');

  const failed = Object.values(results).some(val => val.startsWith('FAIL') || val === 'PENDING');
  if (failed) {
    console.error('❌ Some E2E tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All E2E tests passed successfully!');
    process.exit(0);
  }
}

run();
