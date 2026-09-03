import { fetchStudentDetails, loginStudentByCode, authWithGoogle, activateStudentByCode } from './api.js';
import { icons } from './icons.js';

let activeStudent = null;
let activeMistakeFilter = 'all'; // 'all', 'grammar', 'vocabulary', 'coherence', 'task'
let activeEssayTypeFilter = 'all'; // 'all', 'task_1', 'task_2'

export function getActiveStudent() {
  return activeStudent;
}

export function setActiveStudent(student) {
  activeStudent = student;
  if (student && student.id) {
    localStorage.setItem('ielts_active_student_id', student.id);
    localStorage.setItem('ielts_active_student_data', JSON.stringify(student));
  } else {
    localStorage.removeItem('ielts_active_student_id');
    localStorage.removeItem('ielts_active_student_data');
  }
  try {
    localStorage.removeItem('ielts_latest_evaluation');
  } catch (_) {}
  updateStudentHeaderUI();
  window.dispatchEvent(new CustomEvent('student-changed', { detail: student }));
}

export async function initStudentState() {
  try {
    localStorage.removeItem('ielts_latest_evaluation');
  } catch (_) {}

  try {
    // 1. Instantly restore cached student session so refreshing NEVER logs the user out
    const cachedData = localStorage.getItem('ielts_active_student_data');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && parsed.id) {
          activeStudent = parsed;
          updateStudentHeaderUI();
        }
      } catch (_) {}
    }

    const savedId = localStorage.getItem('ielts_active_student_id') || (activeStudent && activeStudent.id);
    if (savedId) {
      try {
        const student = await fetchStudentDetails(savedId);
        if (student && student.id) {
          activeStudent = student;
          localStorage.setItem('ielts_active_student_id', student.id);
          localStorage.setItem('ielts_active_student_data', JSON.stringify(student));
        }
      } catch (e) {
        // DO NOT log out on network glitch or server spin-up! Retain the cached session!
        console.warn('Network issue fetching student details, maintaining active student session:', e.message);
      }
    }
  } catch (err) {
    console.warn('Init student state fallback:', err);
  }

  updateStudentHeaderUI();
  return activeStudent;
}

export function logoutStudent() {
  const prevStudent = activeStudent;
  activeStudent = null;
  localStorage.removeItem('ielts_active_student_id');
  localStorage.removeItem('ielts_active_student_data');
  localStorage.removeItem('ielts_latest_evaluation');
  localStorage.removeItem('ielts_guest_evaluation');
  if (prevStudent && prevStudent.id) {
    localStorage.removeItem(`ielts_evaluation_${prevStudent.id}`);
  }
  localStorage.removeItem('ielts_draft_essay');
  localStorage.removeItem('ielts_draft_prompt');

  // Reset Report View DOM to clean initial empty state
  const reportContainer = document.getElementById('report-content-area');
  if (reportContainer) {
    reportContainer.innerHTML = `
      <div style="text-align:center; padding:5rem 2rem; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color);">
        <div style="font-size:3rem; margin-bottom:1rem;">📝</div>
        <h3 style="font-size:1.35rem; font-weight:800; margin-bottom:0.5rem;">لم يتم تقييم أي مقال في هذه الجلسة بعد</h3>
        <p style="color:var(--text-muted); font-size:0.92rem; max-width:500px; margin:0 auto 1.5rem;">
          انتقل إلى شاشة "محاكي وكتابة المقال"، اكتب مقالك واضغط على "إرسال المقال للتقييم" لعرض تقرير الفاحص الشامل والدرجات التفصيلية.
        </p>
      </div>
    `;
  }

  // Clear Essay & Prompt inputs in Simulator
  const essayInput = document.getElementById('essay-input');
  const promptInput = document.getElementById('prompt-input');
  if (essayInput) essayInput.value = '';
  if (promptInput) promptInput.value = '';
  const wordCountNumber = document.getElementById('word-count-number');
  if (wordCountNumber) wordCountNumber.textContent = '0';
  const wordCountPill = document.getElementById('word-count-pill');
  if (wordCountPill) {
    wordCountPill.classList.remove('ready', 'near');
    wordCountPill.classList.add('under');
  }

  updateStudentHeaderUI();
  window.dispatchEvent(new CustomEvent('student-changed', { detail: null }));
  renderStudentDashboard();

  // If user is currently on report or profile tab, switch back to editor
  if (typeof window.switchAppTab === 'function') {
    window.switchAppTab('editor');
  }
}

