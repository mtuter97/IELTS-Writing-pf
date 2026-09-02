import { fetchStudents, fetchStudentDetails, createStudent as apiCreateStudent } from './api.js';

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
  }
  updateStudentHeaderUI();
}

export async function initStudentState() {
  try {
    const students = await fetchStudents();
    const savedId = localStorage.getItem('ielts_active_student_id');
    
    if (savedId) {
      const found = students.find(s => s.id === savedId);
      if (found) {
        activeStudent = found;
      }
    }

    if (!activeStudent && students.length > 0) {
      activeStudent = students[0];
      localStorage.setItem('ielts_active_student_id', activeStudent.id);
    }

    updateStudentHeaderUI();
    return activeStudent;
  } catch (err) {
    console.warn('Failed to load students:', err);
    return null;
  }
}

export function updateStudentHeaderUI() {
  const nameEl = document.getElementById('header-student-name');
  const avatarEl = document.getElementById('header-student-avatar');
  const statusEl = document.getElementById('header-student-status');

  if (activeStudent) {
    if (nameEl) nameEl.textContent = activeStudent.name;
    if (avatarEl) avatarEl.textContent = (activeStudent.name || 'S').trim().substring(0, 1).toUpperCase();
    if (statusEl) {
      const isActive = activeStudent.status === 'active';
      statusEl.className = `badge ${isActive ? 'badge-success' : 'badge-danger'}`;
      statusEl.textContent = isActive ? 'مفعل' : 'معلق (100$)';
    }

    // Toggle Subscription Banner visibility
    const banner = document.getElementById('subscription-notice-banner');
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
    if (nameEl) nameEl.textContent = 'تسجيل الدخول';
    if (avatarEl) avatarEl.textContent = '?';
    if (statusEl) statusEl.textContent = 'غير مسجل';
  }
}

export async function loginWithCode(code) {
  try {
    const res = await fetch('/api/students/login-by-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!data.success || !data.student) {
      throw new Error(data.error || 'لم يتم العثور على طالب بهذا الكود.');
    }
    const student = data.student;
    activeStudent = student;
    localStorage.setItem('ielts_active_student_id', student.id);
    updateStudentHeaderUI();
    window.dispatchEvent(new CustomEvent('student-changed', { detail: student }));
    return student;
  } catch (err) {
    throw err;
  }
}

export async function switchStudent(studentId) {
  const students = await fetchStudents();
  const found = students.find(s => s.id === studentId);
  if (found) {
    activeStudent = found;
    localStorage.setItem('ielts_active_student_id', found.id);
    updateStudentHeaderUI();
    return found;
  }
  return null;
}

