import { initStudentState, renderStudentModalList, renderStudentDashboard } from './student.js';
import { initEditor } from './editor.js';
import { renderFeedbackReport } from './report-renderer.js';
import { fetchSettings, saveSettings, fetchEssay, createStudent } from './api.js';

let activeTab = 'editor';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Student State
  await initStudentState();

  // 2. Initialize Editor
  initEditor();

  // 3. Initialize Provider & Settings
  await updateProviderStatusBadge();

  // 4. Setup Tabs
  setupTabs();

  // 5. Setup Modals
  setupModals();

  // 6. Setup Global App Events
  setupAppEvents();
});

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const views = document.querySelectorAll('.view-section');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });
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
  }
}

function setupModals() {
  // Student Modal
  const studentPill = document.getElementById('header-student-pill');
  const studentModal = document.getElementById('student-modal');
  const closeStudentModal = document.getElementById('close-student-modal');
  const addStudentBtn = document.getElementById('add-student-btn');
  const newStudentInput = document.getElementById('new-student-name-input');

  if (studentPill && studentModal) {
    studentPill.addEventListener('click', () => {
      renderStudentModalList();
      studentModal.classList.add('open');
    });
  }

  if (closeStudentModal && studentModal) {
    closeStudentModal.addEventListener('click', () => {
      studentModal.classList.remove('open');
    });
  }

  if (addStudentBtn && newStudentInput) {
    addStudentBtn.addEventListener('click', async () => {
      const name = newStudentInput.value.trim();
      if (!name) return;
      try {
        await createStudent(name);
        newStudentInput.value = '';
        await renderStudentModalList();
        await initStudentState();
        if (activeTab === 'profile') renderStudentDashboard();
      } catch (err) {
        alert('فشل إضافة الطالب: ' + err.message);
      }
    });
  }

  // Settings Modal
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsModal = document.getElementById('close-settings-modal');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', async () => {
      await loadSettingsIntoModal();
      settingsModal.classList.add('open');
    });
  }

  if (closeSettingsModal && settingsModal) {
    closeSettingsModal.addEventListener('click', () => {
      settingsModal.classList.remove('open');
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const active_provider = document.getElementById('setting-provider-select').value;
      const gemini_api_key = document.getElementById('setting-gemini-key').value;
      const groq_api_key = document.getElementById('setting-groq-key').value;
      const openrouter_api_key = document.getElementById('setting-openrouter-key').value;

      try {
        saveSettingsBtn.textContent = 'جاري الحفظ...';
        await saveSettings({
          active_provider,
          gemini_api_key,
          groq_api_key,
          openrouter_api_key
        });
        saveSettingsBtn.textContent = 'حفظ الإعدادات';
        settingsModal.classList.remove('open');
        await updateProviderStatusBadge();
        showToast('تم حفظ إعدادات الـ API بنجاح!', 'success');
      } catch (err) {
        saveSettingsBtn.textContent = 'حفظ الإعدادات';
        alert('فشل حفظ الإعدادات: ' + err.message);
      }
    });
  }
}

async function loadSettingsIntoModal() {
  try {
    const settings = await fetchSettings();
    const providerSelect = document.getElementById('setting-provider-select');
    if (providerSelect) providerSelect.value = settings.active_provider || 'gemini';

    const geminiKeyInput = document.getElementById('setting-gemini-key');
    const groqKeyInput = document.getElementById('setting-groq-key');
    const openrouterKeyInput = document.getElementById('setting-openrouter-key');

    if (geminiKeyInput && settings.gemini_configured) {
      geminiKeyInput.placeholder = '•••••••••••••••• (تم الضبط مسبقاً)';
    }
    if (groqKeyInput && settings.groq_configured) {
      groqKeyInput.placeholder = '•••••••••••••••• (تم الضبط مسبقاً)';
    }
    if (openrouterKeyInput && settings.openrouter_configured) {
      openrouterKeyInput.placeholder = '•••••••••••••••• (تم الضبط مسبقاً)';
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
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
    // Client-side cache persistence for seamless Vercel serverless experience
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