export function updateStudentHeaderUI() {
  const loginBtn = document.getElementById('header-login-btn');
  const profileContainer = document.getElementById('header-student-profile');
  const nameEl = document.getElementById('header-student-name');
  const avatarEl = document.getElementById('header-student-avatar');
  const statusEl = document.getElementById('header-student-status');
  const banner = document.getElementById('subscription-notice-banner');

  if (activeStudent) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (profileContainer) profileContainer.style.display = 'flex';
    if (nameEl) nameEl.textContent = activeStudent.name;
    if (avatarEl) {
      if (activeStudent.picture) {
        avatarEl.innerHTML = `<img src="${activeStudent.picture}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
      } else {
        avatarEl.textContent = (activeStudent.name || 'S').trim().substring(0, 1).toUpperCase();
      }
    }
    
    if (statusEl) {
      const isActive = activeStudent.status === 'active';
      statusEl.className = `badge ${isActive ? 'badge-success' : 'badge-warning'}`;
      statusEl.textContent = isActive ? 'مفعل' : '⏳ بانتظار التفعيل';
    }

    if (banner) {
      if (activeStudent.status === 'pending') {
        banner.style.display = 'block';
        const waLink = banner.querySelector('.btn-whatsapp');
        if (waLink) {
          const text = encodeURIComponent(`مرحباً أستاذي، قمت بالتسجيل باسم: ${activeStudent.name} ${activeStudent.email ? `(${activeStudent.email})` : ''}. أود استلام كود التفعيل في منصة الآيلتس.`);
          waLink.href = `https://wa.me/966549724510?text=${text}`;
        }
      } else {
        banner.style.display = 'none';
      }
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (profileContainer) profileContainer.style.display = 'none';
    if (banner) banner.style.display = 'none';
  }
}

export async function loginWithCode(code) {
  try {
    const student = await loginStudentByCode(code);
    setActiveStudent(student);
    window.dispatchEvent(new CustomEvent('student-changed', { detail: student }));
    return student;
  } catch (err) {
    throw err;
  }
}

export async function loginWithGoogle(googleData) {
  const result = await authWithGoogle(googleData);
  setActiveStudent(result.student);
  window.dispatchEvent(new CustomEvent('student-changed', { detail: result.student }));
  renderStudentDashboard();
  return result;
}

export async function activateStudentAccount(code) {
  if (!activeStudent) throw new Error('لا يوجد حساب نشط لتفعيله.');
  const updatedStudent = await activateStudentByCode(activeStudent.id, code);
  setActiveStudent(updatedStudent);
  window.dispatchEvent(new CustomEvent('student-changed', { detail: updatedStudent }));
  renderStudentDashboard();
  return updatedStudent;
}

/**
 * Render Student Academic Portal and Mistake DNA
 */
