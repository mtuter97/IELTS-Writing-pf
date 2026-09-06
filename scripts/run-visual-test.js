import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\elsae\\.gemini\\antigravity-ide\\brain\\3190900d-2467-4f86-8595-2efda3bde01c';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runVisualTest() {
  console.log('🚀 Starting Complete Visual Testing Suite...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  // =========================================================================
  // PART 1: IELTS Writing Feedback Tool (localhost:3000)
  // =========================================================================
  console.log('\n--- Part 1: IELTS Writing Tool (localhost:3000) ---');

  // 1. Home Page & IDP Verification Banner
  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_01_ielts_home_idp_banner.png') });
  console.log('📸 Captured visual_01_ielts_home_idp_banner.png');

  // 2. Open IDP Official Criteria Modal
  console.log('2. Opening IDP Criteria Modal...');
  const idpBtn = await page.$('#open-idp-rubrics-modal-btn');
  if (idpBtn) {
    await idpBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_02_idp_criteria_matrix_task2.png') });
    console.log('📸 Captured visual_02_idp_criteria_matrix_task2.png');

    // Switch to Task 1 tab inside modal
    const t1Btn = await page.$('.idp-task-btn[data-task="task1"]');
    if (t1Btn) {
      await t1Btn.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_03_idp_criteria_matrix_task1.png') });
      console.log('📸 Captured visual_03_idp_criteria_matrix_task1.png');
    }

    // Close modal
    const closeBtn = await page.$('#close-idp-criteria-modal');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. Editor Live Warnings for Task 1 vs Task 2
  console.log('3. Checking Editor Live Warnings...');
  // Click Task 1 Academic
  const t1AcademicBtn = await page.$('.type-btn[data-type="task_1_academic"]');
  if (t1AcademicBtn) {
    await t1AcademicBtn.click();
    await new Promise(r => setTimeout(r, 800));
    await page.$eval('#task-criteria-tip-box', el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_04_editor_task1_academic_warning.png') });
    console.log('📸 Captured visual_04_editor_task1_academic_warning.png');
  }

  // Click Task 2
  const t2Btn = await page.$('.type-btn[data-type="task_2"]');
  if (t2Btn) {
    await t2Btn.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_05_editor_task2_warning.png') });
    console.log('📸 Captured visual_05_editor_task2_warning.png');
  }

  // 4. Student Login & Session Check
  console.log('4. Logging in as Student 8567...');
  await page.click('#header-login-btn');
  await new Promise(r => setTimeout(r, 800));
  await page.type('#login-code-input', '8567');
  await page.click('#login-by-code-btn');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_06_student_authenticated.png') });
  console.log('📸 Captured visual_06_student_authenticated.png');

  // 5. Student Diagnostic Report with TA/TR Badges
  console.log('5. Viewing Diagnostic Report...');
  await page.click('#header-student-profile');
  await page.waitForSelector('.view-essay-btn', { timeout: 10000 }).catch(() => null);
  const viewBtn = await page.$('.view-essay-btn');
  if (viewBtn) {
    await viewBtn.click();
    await page.waitForSelector('#report-content-area .report-wrapper', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_07_cambridge_diagnostic_report.png') });
    console.log('📸 Captured visual_07_cambridge_diagnostic_report.png');
  }

  // =========================================================================
  // PART 2: Mereany Immersion Platform (localhost:5500)
  // =========================================================================
  console.log('\n--- Part 2: Mereany Immersion Platform (localhost:5500) ---');

  // 6. Navigate to Mereany Home
  console.log('6. Navigating to http://localhost:5500...');
  await page.goto('http://localhost:5500', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_08_mereany_hero_metobuild.png') });
  console.log('📸 Captured visual_08_mereany_hero_metobuild.png');

  // 7. Test Command Hub Switcher - Live Sessions
  console.log('7. Testing Command Hub Switcher...');
  const liveTab = await page.$('.hub-tab-btn[data-target="live-sessions"]');
  if (liveTab) {
    await liveTab.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_09_mereany_command_hub_live_sessions.png') });
    console.log('📸 Captured visual_09_mereany_command_hub_live_sessions.png');
  }

  // 8. Test Command Hub - Files Vault (21 PDFs)
  const filesTab = await page.$('.hub-tab-btn[data-target="files-vault"]');
  if (filesTab) {
    await filesTab.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_10_mereany_files_vault.png') });
    console.log('📸 Captured visual_10_mereany_files_vault.png');
  }

  // 9. Test Command Hub - Strategy Lab (CHIPSET)
  const strategyTab = await page.$('.hub-tab-btn[data-target="strategy-lab"]');
  if (strategyTab) {
    await strategyTab.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_11_mereany_strategy_lab_chipset.png') });
    console.log('📸 Captured visual_11_mereany_strategy_lab_chipset.png');
  }

  // 10. Standalone Presentation Deck (presentation.html)
  console.log('10. Navigating to Standalone 16:9 Presentation Deck...');
  await page.goto('http://localhost:5500/presentation.html?week=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'visual_12_mereany_slides_presentation.png') });
  console.log('📸 Captured visual_12_mereany_slides_presentation.png');

  await browser.close();
  console.log('🎉 All 12 Visual Tests completed successfully!');
}

runVisualTest().catch(err => {
  console.error('❌ Error during visual testing:', err);
  process.exit(1);
});
