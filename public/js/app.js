import { initTheme } from './theme.js';
import { initStudentState, renderStudentDashboard, loginWithCode, logoutStudent, getActiveStudent } from './student.js';
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
});

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

  // Teacher Suite Dedicated Trigger
  const headerTeacherBtn = document.getElementById('header-teacher-btn');
  if (headerTeacherBtn) {
    headerTeacherBtn.addEventListener('click', () => {
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
