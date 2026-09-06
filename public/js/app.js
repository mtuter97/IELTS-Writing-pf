import { initTheme } from './theme.js';
import { initStudentState, renderStudentDashboard, loginWithCode, loginWithGoogle, logoutStudent, getActiveStudent } from './student.js';
import { initEditor } from './editor.js';
import { renderFeedbackReport } from './report-renderer.js';
import { renderAdminDashboard } from './admin.js';
import { fetchSettings, saveSettings, fetchEssay, createStudent } from './api.js';
import { IDP_META, OFFICIAL_IDP_DESCRIPTORS } from './idp-criteria-data.js';

let activeTab = 'editor';

document.addEventListener('DOMContentLoaded', async () => {
  // Purge legacy global leak keys immediately so no old report leaks across sessions!
  try {
    localStorage.removeItem('ielts_latest_evaluation');
  } catch (_) {}

  // 0. Initialize Theme (Light / Dark Mode)
  initTheme();

  // 1. Initialize Student State (Loads saved session or keeps as guest/unregistered)
  await initStudentState();

  // 2. Initialize Editor
  initEditor();

  // 3. Initialize Provider & Settings
  await updateProviderStatusBadge();

  // 4. Setup Tabs
  setupTabs();

  // 5. Setup Modals and Role Navigation
  setupModals();

  // 6. Setup Global App Events
  setupAppEvents();

  // 7. Initialize Community Subscriber Metric (Starting at 100+ as requested)
  updateSubscribersMetric();

  // 8. Handle Direct Route / Hash Access or restore saved tab
  if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
    switchTab('admin');
  } else if (window.location.hash === '#report') {
    switchTab('report');
  } else if (window.location.hash === '#profile') {
    switchTab('profile');
  } else {
    const savedTab = localStorage.getItem('ielts_active_tab');
    if (savedTab && (savedTab === 'profile' || savedTab === 'report' || savedTab === 'editor')) {
      switchTab(savedTab);
    } else {
      switchTab('editor');
    }
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') switchTab('admin');
    else if (window.location.hash === '#report') switchTab('report');
    else if (window.location.hash === '#profile') switchTab('profile');
  });

  // Secret keyboard shortcut for Admin: Ctrl + Alt + A
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.altKey || e.shiftKey) && (e.key === 'a' || e.key === 'A' || e.key === 'ش')) {
      e.preventDefault();
      switchTab('admin');
    }
  });
});

async function updateSubscribersMetric() {
  const heroCountEl = document.getElementById('hero-subscribers-count');
  const footerCountEl = document.getElementById('footer-subscribers-count');
  try {
    const res = await fetch('/api/students');
    const students = await res.json();
    const count = 100 + (Array.isArray(students) ? students.length : 0);
    if (heroCountEl) heroCountEl.textContent = `${count}+`;
    if (footerCountEl) footerCountEl.textContent = `${count}+`;
  } catch (e) {
    if (heroCountEl) heroCountEl.textContent = '100+';
    if (footerCountEl) footerCountEl.textContent = '100+';
  }
}

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Expose switchTab globally for easy in-app cross navigation
  window.switchAppTab = switchTab;
}

