import { chromium } from '@playwright/test';

async function check() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  try {
    await page.goto('http://localhost:3000', { timeout: 10000 });
  } catch (err) {
    console.error('Failed to navigate:', err);
    await browser.close();
    process.exit(1);
  }

  console.log('Page loaded. URL:', page.url());
  
  // Wait a bit for React to render
  await page.waitForTimeout(3000);
  
  const title = await page.title();
  console.log('Page title:', title);

  const bodyText = await page.innerText('body');
  console.log('First 500 chars of body text:\n', bodyText.substring(0, 500));

  // Check if we are on the login screen or dashboard
  const hasEnterWorkspace = await page.locator('button:has-text("Enter Workspace")').count() > 0;
  console.log('Has "Enter Workspace" button:', hasEnterWorkspace);

  const hasLiveFloor = await page.locator('text=Live Floor').count() > 0;
  console.log('Has "Live Floor" link/text:', hasLiveFloor);

  // Take screenshot
  const screenshotPath = 'c:/Users/Mohammed_ITCPG/.gemini/antigravity-ide/brain/dd2fc85e-1c46-477d-aee5-f7603366f566/login_state.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

check().catch(console.error);