export async function renderStudentModalList() {
  const listContainer = document.getElementById('modal-student-list');
  if (!listContainer) return;

  const students = await fetchStudents();
  listContainer.innerHTML = '';

  students.forEach(s => {
    const item = document.createElement('div');
    item.className = `student-list-item ${s.id === activeStudent?.id ? 'active' : ''}`;
    item.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; border: 1px solid var(--border-color);
      border-radius: var(--radius-md); margin-bottom: 0.5rem; cursor: pointer;
      background: ${s.id === activeStudent?.id ? 'var(--primary-light)' : 'var(--bg-card)'};
      transition: all 0.2s ease;
    `;
    const isStudentActive = s.status === 'active';
    item.innerHTML = `
      <div>
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
          <strong style="font-size:0.95rem; color:var(--text-main);">${s.name}</strong>
          <span style="font-family:monospace; font-size:0.75rem; background:var(--bg-card-subtle); padding:1px 6px; border-radius:4px; border:1px solid var(--border-color); color:var(--primary); font-weight:700;">
            ${s.access_code || s.id}
          </span>
          <span class="badge ${isStudentActive ? 'badge-success' : 'badge-danger'}" style="font-size:0.7rem;">
            ${isStudentActive ? 'مفعل' : 'معلق (100$)'}
          </span>
        </div>
        <span style="font-size:0.78rem; color:var(--text-muted);">المقالات: ${s.essay_count || 0} | أعلى باند: ${s.highest_band ? 'Band ' + s.highest_band : 'غير مقيم'}</span>
      </div>
      ${s.id === activeStudent?.id ? '<span class="badge badge-primary">نشط الآن</span>' : '<button class="btn btn-secondary btn-sm select-btn">اختيار</button>'}
    `;

    item.addEventListener('click', async (e) => {
      await switchStudent(s.id);
      document.getElementById('student-modal').classList.remove('open');
      renderStudentModalList();
      window.dispatchEvent(new CustomEvent('student-changed', { detail: s }));
    });

    listContainer.appendChild(item);
  });
}

/**
 * Highly Interactive Student Learning & Performance Dashboard
 */
export async function renderStudentDashboard() {
  if (!activeStudent) return;
  const container = document.getElementById('student-profile-content');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:4rem 2rem;">
      <div class="spinner" style="margin:0 auto 1rem;"></div>
      <p style="color:var(--text-muted);">جاري تحميل سجل وبصمة أخطاء الطالب التفاعلية...</p>
    </div>
  `;

  try {
    const data = await fetchStudentDetails(activeStudent.id);
    let { student, essays = [], scoreHistory = [], mistakeProfile = {} } = data;

    // Merge with client cache for seamless instant feedback
    try {
      const localEssays = JSON.parse(localStorage.getItem(`ielts_cache_essays_${activeStudent.id}`) || '[]');
      for (const loc of localEssays) {
        if (!essays.some(e => e.id === loc.id)) {
          essays.unshift(loc);
        }
      }
    } catch (e) {}

    // Target Band Logic
    const currentBand = Number(student.latest_band) || (essays.length > 0 ? Number(essays[0].feedback?.scores?.overall_band || 5.5) : 5.5);
    const savedTarget = localStorage.getItem(`ielts_target_band_${activeStudent.id}`) || '7.5';
    let targetBand = parseFloat(savedTarget);

    const bandGap = (targetBand - currentBand).toFixed(1);
    const progressPercent = Math.min(100, Math.max(15, Math.round((currentBand / targetBand) * 100)));

    // Calculate Criteria Averages from all essays
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
      <div class="mistake-card ${m.count > 1 ? 'is-recurring' : ''}" style="margin-bottom:0.85rem; background:var(--bg-card); border:1px solid ${m.count > 1 ? 'var(--danger-border)' : 'var(--border-color)'}; border-radius:var(--radius-md); padding:1rem; box-shadow:var(--shadow-sm); transition:transform 0.15s ease;">
        <div class="mistake-meta" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
          <div class="mistake-tags" style="display:flex; gap:0.4rem; align-items:center;">
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
          <div class="micro-lesson-box" style="margin-top:0.6rem; background:var(--primary-light); border:1px solid var(--primary-border); padding:0.65rem 0.85rem; border-radius:var(--radius-sm); font-size:0.85rem; color:var(--text-main); line-height:1.5;">
            💡 <strong>القاعدة لعلاج الخطأ:</strong> ${m.micro_lesson}
          </div>
        ` : ''}

        <div style="margin-top:0.75rem; display:flex; justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm practice-rule-btn" data-rule="${encodeURIComponent(m.rule_friendly_name)}" data-tag="${m.rule_tag}" style="font-size:0.78rem; padding:0.3rem 0.65rem;">
            ✍️ تدرب على تفادي هذا الخطأ
          </button>
        </div>
      </div>
    `).join('') || `
      <div style="text-align:center; padding:3rem 1.5rem; color:var(--text-muted); background:var(--bg-card-subtle); border-radius:var(--radius-md);">
        <span style="font-size:2rem; display:block; margin-bottom:0.5rem;">🎯</span>
        لا توجد أخطاء مرصودة في هذا التصنيف. أرسل مقالك لبدء الفحص التشخيصي!
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
      <tr style="border-bottom: 1px solid var(--border-color); font-size:0.88rem; transition: background 0.15s ease;">
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
        // map band 4.0 -> y=120, band 9.0 -> y=20
        const y = 140 - ((band - 4) * 20);
        return { x, y, band, id: e.id, date: new Date(e.created_at).toLocaleDateString('ar-EG', { month:'short', day:'numeric' }) };
      });

      const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
      const dotsSvg = points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="6" fill="var(--primary)" stroke="var(--bg-card)" stroke-width="2" class="chart-dot" data-id="${p.id}" style="cursor:pointer; transition:r 0.2s ease;">
          <title>Band ${p.band} (${p.date})</title>
        </circle>
        <text x="${p.x}" y="${p.y - 10}" font-size="10" font-weight="700" fill="var(--text-main)" text-anchor="middle">
          ${p.band}
        </text>
        <text x="${p.x}" y="155" font-size="9" fill="var(--text-muted)" text-anchor="middle">
          ${p.date}
        </text>
      `).join('');

      chartSvg = `
        <div style="padding:1rem 0; width:100%; overflow-x:auto;">
          <svg viewBox="0 0 420 165" style="width:100%; max-height:165px; display:block;">
            <!-- Grid lines -->
            <line x1="20" y1="40" x2="400" y2="40" stroke="var(--border-color)" stroke-dasharray="3 3" />
            <text x="15" y="44" font-size="9" fill="var(--text-muted)" text-anchor="end">9.0</text>
            
            <line x1="20" y1="80" x2="400" y2="80" stroke="var(--border-color)" stroke-dasharray="3 3" />
            <text x="15" y="84" font-size="9" fill="var(--text-muted)" text-anchor="end">7.0</text>
            
            <line x1="20" y1="120" x2="400" y2="120" stroke="var(--border-color)" stroke-dasharray="3 3" />
            <text x="15" y="124" font-size="9" fill="var(--text-muted)" text-anchor="end">5.0</text>
            
            <!-- Trend Line -->
            <polyline fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
            
            <!-- Dots -->
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
                كود الحساب: <strong style="font-family:monospace; color:var(--primary);">${student.access_code || student.id}</strong> | تاريخ التسجيل: ${new Date(student.created_at).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>

          <div style="display:flex; gap:1.5rem; background:var(--bg-card-subtle); padding:0.75rem 1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
            <div style="text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">المقالات المكتوبة</span>
              <strong style="font-size:1.45rem; color:var(--text-main); font-weight:800;">${student.essay_count || essays.length}</strong>
            </div>
            <div style="text-align:center; border-right:1px solid var(--border-color); padding-right:1.25rem;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">آخر نتيجة</span>
              <strong style="font-size:1.45rem; color:var(--primary); font-weight:800;">Band ${currentBand}</strong>
            </div>
            <div style="text-align:center; border-right:1px solid var(--border-color); padding-right:1.25rem;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">أعلى باند محقق</span>
              <strong style="font-size:1.45rem; color:var(--success); font-weight:800;">Band ${student.highest_band || currentBand}</strong>
            </div>
          </div>
        </div>

        <!-- Interactive Target Goal Tracker -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem 1.75rem; box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                <span>🎯</span> محدد هدف الباند الذكي (IELTS Target Band Tracker)
              </h3>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                حدد درجتك المستهدفة في اختبار الآيلتس لمتابعة الفجوة المطلوبة وتوصيات الوصول إليها:
              </p>
            </div>

            <!-- Target Band Pills -->
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <span style="font-size:0.8rem; color:var(--text-muted); margin-left:0.25rem;">الهدف:</span>
              ${['6.5', '7.0', '7.5', '8.0', '8.5'].map(b => `
                <button class="target-band-btn ${targetBand === parseFloat(b) ? 'active' : ''}" data-target="${b}" style="padding:0.35rem 0.85rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.82rem; font-weight:700; cursor:pointer; background:${targetBand === parseFloat(b) ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${targetBand === parseFloat(b) ? '#fff' : 'var(--text-main)'}; transition:all 0.15s ease;">
                  Band ${b}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Progress Bar & Gap Info -->
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
                : `<strong>الفارق المطلوب: +${bandGap} Band.</strong> للوصول إلى هدفك، ركز على تصحيح الأخطاء المتكررة في قسم بصمة الأخطاء بالأسفل وكتابة مقال إضافي هذا الأسبوع.`}
            </div>
          </div>
        </div>

        <!-- 2 Columns: 4-Criteria Diagnostic & Historical Chart -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
          
          <!-- Criteria Skill Breakdown -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
            <h3 style="font-size:1.05rem; font-weight:800; margin-bottom:0.35rem; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
              <span>⚡</span> متوسط درجات المعايير الأربعة (Cambridge Rubrics)
            </h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.25rem;">متوسط أدائك عبر كافة المقالات التي تم تقييمها:</p>

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

          <!-- Score Progression Timeline Chart -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
              <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                <span>📈</span> منحنى تطور الباند عبر المقالات (Score Progression)
              </h3>
              <span style="font-size:0.75rem; color:var(--text-muted);">${essays.length} تقييم</span>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">تتبع مسار تحسن كتابتك مع كل مقال ترسله للفحص:</p>
            ${chartSvg}
          </div>

        </div>

        <!-- 2 Columns: Mistake DNA & Past Essays -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
          
          <!-- Left: Mistake DNA Explorer with Filters -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
              <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                <span>🧬</span> بصمة الأخطاء التراكمية (Mistake DNA)
              </h3>
              <span class="badge badge-danger">${mistakeProfile.totalMistakes || 0} خطأ مرصود</span>
            </div>

            <!-- Mistake Category Filters -->
            <div style="display:flex; gap:0.35rem; margin-bottom:1rem; flex-wrap:wrap;">
              <button class="mistake-filter-btn ${activeMistakeFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeMistakeFilter === 'all' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeMistakeFilter === 'all' ? '#fff' : 'var(--text-main)'};">
                الكل
              </button>
              <button class="mistake-filter-btn ${activeMistakeFilter === 'grammar' ? 'active' : ''}" data-filter="grammar" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeMistakeFilter === 'grammar' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeMistakeFilter === 'grammar' ? '#fff' : 'var(--text-main)'};">
                قواعد (Grammar)
              </button>
              <button class="mistake-filter-btn ${activeMistakeFilter === 'vocabulary' ? 'active' : ''}" data-filter="vocabulary" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeMistakeFilter === 'vocabulary' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeMistakeFilter === 'vocabulary' ? '#fff' : 'var(--text-main)'};">
                مفردات (Lexical)
              </button>
              <button class="mistake-filter-btn ${activeMistakeFilter === 'coherence' ? 'active' : ''}" data-filter="coherence" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeMistakeFilter === 'coherence' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeMistakeFilter === 'coherence' ? '#fff' : 'var(--text-main)'};">
                تماسك (Coherence)
              </button>
            </div>

            <div style="max-height: 480px; overflow-y:auto; padding-right:4px;">
              ${frequentMistakesHtml}
            </div>
          </div>

          <!-- Right: Past Essays Table with Filters -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
              <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                <span>📜</span> سجل مقالاتك السابقة وتقاريرها
              </h3>
              <span class="badge badge-primary">${filteredEssays.length} مقال</span>
            </div>

            <!-- Essay Type Filters -->
            <div style="display:flex; gap:0.35rem; margin-bottom:1rem;">
              <button class="essay-filter-btn ${activeEssayTypeFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeEssayTypeFilter === 'all' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeEssayTypeFilter === 'all' ? '#fff' : 'var(--text-main)'};">
                كافة المهام (${essays.length})
              </button>
              <button class="essay-filter-btn ${activeEssayTypeFilter === 'task_2' ? 'active' : ''}" data-filter="task_2" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeEssayTypeFilter === 'task_2' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeEssayTypeFilter === 'task_2' ? '#fff' : 'var(--text-main)'};">
                Task 2 فقط
              </button>
              <button class="essay-filter-btn ${activeEssayTypeFilter === 'task_1' ? 'active' : ''}" data-filter="task_1" style="padding:0.25rem 0.65rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.75rem; font-weight:700; cursor:pointer; background:${activeEssayTypeFilter === 'task_1' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${activeEssayTypeFilter === 'task_1' ? '#fff' : 'var(--text-main)'};">
                Task 1 فقط
              </button>
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

      </div>
    `;

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

    // Practice Rule button: pre-fill prompt into editor and switch tab!
    container.querySelectorAll('.practice-rule-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ruleName = decodeURIComponent(btn.getAttribute('data-rule') || '');
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
          promptInput.value = `Practice Drill: Write a focused response paying special attention to avoid mistakes related to "${ruleName}".`;
        }
        // Switch to editor tab
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
