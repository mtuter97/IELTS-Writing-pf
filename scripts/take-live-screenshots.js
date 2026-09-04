import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\elsae\\.gemini\\antigravity-ide\\brain\\ccd570c5-b6c6-4562-83f8-2993e4cf7c85';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runScreenshotJourney() {
  console.log('🚀 Starting Puppeteer Live Browser Journey...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Navigate to Home
  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Open Login Modal
  console.log('2. Opening Student Login Modal...');
  await page.click('#header-login-btn');
  await new Promise(r => setTimeout(r, 800));

  const shot1 = path.join(ARTIFACT_DIR, '01_login_modal.png');
  await page.screenshot({ path: shot1 });
  console.log('📸 Captured 01_login_modal.png');

  // Enter code with Arabic digits '٨٥٦٧'
  console.log('3. Typing Arabic code ٨٥٦٧...');
  await page.type('#login-code-input', '٨٥٦٧');
  await new Promise(r => setTimeout(r, 500));

  await page.click('#login-by-code-btn');
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot after login
  const shot2 = path.join(ARTIFACT_DIR, '02_student_logged_in.png');
  await page.screenshot({ path: shot2 });
  console.log('📸 Captured 02_student_logged_in.png');

  // 4. Fill Prompt and Essay
  console.log('4. Entering IELTS Task 2 prompt and essay...');
  await page.$eval('#prompt-input', el => {
    el.value = 'Some people think university education should be free for all students. Others believe students should pay. Discuss both views and give your opinion.';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const sampleEssay = `In modern society, access to higher education is widely regarded as a fundamental catalyst for socio-economic mobility. While some individuals argue that university education ought to be completely publicly funded, others maintain that tertiary students should bear the financial burden of their tuition. In my view, while universal free tertiary education promotes equal opportunity, a hybrid model offering subsidised tuition with needs-based scholarships represents a more sustainable solution.

On the one hand, proponents of tuition-free university education argue that education is a basic human right that benefits society as a whole. When higher education is freely accessible, academically talented individuals from underprivileged socio-economic backgrounds are not excluded by prohibitive tuition fees. Countries that adopt free education models, such as several Scandinavian nations, frequently exhibit higher levels of social equality, technological innovation, and workforce productivity. Furthermore, free university prevents graduates from accumulating exorbitant debts, allowing them to participate meaningfully in the economy immediately after graduation.

On the other hand, opponents assert that providing free university education imposes an unsustainable financial strain on national budgets. Public funds are finite, and heavy university subsidisation often necessitates higher taxation rates or diverts crucial resources away from primary healthcare and fundamental infrastructure. Additionally, when higher education requires private financial contribution, students often display higher dedication and accountability toward their academic disciplines, reducing university dropout rates and degree depreciation.

In conclusion, although universally free university education embodies an egalitarian ideal, its long-term financial viability is precarious. Therefore, governments should implement income-contingent student loan schemes and comprehensive merit scholarships rather than adopting an entirely free tertiary model.`;

  await page.$eval('#essay-input', (el, text) => {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, sampleEssay);

  await new Promise(r => setTimeout(r, 800));

  // Scroll editor into view
  await page.$eval('#essay-input', el => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));

  const shot3 = path.join(ARTIFACT_DIR, '03_editor_ready_to_submit.png');
  await page.screenshot({ path: shot3 });
  console.log('📸 Captured 03_editor_ready_to_submit.png');

  // 5. Navigate to Student Academic Portal (Profile)
  console.log('5. Navigating to Student Academic Portal...');
  await page.click('#header-student-profile');
  await page.waitForSelector('.view-essay-btn, #target-progress-bar', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  const shot5 = path.join(ARTIFACT_DIR, '05_student_academic_portal.png');
  await page.screenshot({ path: shot5 });
  console.log('📸 Captured 05_student_academic_portal.png');

  // 6. View the Official Cambridge Diagnostic Evaluation Report
  console.log('6. Opening Cambridge Diagnostic Report from student history...');
  await page.click('.view-essay-btn');
  await page.waitForSelector('#report-content-area .report-wrapper, #report-content-area .executive-score-banner', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  const shot4 = path.join(ARTIFACT_DIR, '04_cambridge_report.png');
  await page.screenshot({ path: shot4 });
  console.log('📸 Captured 04_cambridge_report.png');

  // 7. Teacher Admin Suite
  console.log('7. Navigating to Teacher Admin Suite...');
  await page.click('#footer-admin-link');
  await page.waitForSelector('#admin-pin-inline-input', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));

  // Enter PIN
  console.log('8. Entering Admin PIN admin123...');
  await page.type('#admin-pin-inline-input', 'admin123');
  await page.click('#admin-pin-submit-btn');
  await page.waitForSelector('.admin-subtab-btn[data-subtab="settings"]', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  const shot6 = path.join(ARTIFACT_DIR, '06_teacher_admin_directory.png');
  await page.screenshot({ path: shot6 });
  console.log('📸 Captured 06_teacher_admin_directory.png');

  // Click Settings subtab in Admin
  console.log('9. Opening Settings subtab in Admin...');
  await page.click('.admin-subtab-btn[data-subtab="settings"]');
  await new Promise(r => setTimeout(r, 1200));

  const shot7 = path.join(ARTIFACT_DIR, '07_teacher_ai_settings.png');
  await page.screenshot({ path: shot7 });
  console.log('📸 Captured 07_teacher_ai_settings.png');

  // 10. Scroll down to Cloud Database (Upstash Redis / Vercel KV) card
  console.log('10. Scrolling to Cloud Database settings card...');
  await page.$eval('#admin-setting-kv-url', el => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));

  const shot8 = path.join(ARTIFACT_DIR, '08_teacher_cloud_db_settings.png');
  await page.screenshot({ path: shot8 });
  console.log('📸 Captured 08_teacher_cloud_db_settings.png');

  await browser.close();
  console.log('🎉 All live screenshots captured successfully!');
}

runScreenshotJourney().catch(err => {
  console.error('❌ Error during screenshot journey:', err);
  process.exit(1);
});
