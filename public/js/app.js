import { initTheme } from './theme.js';
import { initStudentState, renderStudentDashboard, loginWithCode, loginWithGoogle, logoutStudent, getActiveStudent } from './student.js';
import { initEditor } from './editor.js';
import { renderFeedbackReport } from './report-renderer.js';
import { renderAdminDashboard } from './admin.js';
import { fetchSettings, saveSettings, fetchEssay, createStudent } from './api.js';

let activeTab = 'editor';

document.addEventListener('DOMContentLoaded', async () => {
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

  // 8. Handle Direct Admin Route / Secret Hash Access or restore saved tab
  if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
    switchTab('admin');
  } else {
    const savedTab = localStorage.getItem('ielts_active_tab');
    if (savedTab && (savedTab === 'profile' || savedTab === 'report' || savedTab === 'editor')) {
      switchTab(savedTab);
    }
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') switchTab('admin');
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

  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  views.forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabName}`);
  });

  if (tabName === 'profile') {
    renderStudentDashboard();
  } else if (tabName === 'admin') {
    renderAdminDashboard();
  } else if (tabName === 'report') {
    const cached = localStorage.getItem('ielts_latest_evaluation');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.essay && parsed.feedback) {
          renderFeedbackReport(parsed.essay, parsed.feedback);
        }
      } catch (_) {}
    }
  }
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
    try {
      localStorage.setItem('ielts_latest_evaluation', JSON.stringify({ essay, feedback }));
    } catch (_) {}
    // Client-side cache persistence
    if (essay && essay.student_id) {
      try {
        const key = `ielts_cache_essays_${essay.student_id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.some(x => x.id === essay.id)) {
          existing.unshift(essay);
          localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
        }
      } catch (err) {
        console.warn('LocalStorage cache error:', err);
      }
    }
    renderFeedbackReport(essay, feedback);
    switchTab('report');
  });

  window.addEventListener('load-essay-report', async (e) => {
    const { essayId } = e.detail;
    try {
      const essay = await fetchEssay(essayId);
      if (essay && essay.feedback) {
        renderFeedbackReport(essay, essay.feedback);
        switchTab('report');
      }
    } catch (err) {
      alert('فشل استرجاع المقال: ' + err.message);
    }
  });

  window.addEventListener('student-changed', () => {
    if (activeTab === 'profile') {
      renderStudentDashboard();
    }
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