export async function renderStudentDashboard() {
  const container = document.getElementById('student-profile-content');
  if (!container) return;

  // 1. If not logged in -> Render clean private Portal Landing with Login Options
  if (!activeStudent) {
    container.innerHTML = `
      <div class="student-portal-login-card">
        <div class="portal-login-icon">🧬</div>
        <h2 style="font-size:1.6rem; font-weight:800; color:var(--text-main); margin-bottom:0.75rem;">
          بوابة الطالب الأكاديمية وبصمة الأخطاء
        </h2>
        <p style="color:var(--text-secondary); font-size:0.95rem; max-width:540px; margin:0 auto 1.5rem; line-height:1.6;">
          سجل دخولك بحساب Google أو أدخل كود الوصول للوصول إلى سجلك الأكاديمي، متابعة درجات الباند، ورصد بصمة أخطائك المتكررة.
        </p>

        <!-- Fast Google Button in Portal -->
        <div style="margin-bottom:1.5rem;">
          <button id="portal-google-login-btn" class="btn btn-google" style="margin:0 auto; width:100%; max-width:440px; justify-content:center; gap:0.6rem; padding:0.75rem 1.25rem; font-size:0.95rem;">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418l3.0067-2.3318z"/>
              <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.9205 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"/>
            </svg>
            <span>المتابعة والتسجيل باستخدام حساب Google</span>
          </button>
        </div>

        <div style="display:flex; align-items:center; max-width:440px; margin:1.25rem auto; gap:0.75rem;">
          <div style="flex:1; height:1px; background:var(--border-color);"></div>
          <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">أو الدخول المباشر بالكود</span>
          <div style="flex:1; height:1px; background:var(--border-color);"></div>
        </div>

        <div style="background:var(--bg-card-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem; max-width:440px; margin:0 auto 2rem; box-shadow:var(--shadow-sm);">
          <label style="display:block; font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:0.5rem; text-align:right;">
            🔑 كود الطالب الخاص (Access Code):
          </label>
          <div style="display:flex; gap:0.5rem;">
            <input type="text" id="portal-login-input" class="form-input" placeholder="مثال: IELTS-1042 أو رقم الهاتف..." style="font-family:monospace; font-size:1.05rem; font-weight:700; text-align:center;">
            <button id="portal-login-btn" class="btn btn-primary" style="white-space:nowrap; padding:0.6rem 1.4rem;">دخول حسابي 🚀</button>
          </div>
          <div id="portal-login-error" style="color:var(--danger); font-size:0.85rem; margin-top:0.6rem; display:none; font-weight:600; text-align:right;"></div>
        </div>

        <div class="portal-features-grid">

          <div class="portal-feature-box">
            <span style="font-size:1.8rem; display:block; margin-bottom:0.4rem;">🧬</span>
            <strong style="display:block; color:var(--text-main); font-size:0.95rem; margin-bottom:0.25rem;">بصمة الأخطاء المتكررة</strong>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">تشخيص الأخطاء المزمنة وقواعد علاجها لضمان عدم تكرار نفس الهفوة يوم الامتحان.</p>
          </div>

          <div class="portal-feature-box">
            <span style="font-size:1.8rem; display:block; margin-bottom:0.4rem;">📚</span>
            <strong style="display:block; color:var(--text-main); font-size:0.95rem; margin-bottom:0.25rem;">أرشيف المقالات والتقارير</strong>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">استعراض كافة المقالات السابقة ومقارنة النتائج وإعادة طباعة تقارير PDF.</p>
          </div>
        </div>

        <div style="background:var(--bg-card-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem; text-align:right; max-width:620px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <strong style="display:block; color:var(--text-main); font-size:0.95rem; margin-bottom:0.25rem;">
              هل ترغب في الاشتراك؟ انضم لأكثر من 100+ طالب مشترك ومفعل
            </strong>
            <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
              يتم تفعيل الحسابات وتوليد أكواد الدخول المعتمدة حصرياً من خلال المعلم عبر الواتساب.
            </p>
          </div>
          <a href="https://wa.me/966549724510?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%A3%D8%B3%D8%AA%D8%A7%D8%B0%D9%8A%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%20%D9%88%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%20%D9%81%D9%8A%20%D9%85%D9%86%D8%B8%D9%88%D9%85%D8%A9%20%D8%A7%D9%84%D8%A2%D9%8A%D9%84%D8%AA%D8%B3." target="_blank" class="btn btn-whatsapp" style="padding:0.6rem 1.25rem;">
            <span>💬</span> تفعيل الحساب عبر الواتساب
          </a>
        </div>
      </div>
    `;

    const loginInput = document.getElementById('portal-login-input');
    const loginBtn = document.getElementById('portal-login-btn');
    const loginErr = document.getElementById('portal-login-error');

    async function handlePortalLogin() {
      const code = loginInput.value.trim();
      if (!code) {
        loginInput.focus();
        return;
      }
      loginBtn.textContent = 'جاري التحقق...';
      loginErr.style.display = 'none';

      try {
        await loginWithCode(code);
        renderStudentDashboard();
      } catch (err) {
        loginBtn.textContent = 'دخول حسابي 🚀';
        loginErr.style.display = 'block';
        loginErr.textContent = err.message || 'كود الدخول غير صحيح أو غير مسجل.';
      }
    }

    loginBtn?.addEventListener('click', handlePortalLogin);
    loginInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handlePortalLogin();
    });

    return;
  }

  // 1.5. If logged in BUT status === 'pending' -> Render Exclusive Activation Screen
  if (activeStudent.status === 'pending') {
    container.innerHTML = `
      <div class="student-portal-login-card" style="border: 2px dashed #f59e0b; background: rgba(245, 158, 11, 0.04); max-width: 620px;">
        <div style="width:75px; height:75px; margin:0 auto 1.25rem; border-radius:50%; background:rgba(245, 158, 11, 0.15); display:flex; align-items:center; justify-content:center; font-size:2.2rem; border:2px solid #f59e0b;">
          ⏳
        </div>
        
        <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem;">
          أهلاً بك يا ${activeStudent.name} 👋
        </h2>
        <p style="color:var(--text-secondary); font-size:0.92rem; margin-bottom:1.5rem;">
          تم تسجيل دخولك بنجاح${activeStudent.email ? ` عبر Google (${activeStudent.email})` : ''}.
        </p>

        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.5rem; margin-bottom:1.5rem; text-align:right; box-shadow:var(--shadow-sm);">
          <div style="color:#f59e0b; font-weight:800; font-size:1rem; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
            <span>🔒</span> حسابك بانتظار إدخال كود التفعيل
          </div>
          <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.65; margin-bottom:1.25rem;">
            تم حظر محاكي تقييم المقالات مؤقتاً حتى تقوم بتأكيد اشتراكك وإدخال <strong>كود التفعيل</strong> الذي يرسله لك المعلم عبر الواتساب.
          </p>

          <div style="margin-bottom:1.25rem; background:var(--bg-card-subtle); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:0.4rem;">
              1️⃣ تواصل مع المعلم لاستلام كود التفعيل:
            </div>
            <a href="https://wa.me/966549724510?text=${encodeURIComponent(`مرحباً أستاذي، قمت بالتسجيل عبر Google باسم (${activeStudent.name}) وبريد (${activeStudent.email || ''}). أود استلام كود التفعيل الخاص بي في منصة الآيلتس.`)}" target="_blank" class="btn btn-whatsapp" style="display:inline-flex; width:100%; justify-content:center; gap:0.5rem; padding:0.65rem 1rem;">
              <span>💬</span> مراسلة المعلم عبر الواتساب (966549724510)
            </a>
          </div>

          <div>
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:0.4rem;">
              2️⃣ أدخل كود التفعيل الذي أرسله لك المعلم:
            </div>
            <div style="display:flex; gap:0.5rem;">
              <input type="text" id="pending-activation-code-input" class="form-input" placeholder="مثال: IELTS-4098" style="font-family:monospace; font-weight:700; font-size:1.05rem; text-align:center;">
              <button id="pending-activate-btn" class="btn btn-primary" style="white-space:nowrap; padding:0.6rem 1.4rem;">تفعيل الحساب الآن 🚀</button>
            </div>
            <div id="pending-activation-error" style="color:var(--danger); font-size:0.85rem; margin-top:0.5rem; display:none; font-weight:600;"></div>
          </div>
        </div>

        <button id="pending-logout-btn" class="btn btn-secondary btn-sm" style="gap:0.4rem; padding:0.5rem 1.25rem;">
          <span>🚪</span> تسجيل الخروج من هذا الحساب
        </button>
      </div>
    `;

    document.getElementById('pending-logout-btn')?.addEventListener('click', () => {
      logoutStudent();
    });

    const actBtn = document.getElementById('pending-activate-btn');
    const actInput = document.getElementById('pending-activation-code-input');
    const actErr = document.getElementById('pending-activation-error');

    async function handleActivation() {
      const code = actInput?.value.trim();
      if (!code) {
        if (actErr) { actErr.style.display = 'block'; actErr.textContent = 'يرجى كتابة كود التفعيل أولاً.'; }
        return;
      }
      actBtn.disabled = true;
      actBtn.textContent = 'جاري التفعيل...';
      if (actErr) actErr.style.display = 'none';

      try {
        await activateStudentAccount(code);
        alert('🎉 تهانينا! تم تفعيل حسابك بنجاح. تم فتح محاكي التقييم وتشخيص الأخطاء بالكامل.');
      } catch (e) {
        actBtn.disabled = false;
        actBtn.textContent = 'تفعيل الحساب الآن 🚀';
        if (actErr) {
          actErr.style.display = 'block';
          actErr.textContent = e.message || 'كود التفعيل غير مطابق.';
        }
      }
    }

    actBtn?.addEventListener('click', handleActivation);
    actInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleActivation();
    });

    return;
  }

  // 2. If student is logged in and active -> Render Personal Dashboard
  container.innerHTML = `
    <div style="text-align:center; padding:4rem 2rem;">
      <div class="spinner" style="margin:0 auto 1rem;"></div>
      <p style="color:var(--text-muted);">جاري تحميل ملفك الأكاديمي وبصمة أخطائك...</p>
    </div>
  `;

  try {
    const data = await fetchStudentDetails(activeStudent.id);
    let { student, essays = [], scoreHistory = [], mistakeProfile = {} } = data;

    // Cache merge for instant local updates
    try {
      const localEssays = JSON.parse(localStorage.getItem(`ielts_cache_essays_${activeStudent.id}`) || '[]');
      for (const loc of localEssays) {
        if (!essays.some(e => e.id === loc.id)) essays.unshift(loc);
      }
    } catch (e) {}

    // Target Band Logic
    const currentBand = Number(student.latest_band) || (essays.length > 0 ? Number(essays[0].feedback?.scores?.overall_band || 5.5) : 5.5);
    const savedTarget = localStorage.getItem(`ielts_target_band_${activeStudent.id}`) || '7.5';
    let targetBand = parseFloat(savedTarget);

    const bandGap = (targetBand - currentBand).toFixed(1);
    const progressPercent = Math.min(100, Math.max(15, Math.round((currentBand / targetBand) * 100)));

    // Criteria Averages
    let avgTR = 0, avgCC = 0, avgLR = 0, avgGRA = 0;
    if (essays.length > 0) {
      let count = 0;
      essays.forEach(e => {
        const sc = e.feedback?.scores;
        if (sc) {
          avgTR += Number(sc.task_achievement_or_response?.band || 0);
          avgCC += Number(sc.coherence_cohesion?.band || 0);
          avgLR += Number(sc.lexical_resource?.band || 0);
          avgGRA += Number(sc.grammatical_range_accuracy?.band || 0);
          count++;
        }
      });
      if (count > 0) {
        avgTR = (avgTR / count).toFixed(1);
        avgCC = (avgCC / count).toFixed(1);
        avgLR = (avgLR / count).toFixed(1);
        avgGRA = (avgGRA / count).toFixed(1);
      }
    } else {
      avgTR = avgCC = avgLR = avgGRA = '0.0';
    }

    // Filter Mistakes
    const allMistakes = mistakeProfile.frequentMistakes || [];
    const filteredMistakes = allMistakes.filter(m => {
      if (activeMistakeFilter === 'all') return true;
      const cat = (m.category || '').toLowerCase();
      if (activeMistakeFilter === 'grammar') return cat.includes('grammar') || cat.includes('قواعد');
      if (activeMistakeFilter === 'vocabulary') return cat.includes('lexical') || cat.includes('vocab') || cat.includes('مفردات');
      if (activeMistakeFilter === 'coherence') return cat.includes('coherence') || cat.includes('تماسك');
      if (activeMistakeFilter === 'task') return cat.includes('task') || cat.includes('مهمة');
      return true;
    });

    const frequentMistakesHtml = filteredMistakes.map(m => `
      <div class="mistake-card ${m.count > 1 ? 'is-recurring' : ''}" style="margin-bottom:0.85rem; background:var(--bg-card); border:1px solid ${m.count > 1 ? 'var(--danger-border)' : 'var(--border-color)'}; border-radius:var(--radius-md); padding:1rem; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; gap:0.4rem; align-items:center;">
            <span class="badge ${m.count > 1 ? 'badge-danger' : 'badge-warning'}" style="font-size:0.75rem;">
              ${m.count > 1 ? `⚠️ متكرر (${m.count} مرات)` : `ظهر مرة واحدة`}
            </span>
            <span class="badge badge-primary" style="font-size:0.72rem;">${m.category}</span>
          </div>
          <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; background:var(--bg-card-subtle); padding:1px 6px; border-radius:4px;">
            ${m.rule_tag}
          </span>
        </div>

        <div style="font-weight:700; margin-bottom:0.4rem; color:var(--text-main); font-size:0.95rem;">
          ${m.rule_friendly_name}
        </div>

        ${m.micro_lesson ? `
          <div style="margin-top:0.6rem; background:var(--primary-light); border:1px solid var(--primary-border); padding:0.65rem 0.85rem; border-radius:var(--radius-sm); font-size:0.85rem; color:var(--text-main); line-height:1.5;">
            💡 <strong>القاعدة لتفادي هذا الخطأ:</strong> ${m.micro_lesson}
          </div>
        ` : ''}

        <div style="margin-top:0.75rem; display:flex; justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm practice-rule-btn" data-rule="${encodeURIComponent(m.rule_friendly_name)}" data-tag="${m.rule_tag}" style="font-size:0.78rem; padding:0.3rem 0.65rem;">
            ✍️ تدرب على تفادي هذا الخطأ في محاكي الامتحان
          </button>
        </div>
      </div>
    `).join('') || `
      <div style="text-align:center; padding:3rem 1.5rem; color:var(--text-muted); background:var(--bg-card-subtle); border-radius:var(--radius-md);">
        <span style="font-size:2rem; display:block; margin-bottom:0.5rem;">🎯</span>
        لا توجد أخطاء مرصودة في هذا التصنيف حالياً. ممتاز!
      </div>
    `;

    // Filter Essays
    const filteredEssays = essays.filter(ess => {
      if (activeEssayTypeFilter === 'all') return true;
      if (activeEssayTypeFilter === 'task_2') return ess.task_type === 'task_2';
      if (activeEssayTypeFilter === 'task_1') return ess.task_type.includes('task_1');
      return true;
    });

    const essayHistoryRows = filteredEssays.map((ess, idx) => `
      <tr style="border-bottom: 1px solid var(--border-color); font-size:0.88rem;">
        <td style="padding:0.75rem 0.6rem; font-weight:700; color:var(--text-muted);">#${filteredEssays.length - idx}</td>
        <td style="padding:0.75rem 0.6rem;">${new Date(ess.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</td>
        <td style="padding:0.75rem 0.6rem; text-transform:capitalize;">
          <span class="badge badge-secondary" style="font-size:0.75rem;">${ess.task_type.replace(/_/g, ' ')}</span>
        </td>
        <td style="padding:0.75rem 0.6rem;">${ess.word_count} كلمة</td>
        <td style="padding:0.75rem 0.6rem;">
          <strong style="color:var(--primary); font-size:1.05rem;">Band ${ess.feedback?.scores?.overall_band || '-'}</strong>
        </td>
        <td style="padding:0.75rem 0.6rem;">
          <button class="btn btn-primary btn-sm view-essay-btn" data-id="${ess.id}" style="font-size:0.8rem; padding:0.35rem 0.75rem;">
            عرض التقرير 👁️
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">لم يتم إرسال أي مقال في هذا التصنيف بعد.</td></tr>';

    // Interactive Score Progression Chart (SVG)
    const recentScores = [...essays].reverse().slice(-7);
    let chartSvg = '';
    if (recentScores.length > 1) {
      const points = recentScores.map((e, i) => {
        const x = 30 + (i * (360 / Math.max(1, recentScores.length - 1)));
        const band = Number(e.feedback?.scores?.overall_band || 5);
        const y = 140 - ((band - 4) * 20);
        return { x, y, band, id: e.id, date: new Date(e.created_at).toLocaleDateString('ar-EG', { month:'short', day:'numeric' }) };
      });

      const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
      const dotsSvg = points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="6" fill="var(--primary)" stroke="var(--bg-card)" stroke-width="2" class="chart-dot" data-id="${p.id}" style="cursor:pointer;">
          <title>Band ${p.band} (${p.date})</title>
        </circle>
        <text x="${p.x}" y="${p.y - 10}" font-size="10" font-weight="700" fill="var(--text-main)" text-anchor="middle">${p.band}</text>
        <text x="${p.x}" y="155" font-size="9" fill="var(--text-muted)" text-anchor="middle">${p.date}</text>
      `).join('');

      chartSvg = `
        <div style="padding:1rem 0; width:100%; overflow-x:auto;">
          <svg viewBox="0 0 420 165" style="width:100%; max-height:165px; display:block;">
            <line x1="20" y1="40" x2="400" y2="40" stroke="var(--border-color)" stroke-dasharray="3 3" />
            <text x="15" y="44" font-size="9" fill="var(--text-muted)" text-anchor="end">9.0</text>
            <line x1="20" y1="80" x2="400" y2="80" stroke="var(--border-color)" stroke-dasharray="3 3" />
            <text x="15" y="84" font-size="9" fill="var(--text-muted)" text-anchor="end">7.0</text>
            <line x1="20" y1="120" x2="400" y2="120" stroke="var(--border-color)" stroke-dasharray="3 3" />
            <text x="15" y="124" font-size="9" fill="var(--text-muted)" text-anchor="end">5.0</text>
            <polyline fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
            ${dotsSvg}
          </svg>
        </div>
      `;
    } else {
      chartSvg = `
        <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.88rem;">
          📈 اكتب وقيم مقالين على الأقل لرسم منحنى تطور مستواك الأكاديمي تلقائياً!
        </div>
      `;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.75rem;">
        
        <!-- Header Student Profile Card -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem 1.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.25rem; box-shadow:var(--shadow-sm);">
          <div style="display:flex; align-items:center; gap:1rem;">
            <div style="width:54px; height:54px; border-radius:50%; background:linear-gradient(135deg, var(--primary), #1d4ed8); color:white; font-size:1.5rem; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(37,99,235,0.25);">
              ${(student.name || 'S').trim().substring(0, 1).toUpperCase()}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-main);">${student.name}</h2>
                <span class="badge ${student.status === 'active' ? 'badge-success' : 'badge-danger'}" style="font-size:0.75rem;">
                  ${student.status === 'active' ? '✅ حساب مفعل' : '⏳ بانتظار التفعيل'}
                </span>
              </div>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                كود الحساب الخاص: <strong style="font-family:monospace; color:var(--primary); font-size:0.95rem;">${student.access_code || student.id}</strong>
              </p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap;">
            <div style="display:flex; gap:1.25rem; background:var(--bg-card-subtle); padding:0.75rem 1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <div style="text-align:center;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">المقالات المكتوبة</span>
                <strong style="font-size:1.45rem; color:var(--text-main); font-weight:800;">${student.essay_count || essays.length}</strong>
              </div>
              <div style="text-align:center; border-right:1px solid var(--border-color); padding-right:1.25rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">آخر نتيجة</span>
                <strong style="font-size:1.45rem; color:var(--primary); font-weight:800;">Band ${currentBand}</strong>
              </div>
              <div style="text-align:center; border-right:1px solid var(--border-color); padding-right:1.25rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">أعلى باند</span>
                <strong style="font-size:1.45rem; color:var(--success); font-weight:800;">Band ${student.highest_band || currentBand}</strong>
              </div>
            </div>

            <button id="student-logout-in-profile-btn" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:0.35rem; color:var(--danger); border-color:var(--danger-border);">
              <span>🚪</span> تسجيل الخروج
            </button>
          </div>
        </div>

        <!-- 2026 Interactive Target Goal Slider -->
        <div class="target-band-slider-card">
          <div class="target-band-header">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                <span style="color:var(--primary);">${icons.target}</span>
                <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin:0;">
                  اسلايدر تحديد هدف الباند (Interactive Band Target Slider)
                </h3>
              </div>
              <p style="font-size:0.84rem; color:var(--text-muted); margin:0;">
                حرّك شريط التمرير لاختيار الباند المستهدف وتحديث متطلبات كامبريدج فورياً:
              </p>
            </div>

            <div class="target-band-badge" id="target-band-display-badge">
              <span style="display:inline-flex; align-items:center; gap:0.35rem;">
                ${icons.sparkles}
                <span>الهدف: Band <strong id="target-band-display-val">${targetBand.toFixed(1)}</strong></span>
              </span>
            </div>
          </div>

          <div class="range-slider-wrapper">
            <input type="range" class="modern-range-slider" id="band-target-range-slider" min="6.0" max="9.0" step="0.5" value="${targetBand}">
            <div class="range-slider-ticks">
              <span data-val="6.0" class="${targetBand === 6.0 ? 'active' : ''}">6.0</span>
              <span data-val="6.5" class="${targetBand === 6.5 ? 'active' : ''}">6.5</span>
              <span data-val="7.0" class="${targetBand === 7.0 ? 'active' : ''}">7.0</span>
              <span data-val="7.5" class="${targetBand === 7.5 ? 'active' : ''}">7.5</span>
              <span data-val="8.0" class="${targetBand === 8.0 ? 'active' : ''}">8.0</span>
              <span data-val="8.5" class="${targetBand === 8.5 ? 'active' : ''}">8.5</span>
              <span data-val="9.0" class="${targetBand === 9.0 ? 'active' : ''}">9.0</span>
            </div>
          </div>

          <div style="margin:1rem 0 0.75rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.4rem;">
              <span>المستوى الحالي: <strong style="color:var(--text-main);">Band ${currentBand}</strong></span>
              <span style="color:var(--primary);" id="target-progress-text">نسبة تحقيق الهدف: <strong>${progressPercent}%</strong></span>
            </div>
            <div style="width:100%; height:12px; background:var(--bg-card-subtle); border-radius:var(--radius-full); overflow:hidden; border:1px solid var(--border-color);">
              <div id="target-progress-bar" style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--success)); border-radius:var(--radius-full); transition:width 0.3s cubic-bezier(0.16, 1, 0.3, 1);"></div>
            </div>
          </div>

          <div id="target-band-info-box" style="background:var(--primary-light); border:1px solid var(--primary-border); padding:0.85rem 1rem; border-radius:var(--radius-md); font-size:0.88rem; color:var(--text-main); display:flex; align-items:center; gap:0.6rem;">
            <span style="color:var(--primary);">${icons.brain}</span>
            <div id="target-band-info-text">
              ${bandGap <= 0 
                ? '<strong>رائع جداً!</strong> لقد حققت الدرجة المطلوبة أو تجاوزتها! واصل المحافظة على ثباتك في الأداء الأكاديمي.' 
                : `<strong>الفارق المطلوب: +${bandGap} Band.</strong> للوصول إلى هذا الباند، ركز على معالجة الأخطاء المتكررة وتطبيق التراكيب المعقدة.`}
            </div>
          </div>
        </div>

        <!-- 2 Columns: 4-Criteria Diagnostic & Historical Chart -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
            <h3 style="font-size:1.05rem; font-weight:800; margin-bottom:0.35rem; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
              <span>⚡</span> متوسط درجات المعايير الأربعة (Cambridge Rubrics)
            </h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.25rem;">متوسط أدائك عبر كافة مقالاتك المصححة:</p>

            <div style="display:flex; flex-direction:column; gap:1rem;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
                  <span>Task Response / Achievement (TR/TA)</span>
                  <span style="color:var(--primary);">Band ${avgTR}</span>
                </div>
                <div style="width:100%; height:8px; background:var(--bg-card-subtle); border-radius:var(--radius-full); overflow:hidden;">
                  <div style="width:${Math.min(100, (avgTR / 9) * 100)}%; height:100%; background:var(--primary);"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
                  <span>Coherence & Cohesion (CC)</span>
                  <span style="color:var(--primary);">Band ${avgCC}</span>
                </div>
                <div style="width:100%; height:8px; background:var(--bg-card-subtle); border-radius:var(--radius-full); overflow:hidden;">
                  <div style="width:${Math.min(100, (avgCC / 9) * 100)}%; height:100%; background:var(--primary);"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
                  <span>Lexical Resource (LR)</span>
                  <span style="color:var(--primary);">Band ${avgLR}</span>
                </div>
                <div style="width:100%; height:8px; background:var(--bg-card-subtle); border-radius:var(--radius-full); overflow:hidden;">
                  <div style="width:${Math.min(100, (avgLR / 9) * 100)}%; height:100%; background:var(--primary);"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
                  <span>Grammatical Range & Accuracy (GRA)</span>
                  <span style="color:var(--primary);">Band ${avgGRA}</span>
                </div>
                <div style="width:100%; height:8px; background:var(--bg-card-subtle); border-radius:var(--radius-full); overflow:hidden;">
                  <div style="width:${Math.min(100, (avgGRA / 9) * 100)}%; height:100%; background:var(--primary);"></div>
                </div>
              </div>
            </div>
          </div>

          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
            <h3 style="font-size:1.05rem; font-weight:800; margin-bottom:0.35rem; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
              <span>📈</span> منحنى تطور الدرجات (Score Progression)
            </h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">تطور نتيجتك الإجمالية عبر المقالات السابقة:</p>
            ${chartSvg}
          </div>
        </div>

        <!-- Chronic Mistakes DNA Section -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem 1.75rem; box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
                <span>🧬</span> بصمة أخطائك المتكررة (Chronic Mistakes DNA)
              </h3>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                خوارزمية ذكية تحلل هفواتك النحوية والمفرداتية التي تكررت عبر مقالاتك مع قواعد علاجها:
              </p>
            </div>

            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              <button class="mistake-filter-btn ${activeMistakeFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding:0.3rem 0.75rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.78rem; font-weight:700; cursor:pointer; background:${activeMistakeFilter === 'all' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeMistakeFilter === 'all' ? '#fff' : 'var(--text-main)'};">
                كافة الأخطاء (${allMistakes.length})
              </button>
              <button class="mistake-filter-btn ${activeMistakeFilter === 'grammar' ? 'active' : ''}" data-filter="grammar" style="padding:0.3rem 0.75rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.78rem; font-weight:700; cursor:pointer; background:${activeMistakeFilter === 'grammar' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeMistakeFilter === 'grammar' ? '#fff' : 'var(--text-main)'};">
                قواعد نحوية
              </button>
              <button class="mistake-filter-btn ${activeMistakeFilter === 'vocabulary' ? 'active' : ''}" data-filter="vocabulary" style="padding:0.3rem 0.75rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.78rem; font-weight:700; cursor:pointer; background:${activeMistakeFilter === 'vocabulary' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeMistakeFilter === 'vocabulary' ? '#fff' : 'var(--text-main)'};">
                مفردات ولغة
              </button>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${frequentMistakesHtml}
          </div>
        </div>

        <!-- Evaluated Essays History -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem 1.75rem; box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
                <span>📚</span> أرشيف مقالاتك المصححة (${essays.length})
              </h3>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                استعرض أي مقال سابق وتقارير الفاحص المفصلة:
              </p>
            </div>

            <div style="display:flex; gap:0.35rem;">
              <button class="essay-filter-btn ${activeEssayTypeFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeEssayTypeFilter === 'all' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeEssayTypeFilter === 'all' ? '#fff' : 'var(--text-main)'};">
                الكل (${essays.length})
              </button>
              <button class="essay-filter-btn ${activeEssayTypeFilter === 'task_2' ? 'active' : ''}" data-filter="task_2" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeEssayTypeFilter === 'task_2' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeEssayTypeFilter === 'task_2' ? '#fff' : 'var(--text-main)'};">
                Task 2 فقط
              </button>
              <button class="essay-filter-btn ${activeEssayTypeFilter === 'task_1' ? 'active' : ''}" data-filter="task_1" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeEssayTypeFilter === 'task_1' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeEssayTypeFilter === 'task_1' ? '#fff' : 'var(--text-main)'};">
                Task 1 فقط
              </button>
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:right;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); font-size:0.8rem; color:var(--text-muted); background:var(--bg-card-subtle);">
                  <th style="padding:0.6rem;">#</th>
                  <th style="padding:0.6rem;">التاريخ</th>
                  <th style="padding:0.6rem;">المهمة</th>
                  <th style="padding:0.6rem;">الكلمات</th>
                  <th style="padding:0.6rem;">الدرجة</th>
                  <th style="padding:0.6rem;">التقرير</th>
                </tr>
              </thead>
              <tbody>
                ${essayHistoryRows}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Logout from profile button
    document.getElementById('student-logout-in-profile-btn')?.addEventListener('click', () => {
      logoutStudent();
    });

    // 2026 Interactive Target Band Range Slider Listener
    const bandSlider = container.querySelector('#band-target-range-slider');
    const displayVal = container.querySelector('#target-band-display-val');
    const progressBar = container.querySelector('#target-progress-bar');
    const progressText = container.querySelector('#target-progress-text');
    const infoText = container.querySelector('#target-band-info-text');
    const ticks = container.querySelectorAll('.range-slider-ticks span');

    function updateBandSlider(val) {
      const num = parseFloat(val);
      localStorage.setItem(`ielts_target_band_${activeStudent.id}`, num.toFixed(1));
      if (displayVal) displayVal.textContent = num.toFixed(1);
      
      const gap = (num - currentBand).toFixed(1);
      const pct = Math.min(100, Math.max(10, Math.round((currentBand / num) * 100)));
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.innerHTML = `نسبة تحقيق الهدف: <strong>${pct}%</strong>`;
      
      ticks.forEach(t => {
        if (parseFloat(t.getAttribute('data-val')) === num) t.classList.add('active');
        else t.classList.remove('active');
      });

      const descriptors = {
        '6.0': 'Band 6.0 (B2): تغطية الفكرة الرئيسية، لغة جيدة مع بعض الأخطاء غير المعيقة للمعنى.',
        '6.5': 'Band 6.5 (B2+): تماسك منطقي واضح، ثراء لغوي جيد وتنوع في الروابط والجمل المركبة.',
        '7.0': 'Band 7.0 (C1): متطلب أغلب الجامعات، تنوع مرن في التراكيب النحوية ومفردات أكاديمية دقيقة.',
        '7.5': 'Band 7.5 (C1+): درجة متقدمة ممتازة، حجج متطورة بتماسك طبيعي وقلة بالغة في الهفوات.',
        '8.0': 'Band 8.0 (C2): طلاقة شبه أصلية، تنوع استثنائي في التلازم اللفظي والجمل المعقدة.',
        '8.5': 'Band 8.5 (C2 Expert): تمكن استثنائي يقارب المتحدث الأصلي وخلو المقال من أي أخطاء منهجية.',
        '9.0': 'Band 9.0 (C2 Native Mastery): الإتقان المطلق للغة الإنجليزية الأكاديمية وفق معايير كامبريدج.'
      };

      if (infoText) {
        infoText.innerHTML = `<strong>${descriptors[num.toFixed(1)] || ''}</strong><br><span style="font-size:0.82rem; color:var(--text-secondary);">${gap <= 0 ? '✅ لقد حققت الهدف أو تجاوزته!' : `الفارق المتبقي للوصول لهدفك: +${gap} Band.`}</span>`;
      }
    }

    if (bandSlider) {
      bandSlider.addEventListener('input', (e) => updateBandSlider(e.target.value));
    }
    ticks.forEach(t => {
      t.addEventListener('click', () => {
        const val = t.getAttribute('data-val');
        if (bandSlider) {
          bandSlider.value = val;
          updateBandSlider(val);
        }
      });
    });

    // Mistake Filter Listeners
    container.querySelectorAll('.mistake-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeMistakeFilter = btn.getAttribute('data-filter');
        renderStudentDashboard();
      });
    });

    // Essay Type Filter Listeners
    container.querySelectorAll('.essay-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeEssayTypeFilter = btn.getAttribute('data-filter');
        renderStudentDashboard();
      });
    });

    // View Essay Report Listeners
    container.querySelectorAll('.view-essay-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const essayId = btn.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('load-essay-report', { detail: { essayId } }));
      });
    });

    // Practice Rule button
    container.querySelectorAll('.practice-rule-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ruleName = decodeURIComponent(btn.getAttribute('data-rule') || '');
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
          promptInput.value = `Practice Drill: Write a response paying special attention to avoid mistakes related to "${ruleName}".`;
        }
        const editorTabBtn = document.querySelector('.tab-btn[data-tab="editor"]');
        if (editorTabBtn) editorTabBtn.click();
        const essayInput = document.getElementById('essay-input');
        if (essayInput) essayInput.focus();
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="toast toast-error" style="position:static;">فشل تحميل بيانات الطالب: ${err.message}</div>`;
  }
}