export function switchTab(tabName) {
  activeTab = tabName;
  localStorage.setItem('ielts_active_tab', tabName);
  const tabButtons = document.querySelectorAll('.tab-btn');
  const views = document.querySelectorAll('.view-section');
  const landingSections = document.querySelectorAll('.hero_area, .feature-area, .why-choose-area, .testimonial-area');

  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  views.forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabName}`);
  });

  // Only show landing overview sections on the simulator/editor tab
  const isEditor = (tabName === 'editor');
  landingSections.forEach(sec => {
    sec.style.display = isEditor ? 'block' : 'none';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabName === 'profile') {
    renderStudentDashboard();
  } else if (tabName === 'admin') {
    renderAdminDashboard();
  } else if (tabName === 'report') {
    syncReportView();
  }
}

export function syncReportView() {
  const reportContainer = document.getElementById('report-content-area');
  if (!reportContainer) return;

  const currentStudent = getActiveStudent();

  // 1. If a student is logged in:
  if (currentStudent && currentStudent.id) {
    // Check for evaluation scoped to THIS student
    const studentEvalKey = `ielts_evaluation_${currentStudent.id}`;
    const cached = localStorage.getItem(studentEvalKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.essay && parsed.feedback && parsed.essay.student_id === currentStudent.id) {
          renderFeedbackReport(parsed.essay, parsed.feedback);
          return;
        }
      } catch (_) {}
    }

    // Check student's cached essays history
    try {
      const cachedEssays = JSON.parse(localStorage.getItem(`ielts_cache_essays_${currentStudent.id}`) || '[]');
      if (cachedEssays.length > 0 && cachedEssays[0].feedback) {
        renderFeedbackReport(cachedEssays[0], cachedEssays[0].feedback);
        return;
      }
    } catch (_) {}

    // No evaluation yet for this specific student
    reportContainer.innerHTML = `
      <div style="text-align:center; padding:5rem 2rem; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color);">
        <div style="font-size:3.2rem; margin-bottom:1rem;">🎓</div>
        <h3 style="font-size:1.35rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">مرحباً ${currentStudent.name}، لا يوجد مقال تم تقييمه بعد</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; max-width:520px; margin:0 auto 1.5rem; line-height:1.6;">
          لم تقم بإرسال أي مقال للتقييم في هذا الحساب حتى الآن. انتقل إلى <strong>محاكي وكتابة المقال</strong> واختر المهمة واكتب مقالك لتحصل على تقييم فاحص الآيلتس المعتمد وبصمة أخطائك.
        </p>
        <button class="btn btn-primary" onclick="window.switchAppTab('editor')" style="padding:0.65rem 1.5rem; font-weight:700;">
          الانتقال إلى محاكي المقال ✍️
        </button>
      </div>
    `;
    return;
  }

  // 2. If GUEST (logged out / no student account):
  // Never show any registered student's evaluation!
  const guestCached = localStorage.getItem('ielts_guest_evaluation');
  if (guestCached) {
    try {
      const parsed = JSON.parse(guestCached);
      if (parsed && parsed.essay && parsed.feedback && (!parsed.essay.student_id || parsed.essay.student_id === 'guest')) {
        renderFeedbackReport(parsed.essay, parsed.feedback);
        return;
      }
    } catch (_) {}
  }

  // Clean empty state for logged-out users with NO evaluation:
  reportContainer.innerHTML = `
    <div style="text-align:center; padding:5rem 2rem; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color);">
      <div style="font-size:3.2rem; margin-bottom:1rem;">📝</div>
      <h3 style="font-size:1.35rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">لم يتم تقييم أي مقال في هذه الجلسة بعد</h3>
      <p style="color:var(--text-muted); font-size:0.95rem; max-width:520px; margin:0 auto 1.5rem; line-height:1.6;">
        يرجى تسجيل الدخول بحساب الطالب الخاص بك، أو الانتقال إلى <strong>محاكي وكتابة المقال</strong> لكتابة مقالك وإرساله للتقييم.
      </p>
      <div style="display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="window.switchAppTab('editor')" style="padding:0.65rem 1.5rem; font-weight:700;">
          الانتقال إلى محاكي المقال ✍️
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('header-login-btn')?.click()" style="padding:0.65rem 1.5rem; font-weight:700;">
          دخول حساب الطالب 👤
        </button>
      </div>
    </div>
  `;
}

function setupModals() {
  // Student Modal & Private Login
  const headerLoginBtn = document.getElementById('header-login-btn');
  const headerStudentProfile = document.getElementById('header-student-profile');
  const headerLogoutBtn = document.getElementById('header-student-logout-btn');
  const studentModal = document.getElementById('student-modal');
  const closeStudentModal = document.getElementById('close-student-modal');
  const loginByCodeBtn = document.getElementById('login-by-code-btn');
  const loginCodeInput = document.getElementById('login-code-input');
  const loginErrorDiv = document.getElementById('login-modal-error');

  // Secret Teacher / Admin Link in footer
  const footerAdminLink = document.getElementById('footer-admin-link');
  if (footerAdminLink) {
    footerAdminLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('admin');
    });
  }

  // Modal active session elements
  const modalActiveBox = document.getElementById('modal-active-session-box');
  const modalActiveName = document.getElementById('modal-active-student-name');
  const modalLogoutBtn = document.getElementById('modal-logout-btn');

  function openStudentModal() {
    const student = getActiveStudent();
    if (student) {
      if (modalActiveBox) modalActiveBox.style.display = 'block';
      if (modalActiveName) modalActiveName.textContent = `${student.name} (${student.access_code || student.id})`;
    } else {
      if (modalActiveBox) modalActiveBox.style.display = 'none';
    }
    if (loginErrorDiv) loginErrorDiv.style.display = 'none';
    studentModal.classList.add('open');
    if (loginCodeInput) {
      loginCodeInput.value = '';
      setTimeout(() => loginCodeInput.focus(), 100);
    }
  }

  // Header Student Login Button
  if (headerLoginBtn && studentModal) {
    headerLoginBtn.addEventListener('click', openStudentModal);
  }

  // Header Student Profile Pill click -> Navigate to My Academic DNA
  if (headerStudentProfile) {
    headerStudentProfile.addEventListener('click', (e) => {
      if (e.target.closest('#header-student-logout-btn')) return;
      switchTab('profile');
    });
  }

  // Header Logout Button -> Clear Student Session
  if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      logoutStudent();
      showToast('تم تسجيل الخروج بنجاح. حسابك محمي ومقالاتك محفوظة.', 'info');
    });
  }

  // Modal Logout Button
  if (modalLogoutBtn && studentModal) {
    modalLogoutBtn.addEventListener('click', () => {
      logoutStudent();
      studentModal.classList.remove('open');
      showToast('تم تسجيل الخروج بنجاح. حسابك محمي ومقالاتك محفوظة.', 'info');
    });
  }

  if (closeStudentModal && studentModal) {
    closeStudentModal.addEventListener('click', () => {
      studentModal.classList.remove('open');
    });
  }

  // Google Sign-In wiring
  const googleLoginBtn = document.getElementById('google-login-btn');
  const googleDialogModal = document.getElementById('google-signin-dialog-modal');
  const closeGoogleDialogModal = document.getElementById('close-google-dialog-modal');
  const googleConfirmBtn = document.getElementById('google-confirm-signin-btn');
  const googleInputName = document.getElementById('google-input-name');
  const googleInputEmail = document.getElementById('google-input-email');

  if (googleLoginBtn && googleDialogModal) {
    googleLoginBtn.addEventListener('click', () => {
      studentModal?.classList.remove('open');
      googleDialogModal.classList.add('open');
      setTimeout(() => googleInputName?.focus(), 100);
    });
  }

  if (closeGoogleDialogModal && googleDialogModal) {
    closeGoogleDialogModal.addEventListener('click', () => {
      googleDialogModal.classList.remove('open');
    });
  }

  if (googleConfirmBtn) {
    googleConfirmBtn.addEventListener('click', async () => {
      const name = googleInputName?.value.trim() || 'طالب Google';
      const email = googleInputEmail?.value.trim() || '';

      if (!email || !email.includes('@')) {
        alert('يرجى إدخال بريد إلكتروني صحيح (Gmail).');
        googleInputEmail?.focus();
        return;
      }

      googleConfirmBtn.disabled = true;
      googleConfirmBtn.textContent = 'جاري تسجيل الدخول...';

      try {
        const result = await loginWithGoogle({
          name,
          email,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff&size=128`,
          google_id: 'g_' + Date.now()
        });

        googleDialogModal.classList.remove('open');
        googleConfirmBtn.disabled = false;
        googleConfirmBtn.innerHTML = '<span>🚀</span> تأكيد ومتابعة الدخول';

        showToast(`مرحباً ${result.student.name}! تم تسجيل حسابك. بانتظار كود التفعيل من المعلم.`, 'info');
        switchTab('profile');
      } catch (err) {
        googleConfirmBtn.disabled = false;
        googleConfirmBtn.innerHTML = '<span>🚀</span> تأكيد ومتابعة الدخول';
        alert('فشل تسجيل الدخول عبر Google: ' + err.message);
      }
    });

    googleInputEmail?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') googleConfirmBtn.click();
    });
  }

  // Login By Student Code inside Modal
  if (loginByCodeBtn && loginCodeInput) {
    async function doCodeLogin() {
      const code = loginCodeInput.value.trim();
      if (!code) {
        if (loginErrorDiv) {
          loginErrorDiv.style.display = 'block';
          loginErrorDiv.textContent = 'يرجى إدخال كود الطالب أولاً.';
        }
        loginCodeInput.focus();
        return;
      }
      try {
        loginByCodeBtn.textContent = 'جاري التحقق...';
        if (loginErrorDiv) loginErrorDiv.style.display = 'none';
        await loginWithCode(code);
        loginByCodeBtn.textContent = 'دخول الحساب 🚀';
        studentModal.classList.remove('open');
        showToast('أهلاً بك! تم تسجيل الدخول إلى حسابك بنجاح.', 'success');
        if (activeTab === 'profile') renderStudentDashboard();
      } catch (err) {
        loginByCodeBtn.textContent = 'دخول الحساب 🚀';
        if (loginErrorDiv) {
          loginErrorDiv.style.display = 'block';
          loginErrorDiv.textContent = err.message || 'كود الطالب غير صحيح أو غير مسجل في المنظومة.';
        }
      }
    }

    loginByCodeBtn.addEventListener('click', doCodeLogin);
    loginCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doCodeLogin();
    });
  }

  // Teacher Add Student Modal
  const addStudentModal = document.getElementById('add-student-modal');
  const closeAddStudentModal = document.getElementById('close-add-student-modal');
  const adminSaveStudentBtn = document.getElementById('admin-save-student-btn');

  if (closeAddStudentModal && addStudentModal) {
    closeAddStudentModal.addEventListener('click', () => {
      addStudentModal.classList.remove('open');
    });
  }

  if (adminSaveStudentBtn) {
    adminSaveStudentBtn.addEventListener('click', async () => {
      const name = document.getElementById('admin-new-student-name').value.trim();
      const phone = document.getElementById('admin-new-student-phone').value.trim();
      const status = document.getElementById('admin-new-student-status').value;
      const notes = document.getElementById('admin-new-student-notes').value.trim();

      if (!name) {
        alert('يرجى كتابة اسم الطالب الكامل.');
        return;
      }

      try {
        adminSaveStudentBtn.textContent = 'جاري الحفظ...';
        const newStudent = await createStudent({ name, phone, status, notes });
        adminSaveStudentBtn.textContent = 'حفظ وتوليد كود الدخول 🚀';
        addStudentModal.classList.remove('open');
        document.getElementById('admin-new-student-name').value = '';
        document.getElementById('admin-new-student-phone').value = '';
        document.getElementById('admin-new-student-notes').value = '';
        showToast(`تمت إضافة الطالب ${newStudent.name} وتوليد الكود: ${newStudent.access_code}`, 'success');
        renderAdminDashboard();
      } catch (e) {
        adminSaveStudentBtn.textContent = 'حفظ وتوليد كود الدخول 🚀';
        alert('فشل إضافة الطالب: ' + e.message);
      }
    });
  }
  // 2026 Cambridge Criteria Interactive Carousel / Slider
  const criteriaCarousel = document.getElementById('criteria-carousel');
  const criteriaPrevBtn = document.getElementById('criteria-prev-btn');
  const criteriaNextBtn = document.getElementById('criteria-next-btn');
  const criteriaDots = document.querySelectorAll('#criteria-dots .carousel-dot');

  if (criteriaCarousel) {
    if (criteriaPrevBtn) {
      criteriaPrevBtn.addEventListener('click', () => {
        criteriaCarousel.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }
    if (criteriaNextBtn) {
      criteriaNextBtn.addEventListener('click', () => {
        criteriaCarousel.scrollBy({ left: -340, behavior: 'smooth' });
      });
    }

    criteriaDots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        const cardWidth = criteriaCarousel.querySelector('.criteria-card')?.offsetWidth || 340;
        criteriaCarousel.scrollTo({ left: - (idx * (cardWidth + 20)), behavior: 'smooth' });
        criteriaDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
    });

    criteriaCarousel.addEventListener('scroll', () => {
      const cardWidth = criteriaCarousel.querySelector('.criteria-card')?.offsetWidth || 340;
      const scrollPos = Math.abs(criteriaCarousel.scrollLeft);
      const activeIdx = Math.min(criteriaDots.length - 1, Math.round(scrollPos / (cardWidth + 20)));
      criteriaDots.forEach((d, i) => {
        if (i === activeIdx) d.classList.add('active');
        else d.classList.remove('active');
      });
    });
  }

  // 2026 Official IDP Writing Band Descriptors Modal
  setupIdpCriteriaModal();
}

