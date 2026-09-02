import { fetchStudents, createStudent, fetchStudentDetails, loginStudentByCode } from './api.js';
export { createStudent };

let activeStudent = null;

export function getActiveStudent() {
  return activeStudent;
}

export async function initStudentState() {
  const students = await fetchStudents();
  const savedId = localStorage.getItem('ielts_active_student_id');

  if (savedId && students.some(s => s.id === savedId)) {
    activeStudent = students.find(s => s.id === savedId);
  } else if (students.length > 0) {
    activeStudent = students[0];
    localStorage.setItem('ielts_active_student_id', activeStudent.id);
  } else {
    // Create initial default student
    activeStudent = await createStudent({ name: 'طالب تجريبي (Demo Student)', status: 'active' });
    localStorage.setItem('ielts_active_student_id', activeStudent.id);
  }

  updateStudentHeaderUI();
  updateSubscriptionBanner();
  return activeStudent;
}

export function updateStudentHeaderUI() {
  const nameEl = document.getElementById('header-student-name');
  const avatarEl = document.getElementById('header-student-avatar');
  const statusBadge = document.getElementById('header-student-status');

  if (nameEl && activeStudent) {
    nameEl.textContent = activeStudent.name;
    const initial = activeStudent.name.trim().charAt(0).toUpperCase();
    if (avatarEl) avatarEl.textContent = initial || 'S';

    if (statusBadge) {
      if (activeStudent.status === 'active') {
        statusBadge.className = 'badge badge-success';
        statusBadge.textContent = '✅ مفعل';
      } else {
        statusBadge.className = 'badge badge-danger';
        statusBadge.textContent = '⏳ بانتظار التفعيل (100$)';
      }
    }
  }

  updateSubscriptionBanner();
}

