import puppeteer from 'puppeteer-core';
import http from 'http';
import path from 'path';
import app from '../src/app.js';

const ARTIFACT_DIR = 'C:\\Users\\elsae\\.gemini\\antigravity-ide\\brain\\ee3ca639-7113-4315-ae28-7ee3eedb6674';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3888;

async function runVisualProof() {
  console.log('🚀 بدء تشغيل الاختبار المرئي الشامل...');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`📡 الخادم يعمل على: http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  try {
    // -------------------------------------------------------------
    // الدليل 1: الصفحة الرئيسية النظيفة (بدون زر خطة الدراسة)
    // -------------------------------------------------------------
    console.log('📸 1. التقاط الصفحة الرئيسية النظيفة...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_01_home_clean.png') });
    console.log('   ✅ تم حفظ proof_01_home_clean.png');

    // -------------------------------------------------------------
    // الدليل 2: تسجيل دخول الطالب "البطل يزيد" بالكود 1282
    // -------------------------------------------------------------
    console.log('📸 2. تسجيل دخول الطالب 1282 واستعراض لوحة الإنجازات وبصمة الأخطاء...');
    // النقر على تبويب "ملفي وبصمة أخطائي"
    await page.click('button[data-tab="profile"]');
    await page.waitForSelector('#portal-login-input', { visible: true, timeout: 5000 });
    await page.type('#portal-login-input', '1282');
    await new Promise((r) => setTimeout(r, 300));
    await page.click('#portal-login-btn');
    console.log('   ⏳ جاري تحميل لوحة الطالب واسترجاع المقالات وبصمة الأخطاء...');
    await page.waitForSelector('.table-container, .mistake-card', { visible: true, timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_02_student_dashboard_progress.png'), fullPage: true });
    console.log('   ✅ تم حفظ proof_02_student_dashboard_progress.png');

    // -------------------------------------------------------------
    // الدليل 3: فتح تقرير الاختبار الأول (Band 6.5)
    // -------------------------------------------------------------
    console.log('📸 3. استعراض تقرير الاختبار الأول (Band 6.5)...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('.view-essay-btn');
      if (buttons.length > 1) {
        buttons[buttons.length - 1].click(); // الأقدم (الاختبار 1)
      } else if (buttons.length > 0) {
        buttons[0].click();
      }
    });
    await page.waitForSelector('.diagnostic-report, #report-content-area', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_03_report_test1_band65.png'), fullPage: false });
    console.log('   ✅ تم حفظ proof_03_report_test1_band65.png');

    // -------------------------------------------------------------
    // الدليل 4: استعراض تقرير الاختبار الثاني (Band 7.5) وتنبيه الخطأ المتكرر
    // -------------------------------------------------------------
    console.log('📸 4. استعراض تقرير الاختبار الثاني وتنبيه الخطأ المتكرر...');
    await page.click('button[data-tab="profile"]');
    await new Promise((r) => setTimeout(r, 1000));

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('.view-essay-btn');
      if (buttons.length > 0) {
        buttons[0].click(); // الأحدث (الاختبار 2)
      }
    });
    await new Promise((r) => setTimeout(r, 2000));

    // تمرير خفيف لإظهار بطاقات المعايير وتنبيه الخطأ المتكرر بوضوح
    await page.evaluate(() => {
      window.scrollBy({ top: 380, behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_04_report_test2_recurring_alert.png'), fullPage: false });
    console.log('   ✅ تم حفظ proof_04_report_test2_recurring_alert.png');

    console.log('\n================================================================');
    console.log('🎉 تم التقاط كافة أدلة الإثبات المرئية بنجاح 100%!');
    console.log('================================================================');

  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runVisualProof().catch((err) => {
  console.error('❌ خطأ:', err);
  process.exit(1);
});