function setupIdpCriteriaModal() {
  const modal = document.getElementById('idp-criteria-modal');
  const openBtn = document.getElementById('open-idp-rubrics-modal-btn');
  const closeBtn = document.getElementById('close-idp-criteria-modal');
  const closeBottomBtn = document.getElementById('close-idp-modal-bottom-btn');
  const container = document.getElementById('idp-descriptors-container');
  if (!modal || !container) return;

  let currentTask = 'task2';
  let currentBandFilter = 'all';

  const bandLabels = {
    band_9: { title: 'Band 9', levelEn: 'Expert User', levelAr: 'المستخدم الخبير (أداء استثنائي كامل)' },
    band_8: { title: 'Band 8', levelEn: 'Very Good User', levelAr: 'المستخدم المتفوق جداً (دقة عالية وهفوات نادرة)' },
    band_7: { title: 'Band 7', levelEn: 'Good User', levelAr: 'المستخدم الجيد (كفاءة ممتازة مع بعض التعميم)' },
    band_6: { title: 'Band 6', levelEn: 'Competent User', levelAr: 'المستخدم الكفء (وضوح عام مع تباين الدقة)' },
    band_5: { title: 'Band 5', levelEn: 'Modest User', levelAr: 'المستخدم المتواضع (تغطية جزئية وأخطاء متكررة)' },
    band_4: { title: 'Band 4', levelEn: 'Limited User', levelAr: 'المستخدم المحدود (أفكار غير مكتملة وتراكيب بسيطة)' },
    band_3: { title: 'Band 3', levelEn: 'Extremely Limited User', levelAr: 'أداء شديد المحدودية' },
    band_2: { title: 'Band 2', levelEn: 'Intermittent User', levelAr: 'كلمات متفرقة وغير مترابطة' },
    band_1: { title: 'Band 1', levelEn: 'Non-User', levelAr: 'أقل من 20 كلمة / لا توجد لغة قابلة للتقييم' },
    band_0: { title: 'Band 0', levelEn: 'Did not attend / Memorised', levelAr: 'عدم المحاولة أو نص محفوظ بالكامل' }
  };

  function formatBulletPoints(text) {
    if (!text) return '<p style="color:var(--text-muted); font-style:italic;">No specific descriptor.</p>';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => `<div class="idp-bullet-point">${line}</div>`).join('');
  }

  function renderDescriptors() {
    const taskData = OFFICIAL_IDP_DESCRIPTORS[currentTask] || {};
    let bandsToDisplay = [];

    if (currentBandFilter === 'all') {
      bandsToDisplay = ['band_9', 'band_8', 'band_7', 'band_6', 'band_5', 'band_4', 'band_3', 'band_2', 'band_1', 'band_0'];
    } else if (currentBandFilter === 'low') {
      bandsToDisplay = ['band_3', 'band_2', 'band_1', 'band_0'];
    } else {
      bandsToDisplay = [currentBandFilter];
    }

    const html = bandsToDisplay.map(bandKey => {
      const bandObj = taskData[bandKey] || {};
      const info = bandLabels[bandKey] || { title: bandKey, levelEn: '', levelAr: '' };
      const isTask1 = currentTask === 'task1';
      const trText = isTask1 ? bandObj.task_achievement : bandObj.task_response;
      const ccText = bandObj.coherence_cohesion;
      const lrText = bandObj.lexical_resource;
      const graText = bandObj.grammatical_range_accuracy;

      return `
        <div class="idp-rubric-band-card">
          <div class="idp-band-header">
            <div class="idp-band-title-wrap">
              <span class="idp-band-badge">${info.title}</span>
              <span class="idp-band-sublabel">${info.levelEn} • ${info.levelAr}</span>
            </div>
            <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">
              IDP Official Verbatim Rubric
            </span>
          </div>
          <div class="idp-criteria-quad-grid">
            <div class="idp-criterion-col">
              <div class="idp-crit-heading tr">
                <span>${isTask1 ? 'Task Achievement (TA)' : 'Task Response (TR)'}</span>
                <span style="font-size:0.7rem; opacity:0.8;">25%</span>
              </div>
              ${formatBulletPoints(trText)}
            </div>
            <div class="idp-criterion-col">
              <div class="idp-crit-heading cc">
                <span>Coherence & Cohesion (CC)</span>
                <span style="font-size:0.7rem; opacity:0.8;">25%</span>
              </div>
              ${formatBulletPoints(ccText)}
            </div>
            <div class="idp-criterion-col">
              <div class="idp-crit-heading lr">
                <span>Lexical Resource (LR)</span>
                <span style="font-size:0.7rem; opacity:0.8;">25%</span>
              </div>
              ${formatBulletPoints(lrText)}
            </div>
            <div class="idp-criterion-col">
              <div class="idp-crit-heading gra">
                <span>Grammar Range & Accuracy</span>
                <span style="font-size:0.7rem; opacity:0.8;">25%</span>
              </div>
              ${formatBulletPoints(graText)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Open & Close
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      renderDescriptors();
      modal.classList.add('open');
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }
  if (closeBottomBtn) {
    closeBottomBtn.addEventListener('click', () => modal.classList.remove('open'));
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  // Task Switcher
  const taskButtons = modal.querySelectorAll('.idp-task-btn');
  taskButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      taskButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTask = btn.getAttribute('data-task');
      renderDescriptors();
    });
  });

  // Band Filter Pills
  const filterPills = modal.querySelectorAll('.idp-band-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentBandFilter = pill.getAttribute('data-band');
      renderDescriptors();
    });
  });
}

async function updateProviderStatusBadge() {
  const badge = document.getElementById('active-provider-badge');
  if (!badge) return;

  try {
    const settings = await fetchSettings();
    const prov = settings.active_provider || 'gemini';
    const isConfigured = prov === 'gemini' ? settings.gemini_configured :
                         prov === 'groq' ? settings.groq_configured :
                         prov === 'you' || prov === 'youcom' ? settings.you_configured :
                         settings.openrouter_configured;

    if (isConfigured) {
      badge.className = 'badge badge-success';
      badge.textContent = `⚡ المزود: ${prov.toUpperCase()} (جاهز)`;
    } else {
      badge.className = 'badge badge-warning';
      badge.textContent = `⚠️ المزود: ${prov.toUpperCase()} (مفتاح الـ API مفقود)`;
    }
  } catch (err) {
    badge.className = 'badge badge-danger';
    badge.textContent = 'خطأ بالاتصال بالخادم';
  }
}

function setupAppEvents() {
  window.addEventListener('evaluation-completed', (e) => {
    const { essay, feedback } = e.detail;
    localStorage.removeItem('ielts_latest_evaluation'); // Purge legacy key
    
    const currentStudent = getActiveStudent();
    if (currentStudent && currentStudent.id) {
      try {
        localStorage.setItem(`ielts_evaluation_${currentStudent.id}`, JSON.stringify({ essay, feedback }));
      } catch (_) {}
      try {
        const key = `ielts_cache_essays_${currentStudent.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.some(x => x.id === essay.id)) {
          existing.unshift(essay);
          localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
        }
      } catch (err) {
        console.warn('LocalStorage cache error:', err);
      }
    } else {
      try {
        localStorage.setItem('ielts_guest_evaluation', JSON.stringify({ essay, feedback }));
      } catch (_) {}
    }

    renderFeedbackReport(essay, feedback);
    switchTab('report');
  });

  window.addEventListener('load-essay-report', async (e) => {
    const { essayId } = e.detail;
    try {
      const essay = await fetchEssay(essayId);
      if (essay && essay.feedback) {
        const currentStudent = getActiveStudent();
        if (currentStudent && currentStudent.id) {
          try {
            localStorage.setItem(`ielts_evaluation_${currentStudent.id}`, JSON.stringify({ essay, feedback: essay.feedback }));
          } catch (_) {}
        }
        renderFeedbackReport(essay, essay.feedback);
        switchTab('report');
      }
    } catch (err) {
      alert('فشل استرجاع المقال: ' + err.message);
    }
  });

  window.addEventListener('student-changed', () => {
    localStorage.removeItem('ielts_latest_evaluation');
    if (activeTab === 'profile') {
      renderStudentDashboard();
    }
    // Always sync report view with the current student state
    syncReportView();
  });

  window.addEventListener('admin-inspect-student', async (e) => {
    switchTab('profile');
    renderStudentDashboard();
  });
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
