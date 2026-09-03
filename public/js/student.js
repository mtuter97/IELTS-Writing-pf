import { fetchStudentDetails, loginStudentByCode } from './api.js';

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
  } else {
    localStorage.removeItem('ielts_active_student_id');
  }
  updateStudentHeaderUI();
}

export async function initStudentState() {
  try {
    const savedId = localStorage.getItem('ielts_active_student_id');
    if (savedId) {
      try {
        const data = await fetchStudentDetails(savedId);
        if (data && data.student) {
          activeStudent = data.student;
        } else {
          localStorage.removeItem('ielts_active_student_id');
          activeStudent = null;
        }
      } catch (e) {
        // If student not found or deleted
        localStorage.removeItem('ielts_active_student_id');
        activeStudent = null;
      }
    } else {
      activeStudent = null;
    }
  } catch (err) {
    console.warn('Init student state fallback:', err);
    activeStudent = null;
  }

  updateStudentHeaderUI();
  return activeStudent;
}

export function logoutStudent() {
  activeStudent = null;
  localStorage.removeItem('ielts_active_student_id');
  updateStudentHeaderUI();
  window.dispatchEvent(new CustomEvent('student-changed', { detail: null }));
  renderStudentDashboard();
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
    if (avatarEl) avatarEl.textContent = (activeStudent.name || 'S').trim().substring(0, 1).toUpperCase();
    
    if (statusEl) {
      const isActive = activeStudent.status === 'active';
      statusEl.className = `badge ${isActive ? 'badge-success' : 'badge-danger'}`;
      statusEl.textContent = isActive ? 'مفعل' : 'معلق (100$)';
    }

    if (banner) {
      if (activeStudent.status === 'pending') {
        banner.style.display = 'block';
        const waLink = banner.querySelector('.btn-whatsapp');
        if (waLink) {
          const text = encodeURIComponent(`مرحباً أستاذي، أود تفعيل اشتراكي في أداة تقييم الآيلتس (رسوم 100$). اسمي: ${activeStudent.name}، كود الحساب: ${activeStudent.access_code || activeStudent.id}.`);
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
    activeStudent = student;
    localStorage.setItem('ielts_active_student_id', student.id);
    updateStudentHeaderUI();
    window.dispatchEvent(new CustomEvent('student-changed', { detail: student }));
    return student;
  } catch (err) {
    throw err;
  }
}

/**
 * Render Student Academic Portal and Mistake DNA
 */
export async function renderStudentDashboard() {
  const container = document.getElementById('student-profile-content');
  if (!container) return;

  // 1. If not logged in -> Render clean private Portal Landing with Login
  if (!activeStudent) {
    container.innerHTML = `
      <div class="student-portal-login-card">
        <div class="portal-login-icon">🧬</div>
        <h2 style="font-size:1.6rem; font-weight:800; color:var(--text-main); margin-bottom:0.75rem;">
          بوابة الطالب الأكاديمية وبصمة الأخطاء
        </h2>
        <p style="color:var(--text-secondary); font-size:0.95rem; max-width:540px; margin:0 auto 1.75rem; line-height:1.6;">
          أدخل كود الاشتراك الخاص بك (Student Access Code) للوصول إلى سجلك الأكاديمي، متابعة تطور درجات الباند، ورصد بصمة أخطائك المتكررة عبر المقالات.
        </p>

        <div style="background:var(--bg-card-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem; max-width:460px; margin:0 auto 2rem; box-shadow:var(--shadow-sm);">
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
            <span style="font-size:1.8rem; display:block; margin-bottom:0.4rem;">🎯</span>
            <strong style="display:block; color:var(--text-main); font-size:0.95rem; margin-bottom:0.25rem;">متابعة الهدف والباند</strong>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">رسم بياني لتطورك عبر المعايير الأربعة (TR, CC, LR, GRA) نحو الباند المستهدف.</p>
          </div>

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
              هل ترغب في الاشتراك؟ (رسوم التفعيل: 100 دولار)
            </strong>
            <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
              يتم تفعيل الحسابات وتوليد أكواد الدخول حصرياً عبر المعلم بعد سداد الرسوم.
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

  // 2. If student is logged in -> Render Personal Dashboard
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
                  ${student.status === 'active' ? '✅ حساب مفعل' : '⏳ معلق (100$)'}
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

        <!-- Target Goal Tracker -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem 1.75rem; box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                <span>🎯</span> محدد هدف الباند الذكي (IELTS Target Band Tracker)
              </h3>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                حدد درجتك المستهدفة لمتابعة الفجوة المطلوبة والتوصيات الأكاديمية:
              </p>
            </div>

            <div style="display:flex; gap:0.4rem; align-items:center;">
              <span style="font-size:0.8rem; color:var(--text-muted); margin-left:0.25rem;">الهدف:</span>
              ${['6.5', '7.0', '7.5', '8.0', '8.5'].map(b => `
                <button class="target-band-btn ${targetBand === parseFloat(b) ? 'active' : ''}" data-target="${b}" style="padding:0.35rem 0.85rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.82rem; font-weight:700; cursor:pointer; background:${targetBand === parseFloat(b) ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${targetBand === parseFloat(b) ? '#fff' : 'var(--text-main)'}; transition:all 0.15s ease;">
                  Band ${b}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom:0.75rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">
              <span>المستوى الحالي: Band ${currentBand}</span>
              <span style="color:var(--primary);">الهدف: Band ${targetBand} (${progressPercent}%)</span>
            </div>
            <div style="width:100%; height:12px; background:var(--bg-card-subtle); border-radius:var(--radius-full); overflow:hidden; border:1px solid var(--border-color);">
              <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--success)); border-radius:var(--radius-full); transition:width 0.4s ease;"></div>
            </div>
          </div>

          <div style="background:var(--primary-light); border:1px solid var(--primary-border); padding:0.85rem 1rem; border-radius:var(--radius-md); font-size:0.88rem; color:var(--text-main); display:flex; align-items:center; gap:0.6rem;">
            <span style="font-size:1.2rem;">💡</span>
            <div>
              ${bandGap <= 0 
                ? '<strong>رائع جداً!</strong> لقد حققت الدرجة المطلوبة أو تجاوزتها! واصل المحافظة على ثباتك في الأداء الأكاديمي.' 
                : `<strong>الفارق المطلوب: +${bandGap} Band.</strong> للوصول إلى هدفك، ركز على تصحيح الأخطاء المتكررة في قسم بصمة الأخطاء بالأسفل.`}
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

    // Target Band Selector Listener
    container.querySelectorAll('.target-band-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        localStorage.setItem(`ielts_target_band_${activeStudent.id}`, target);
        renderStudentDashboard();
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
