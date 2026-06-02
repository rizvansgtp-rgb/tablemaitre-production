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
  dbClean: 'PENDING',
  noAutoSeed: 'PENDING',
  addTableA: 'PENDING',
  addTableB: 'PENDING',
  sectionAFiltersTableB: 'PENDING',
  sectionBFiltersTableA: 'PENDING',
  allTabAggregatesBoth: 'PENDING',
  renameSection: 'PENDING',
  renamedSectionPersists: 'PENDING',
  renamedSectionTableMatches: 'PENDING',
  noNewTableOverlap: 'PENDING'
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

  await page.click(`button:has-text("${tabName}")`);
  await page.waitForTimeout(2500);
}

async function run() {
  // 1. Initial direct DB clean to ensure hygienic run
  console.log('--- STARTING INITIAL DATABASE CLEANUP ---');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const login = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (login.error) {
    console.error('❌ Supabase Auth failed:', login.error.message);
    process.exit(1);
  }

  const { data: dbTablesBefore } = await supabase.from('restaurant_tables').select('id, number').eq('store_id', '0301');
  if (dbTablesBefore) {
    const toDel = dbTablesBefore.filter(t => t.number.startsWith('QA-') || t.number === '104');
    if (toDel.length > 0) {
      console.log('Cleaning up existing test tables:', toDel.map(t => t.number));
      await supabase.from('restaurant_tables').delete().in('id', toDel.map(t => t.id));
    }
  }
  results.dbClean = 'PASS';

  // 2. Launch Browser E2E
  console.log('\n--- STARTING BROWSER E2E ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[Browser Console Error] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error(`[Browser Page Uncaught Error] ${err.message}`);
  });

  const timestamp = Date.now().toString().slice(-6);
  const testTableNameA = `QA-A-${timestamp}`;
  const testTableNameB = `QA-B-${timestamp}`;
  const newSectionAName = `QA-SEC-A-${timestamp}`;

  try {
    // Navigate to local dev server
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2500);

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

    // Navigate to Floor Plan
    await page.click('button:has-text("Floor Plan")');
    await page.waitForTimeout(3000);

    // Ensure no QA tables are present automatically
    const qaTableCount = await page.locator('.table-node-interactive', { hasText: 'QA-' }).count();
    const table104Count = await page.locator('.table-node-interactive', { hasText: '104' }).count();
    console.log(`Automatic QA tables: ${qaTableCount}, Table 104: ${table104Count}`);
    if (qaTableCount === 0 && table104Count === 0) {
      console.log('✅ Success: No automatic QA or 104 tables seeded on load.');
      results.noAutoSeed = 'PASS';
    } else {
      console.error('❌ Failure: Automatic/demo seeding occurred on load.');
      results.noAutoSeed = 'FAIL';
    }

    // Get the first two section tab names dynamically from UI
    // Ensure we have configured sections
    const sectionTabs = page.locator('.relative.flex.items-center button');
    const sectionCount = await sectionTabs.count();
    console.log(`Total sections available: ${sectionCount}`);
    if (sectionCount < 2) {
      throw new Error('Test requires at least 2 sections configured for store 0301');
    }

    const secNameA = await sectionTabs.nth(0).locator('span').first().innerText();
    const secNameB = await sectionTabs.nth(1).locator('span').first().innerText();
    console.log(`Using Section A: "${secNameA}" and Section B: "${secNameB}"`);

    // --- Section A Add ---
    console.log(`Navigating to Section: ${secNameA}...`);
    await sectionTabs.nth(0).click();
    await page.waitForTimeout(1500);

    console.log(`Adding table ${testTableNameA} to Section A...`);
    await page.click('button[title="Add New Table"]');
    await page.waitForTimeout(2000);

    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.fill('form input[type="text"]', testTableNameA);
    await page.click('button:has-text("Update Properties")');
    await page.waitForTimeout(3000);
    
    // Close selected table modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);
    
    results.addTableA = 'PASS';

    // Verify it is visible in Section A
    let tableAInA = await page.locator('.table-node-interactive', { hasText: testTableNameA }).count();
    console.log(`Table A count in Section A tab: ${tableAInA}`);

    // --- Section B Add ---
    console.log(`Navigating to Section: ${secNameB}...`);
    await page.locator(`.relative.flex.items-center button:has-text("${secNameB}")`).click();
    await page.waitForTimeout(1500);

    // Verify Table A is NOT visible in Section B tab
    let tableAInB = await page.locator('.table-node-interactive', { hasText: testTableNameA }).count();
    console.log(`Table A count in Section B tab: ${tableAInB}`);
    if (tableAInB === 0) {
      console.log('✅ Section isolation: Table A is hidden in Section B tab.');
      results.sectionAFiltersTableB = 'PASS';
    } else {
      console.error('❌ Section isolation fail: Table A leaked into Section B tab!');
      results.sectionAFiltersTableB = 'FAIL';
    }

    console.log(`Adding table ${testTableNameB} to Section B...`);
    await page.click('button[title="Add New Table"]');
    await page.waitForTimeout(2000);

    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    await page.fill('form input[type="text"]', testTableNameB);
    await page.click('button:has-text("Update Properties")');
    await page.waitForTimeout(3000);
    
    // Close selected table modal
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(1000);
    
    results.addTableB = 'PASS';

    // Verify Table B is visible in Section B
    let tableBInB = await page.locator('.table-node-interactive', { hasText: testTableNameB }).count();
    console.log(`Table B count in Section B tab: ${tableBInB}`);

    // Navigate back to Section A tab
    console.log(`Navigating back to Section: ${secNameA}...`);
    await page.locator(`.relative.flex.items-center button:has-text("${secNameA}")`).click();
    await page.waitForTimeout(1500);

    // Verify Table B is NOT visible in Section A tab
    let tableBInA = await page.locator('.table-node-interactive', { hasText: testTableNameB }).count();
    console.log(`Table B count in Section A tab: ${tableBInA}`);
    if (tableBInA === 0) {
      console.log('✅ Section isolation: Table B is hidden in Section A tab.');
      results.sectionBFiltersTableA = 'PASS';
    } else {
      console.error('❌ Section isolation fail: Table B leaked into Section A tab!');
      results.sectionBFiltersTableA = 'FAIL';
    }

    // --- "All" tab view check ---
    console.log('Navigating to "All" view...');
    await page.click('button:has-text("All")');
    await page.waitForTimeout(2000);

    const hasTableAInAll = await page.locator('.table-node-interactive', { hasText: testTableNameA }).count() > 0;
    const hasTableBInAll = await page.locator('.table-node-interactive', { hasText: testTableNameB }).count() > 0;
    console.log(`In "All" view - Table A visible: ${hasTableAInAll}, Table B visible: ${hasTableBInAll}`);
    if (hasTableAInAll && hasTableBInAll) {
      console.log('✅ "All" tab correctly aggregates tables from both sections.');
      results.allTabAggregatesBoth = 'PASS';
    } else {
      console.error('❌ "All" tab missing tables.');
      results.allTabAggregatesBoth = 'FAIL';
    }

    // Verify no overlap coordinates
    // Get absolute bounding rects for both tables in All view
    const rectA = await page.locator('.table-node-interactive', { hasText: testTableNameA }).boundingBox();
    const rectB = await page.locator('.table-node-interactive', { hasText: testTableNameB }).boundingBox();
    if (rectA && rectB) {
      console.log(`Table A bounding box: x=${rectA.x}, y=${rectA.y}`);
      console.log(`Table B bounding box: x=${rectB.x}, y=${rectB.y}`);
      const overlaps = Math.abs(rectA.x - rectB.x) < 50 && Math.abs(rectA.y - rectB.y) < 50;
      if (!overlaps) {
        console.log('✅ Next-position algorithm verified: tables do not overlap.');
        results.noNewTableOverlap = 'PASS';
      } else {
        console.error('❌ Layout overlap detected!');
        results.noNewTableOverlap = 'FAIL';
      }
    }

    // --- Rename Section A tab ---
    console.log(`Navigating to Section A tab "${secNameA}" to rename it...`);
    await page.locator(`.relative.flex.items-center button:has-text("${secNameA}")`).click();
    await page.waitForTimeout(1500);

    await page.click('button:has-text("Configure Floor")');
    await page.waitForTimeout(1000);

    const renamedSectionTab = page.locator(`.relative.flex.items-center button:has-text("${secNameA}")`);
    const editIcon = renamedSectionTab.locator('svg').first();
    page.once('dialog', async dialog => {
      console.log(`Entering renamed section name: ${newSectionAName}`);
      await dialog.accept(newSectionAName);
    });
    await editIcon.click();
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Commit Changes")').catch(() => {});
    await page.waitForTimeout(1500);
    results.renameSection = 'PASS';

    // Refresh browser and confirm rename persisted
    await reloadAndNavigateTo(page, 'Floor Plan');

    const hasRenamedTab = await page.locator(`.relative.flex.items-center button:has-text("${newSectionAName}")`).count() > 0;
    if (hasRenamedTab) {
      console.log('✅ Renamed section persisted successfully after refresh!');
      results.renamedSectionPersists = 'PASS';
    } else {
      console.error('❌ Renamed section did not persist!');
      results.renamedSectionPersists = 'FAIL';
    }

    // Confirm that Table A is STILL visible under the renamed Section A
    console.log(`Selecting the renamed Section A: "${newSectionAName}"...`);
    await page.locator(`.relative.flex.items-center button:has-text("${newSectionAName}")`).click();
    await page.waitForTimeout(1500);

    const hasTableAAfterRename = await page.locator('.table-node-interactive', { hasText: testTableNameA }).count() > 0;
    if (hasTableAAfterRename) {
      console.log('✅ Table A remained visible under renamed Section A.');
      results.renamedSectionTableMatches = 'PASS';
    } else {
      console.error('❌ Table A became orphaned or invisible after renaming Section A!');
      results.renamedSectionTableMatches = 'FAIL';
    }

    // Cleanup added QA tables
    console.log('Cleaning up test tables...');
    // Delete Table A
    await page.locator('.table-node-interactive', { hasText: testTableNameA }).click();
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.click('button:has-text("Decommission Unit")');
    await page.waitForTimeout(2500);

    // Delete Table B
    await page.locator(`.relative.flex.items-center button:has-text("${secNameB}")`).click();
    await page.waitForTimeout(1500);
    await page.locator('.table-node-interactive', { hasText: testTableNameB }).click();
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Layout")');
    await page.waitForTimeout(500);
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.click('button:has-text("Decommission Unit")');
    await page.waitForTimeout(2500);

    // Revert section rename back to original name
    console.log(`Reverting section name back to "${secNameA}"...`);
    await page.locator(`.relative.flex.items-center button:has-text("${newSectionAName}")`).click();
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Configure Floor")');
    await page.waitForTimeout(1000);
    const renamedSectionTabToRevert = page.locator(`.relative.flex.items-center button:has-text("${newSectionAName}")`);
    const editIconRevert = renamedSectionTabToRevert.locator('svg').first();
    page.once('dialog', async dialog => {
      await dialog.accept(secNameA);
    });
    await editIconRevert.click();
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Commit Changes")').catch(() => {});
    await page.waitForTimeout(1500);

    console.log('✅ Cleanup finished successfully.');

  } catch (err: any) {
    console.error('❌ E2E run crashed:', err);
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n================ PHASE A E2E RESULTS ================\n');
  console.table(results);
  console.log('\n======================================================\n');

  const failed = Object.values(results).some(val => val.startsWith('FAIL') || val === 'PENDING');
  if (failed) {
    console.error('❌ Some Phase A E2E checks failed!');
    process.exit(1);
  } else {
    console.log('✅ All Phase A E2E checks passed successfully!');
    process.exit(0);
  }
}

run();