export function updateSubscriptionBanner() {
  const banner = document.getElementById('subscription-notice-banner');
  if (!banner) return;

  if (!activeStudent || activeStudent.status === 'pending') {
    banner.style.display = 'block';
    const waText = encodeURIComponent(`مرحباً أستاذي، أرغب في الاشتراك وتفعيل حسابي في أداة تصحيح كتابة الآيلتس (IELTS Writing Feedback Tool).
اسم الطالب: ${activeStudent?.name || 'طالب جديد'}
كود الحساب: ${activeStudent?.access_code || activeStudent?.id || 'غير محدد'}
رسوم الاشتراك: 100 دولار`);

    const waBtn = banner.querySelector('.wa-activation-link');
    if (waBtn) {
      waBtn.href = `https://wa.me/966549724510?text=${waText}`;
    }
  } else {
    banner.style.display = 'none';
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

export async function renderStudentDashboard() {
  if (!activeStudent) return;
  const container = document.getElementById('student-profile-content');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:3rem;"><div class="spinner" style="margin:0 auto 1rem;"></div><p>جاري تحميل سجل الطالب ونقاط الضعف...</p></div>';

  try {
    const data = await fetchStudentDetails(activeStudent.id);
    let { student, essays = [], scoreHistory = [], mistakeProfile = {} } = data;

    // Merge with client cache if on Vercel or fresh serverless instance
    try {
      const localEssays = JSON.parse(localStorage.getItem(`ielts_cache_essays_${activeStudent.id}`) || '[]');
      for (const loc of localEssays) {
        if (!essays.some(e => e.id === loc.id)) {
          essays.unshift(loc);
        }
      }
    } catch (e) {}

    const frequentMistakesHtml = (mistakeProfile.frequentMistakes || []).map(m => `
      <div class="mistake-card ${m.count > 1 ? 'is-recurring' : ''}" style="margin-bottom:0.75rem;">
        <div class="mistake-meta">
          <div class="mistake-tags">
            <span class="badge ${m.count > 1 ? 'badge-danger' : 'badge-warning'}">
              ${m.count > 1 ? `⚠️ متكرر (${m.count} مرات)` : `ظهر مرة واحدة`}
            </span>
            <span class="badge badge-primary">${m.category}</span>
          </div>
          <span style="font-size:0.8rem; color:var(--text-muted); font-family:monospace;">${m.rule_tag}</span>
        </div>
        <div style="font-weight:700; margin-bottom:0.35rem; color:var(--text-main); font-size:0.95rem;">
          ${m.rule_friendly_name}
        </div>
        ${m.micro_lesson ? `
          <div class="micro-lesson-box" style="margin-top:0.5rem;">
            <span>💡 <strong>القاعدة للعلاج:</strong> ${m.micro_lesson}</span>
          </div>
        ` : ''}
      </div>
    `).join('') || '<p style="color:var(--text-muted); font-size:0.9rem;">لا توجد أخطاء مسجلة بعد. أرسل مقالك الأول لبدء التحليل!</p>';

    const essayHistoryRows = (essays || []).map((ess, idx) => `
      <tr style="border-bottom: 1px solid var(--border-color); font-size:0.88rem;">
        <td style="padding:0.75rem;">#${essays.length - idx}</td>
        <td style="padding:0.75rem;">${new Date(ess.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</td>
        <td style="padding:0.75rem; text-transform:capitalize;">${ess.task_type.replace(/_/g, ' ')}</td>
        <td style="padding:0.75rem;">${ess.word_count} كلمة</td>
        <td style="padding:0.75rem;"><strong style="color:var(--primary); font-size:1.05rem;">Band ${ess.feedback?.scores?.overall_band || '-'}</strong></td>
        <td style="padding:0.75rem;">
          <button class="btn btn-secondary btn-sm view-essay-btn" data-id="${ess.id}">عرض التقرير</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">لم يتم إرسال أي مقال بعد</td></tr>';

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.75rem;">
        <!-- Overview Card -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">${student.name}</h2>
            <p style="font-size:0.85rem; color:var(--text-muted);">تاريخ البدء: ${new Date(student.created_at).toLocaleDateString('ar-EG')}</p>
          </div>
          <div style="display:flex; gap:1.5rem;">
            <div style="text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">المقالات المكتوبة</span>
              <strong style="font-size:1.4rem; color:var(--text-main);">${student.essay_count || 0}</strong>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">آخر باند</span>
              <strong style="font-size:1.4rem; color:var(--primary);">${student.latest_band ? 'Band ' + student.latest_band : '-'}</strong>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">أعلى باند</span>
              <strong style="font-size:1.4rem; color:var(--success);">${student.highest_band ? 'Band ' + student.highest_band : '-'}</strong>
            </div>
          </div>
        </div>

        <!-- Two Columns: Mistake DNA & History -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
          <!-- Left: Mistake DNA -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <h3 style="font-size:1.1rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
                🧬 بصمة الأخطاء والقواعد المستهدفة
              </h3>
              <span class="badge badge-danger">${mistakeProfile.totalMistakes || 0} خطأ مسجل</span>
            </div>
            <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1rem;">
              هنا يتم رصد الأخطاء التي تكررت في مقالاتك مع التوصية بالقاعدة النحوية لتجنبها:
            </p>
            <div style="max-height: 460px; overflow-y:auto; padding-right:4px;">
              ${frequentMistakesHtml}
            </div>
          </div>

          <!-- Right: Past Essays Table -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <h3 style="font-size:1.1rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
                📜 سجل المقالات السابقة
              </h3>
              <span class="badge badge-primary">${essays.length} مقال</span>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; text-align:right;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border-color); font-size:0.8rem; color:var(--text-muted);">
                    <th style="padding:0.6rem;">#</th>
                    <th style="padding:0.6rem;">التاريخ</th>
                    <th style="padding:0.6rem;">المهمة</th>
                    <th style="padding:0.6rem;">الكلمات</th>
                    <th style="padding:0.6rem;">الدرجة</th>
                    <th style="padding:0.6rem;">إجراء</th>
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

    // Attach listeners to view buttons
    container.querySelectorAll('.view-essay-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const essayId = btn.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('load-essay-report', { detail: { essayId } }));
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="toast toast-error" style="position:static;">فشل تحميل بيانات الطالب: ${err.message}</div>`;
  }
}
