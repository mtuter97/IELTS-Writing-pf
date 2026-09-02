import { fetchStudents, createStudent, updateStudentStatus, deleteStudent, verifyAdminPin, fetchSettings, saveSettings } from './api.js';

let isAdminAuthenticated = false;
let adminActiveSubTab = 'students'; // 'students', 'analytics', 'settings'
let studentSearchQuery = '';
let studentStatusFilter = 'all'; // 'all', 'active', 'pending'

export function getIsAdminAuthenticated() {
  return isAdminAuthenticated;
}

export function checkAdminSession() {
  if (sessionStorage.getItem('ielts_admin_auth') === 'true') {
    isAdminAuthenticated = true;
  }
  return isAdminAuthenticated;
}

export async function renderAdminDashboard() {
  const container = document.getElementById('admin-dashboard-content');
  if (!container) return;

  if (!checkAdminSession()) {
    container.innerHTML = `
      <div style="text-align:center; padding:4rem 2rem; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color); max-width:520px; margin:2rem auto; box-shadow:var(--shadow-lg);">
        <div style="width:68px; height:68px; margin:0 auto 1.25rem; background:var(--primary-light); color:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; border:1px solid var(--primary-border);">
          🔐
        </div>
        <h3 style="font-size:1.45rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">لوحة تحكم المعلم والمشرف</h3>
        <p style="color:var(--text-muted); font-size:0.92rem; margin-bottom:1.75rem; line-height:1.6;">
          منطقة آمنة مخصصة للمعلم لإدارة حسابات الطلاب، استخراج الأكواد، ضبط معايير الذكاء الاصطناعي، ومتابعة الاشتراكات (100$).
        </p>
        
        <div style="display:flex; gap:0.5rem; max-width:340px; margin:0 auto 1rem;">
          <input type="password" id="admin-pin-inline-input" class="form-input" placeholder="أدخل رمز PIN السري..." style="text-align:center; font-size:1.1rem; letter-spacing:3px; font-weight:700;">
          <button id="admin-pin-submit-btn" class="btn btn-primary" style="white-space:nowrap; padding:0.6rem 1.25rem;">دخول 🚀</button>
        </div>
        <div id="admin-pin-error" style="color:var(--danger); font-size:0.85rem; display:none; margin-bottom:0.75rem; font-weight:600;"></div>
        <div style="font-size:0.78rem; color:var(--text-muted); background:var(--bg-card-subtle); padding:0.4rem 0.8rem; border-radius:var(--radius-sm); display:inline-block;">
          الرمز الافتراضي: <strong style="color:var(--text-main);">admin123</strong> (يمكن تغييره من الإعدادات بالداخل)
        </div>
      </div>
    `;

    const pinInput = document.getElementById('admin-pin-inline-input');
    const submitBtn = document.getElementById('admin-pin-submit-btn');
    const errDiv = document.getElementById('admin-pin-error');

    async function doLogin() {
      const pin = pinInput.value.trim();
      if (!pin) {
        pinInput.focus();
        return;
      }
      submitBtn.textContent = 'جاري التحقق...';
      try {
        const res = await verifyAdminPin(pin);
        if (res.authorized) {
          isAdminAuthenticated = true;
          sessionStorage.setItem('ielts_admin_auth', 'true');
          renderAdminDashboard();
        }
      } catch (err) {
        submitBtn.textContent = 'دخول 🚀';
        errDiv.style.display = 'block';
        errDiv.textContent = err.message || 'رمز المرور غير صحيح!';
      }
    }

    submitBtn?.addEventListener('click', doLogin);
    pinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
    return;
  }

  container.innerHTML = `
    <div style="text-align:center; padding:4rem 2rem;">
      <div class="spinner" style="margin:0 auto 1rem;"></div>
      <p style="color:var(--text-muted);">جاري تحميل مركز تحكم المعلم الأكاديمي...</p>
    </div>
  `;

  try {
    const students = await fetchStudents();
    const settings = await fetchSettings();
    const activeCount = students.filter(s => s.status === 'active').length;
    const pendingCount = students.filter(s => s.status === 'pending').length;
    const totalEssays = students.reduce((sum, s) => sum + (s.essay_count || 0), 0);
    const subscriptionPrice = settings.subscription_price || 100;
    const collectedRevenue = activeCount * subscriptionPrice;
    const pendingRevenue = pendingCount * subscriptionPrice;
    const conversionRate = students.length > 0 ? Math.round((activeCount / students.length) * 100) : 0;
    const teacherPhone = settings.teacher_whatsapp || '966549724510';

    // Calculate Average Band
    const evaluatedStudents = students.filter(s => s.latest_band > 0);
    const avgBand = evaluatedStudents.length > 0 
      ? (evaluatedStudents.reduce((sum, s) => sum + Number(s.latest_band), 0) / evaluatedStudents.length).toFixed(1)
      : '0.0';

    // Filter Students
    let filteredStudents = students.filter(s => {
      const matchSearch = !studentSearchQuery || 
        (s.name && s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())) ||
        (s.phone && s.phone.includes(studentSearchQuery)) ||
        (s.access_code && s.access_code.toLowerCase().includes(studentSearchQuery.toLowerCase()));

      const matchStatus = studentStatusFilter === 'all' || s.status === studentStatusFilter;
      return matchSearch && matchStatus;
    });

    const rowsHtml = filteredStudents.map((s, idx) => {
      const isActive = s.status === 'active';
      const cleanPhone = (s.phone || '').replace(/[^0-9]/g, '');
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${s.name}، تم إعداد حسابك في أداة تصحيح كتابة الآيلتس. كود الدخول الخاص بك هو: ${s.access_code || s.id}. رابط المنصة: ${window.location.origin}`)}` : null;
      const initials = (s.name || 'S').trim().substring(0, 1).toUpperCase();

      return `
        <tr style="border-bottom: 1px solid var(--border-color); font-size:0.88rem; transition: background 0.15s ease;">
          <td style="padding:0.9rem 0.6rem; font-weight:700; color:var(--text-muted);">#${idx + 1}</td>
          <td style="padding:0.9rem 0.6rem;">
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-light); color:var(--primary); font-weight:800; display:flex; align-items:center; justify-content:center; font-size:0.85rem; border:1px solid var(--primary-border);">
                ${initials}
              </div>
              <div>
                <strong style="display:block; color:var(--text-main); font-size:0.95rem;">${s.name}</strong>
                <span style="font-size:0.75rem; color:var(--text-muted);">${s.phone || 'بدون رقم هاتف'}</span>
              </div>
            </div>
          </td>
          <td style="padding:0.9rem 0.6rem;">
            <div style="display:inline-flex; align-items:center; gap:0.4rem; background:var(--bg-card-subtle); padding:0.25rem 0.65rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
              <span style="font-family:monospace; font-weight:800; color:var(--primary); font-size:0.92rem;">${s.access_code || s.id}</span>
              <button class="copy-code-btn" data-code="${s.access_code || s.id}" title="نسخ الكود" style="background:none; border:none; cursor:pointer; font-size:0.8rem;">📋</button>
            </div>
          </td>
          <td style="padding:0.9rem 0.6rem;">
            <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}" style="font-size:0.75rem; padding:0.25rem 0.6rem;">
              ${isActive ? '✅ مفعل نشط' : '⏳ معلق (100$)'}
            </span>
          </td>
          <td style="padding:0.9rem 0.6rem; font-weight:600;">
            ${s.essay_count || 0} مقال
          </td>
          <td style="padding:0.9rem 0.6rem;">
            <span class="badge badge-primary" style="font-size:0.8rem; font-weight:800;">
              ${s.highest_band ? 'Band ' + s.highest_band : 'غير مقيم'}
            </span>
          </td>
          <td style="padding:0.9rem 0.6rem;">
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              <button class="btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'} toggle-status-btn" data-id="${s.id}" data-current="${s.status}">
                ${isActive ? 'تعليق ⏸️' : 'تفعيل بنقرة ✅'}
              </button>
              <button class="btn btn-sm btn-secondary view-student-file-btn" data-id="${s.id}" title="عرض ملف الطالب وسجل مقالاته ونتائجه الكاملة">
                📂 ملف النتائج
              </button>
              <button class="btn btn-sm btn-secondary download-student-file-btn" data-id="${s.id}" data-name="${s.name}" title="تنزيل ملف الطالب كاملاً كـ JSON">
                ⬇️
              </button>
              ${waLink ? `
                <a href="${waLink}" target="_blank" class="btn btn-sm" style="background:#25D366; color:white; display:inline-flex; align-items:center; gap:0.25rem;" title="مراسلة الطالب بالبيانات عبر الواتساب">
                  <span>💬</span> واتساب
                </a>
              ` : ''}
              <button class="btn btn-sm btn-secondary delete-student-btn" data-id="${s.id}" data-name="${s.name}" title="حذف" style="color:var(--danger);">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" style="text-align:center; padding:3rem; color:var(--text-muted); font-size:0.95rem;">لا توجد نتائج تطابق بحثك الحالي.</td></tr>';

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.75rem;">
        
        <!-- Admin Header Bar -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem 1.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; box-shadow:var(--shadow-sm);">
          <div>
            <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.25rem;">
              <span style="font-size:1.5rem;">🛡️</span>
              <h2 style="font-size:1.35rem; font-weight:800; color:var(--text-main);">مركز تحكم المعلم الأكاديمي (Teacher Suite)</h2>
              <span class="badge badge-success" style="font-size:0.75rem;">● متصل بالنظام</span>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted);">
              إدارة تفعيل حسابات الطلاب، استخراج الأكواد، مراقبة الاشتراكات (100$)، وضبط محركات الذكاء الاصطناعي
            </p>
          </div>
          <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
            <button id="open-add-student-modal-btn" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:0.4rem;">
              <span>➕</span> تسجيل طالب جديد
            </button>
            <button id="admin-logout-btn" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:0.3rem;">
              <span>🚪</span> خروج
            </button>
          </div>
        </div>

        <!-- Sub-Navigation Tabs inside Admin -->
        <div style="display:flex; gap:0.5rem; background:var(--bg-card-subtle); padding:0.35rem; border-radius:var(--radius-md); border:1px solid var(--border-color); width:fit-content;">
          <button class="admin-subtab-btn ${adminActiveSubTab === 'students' ? 'active' : ''}" data-subtab="students" style="padding:0.5rem 1.25rem; border:none; border-radius:var(--radius-sm); font-weight:700; font-size:0.88rem; cursor:pointer; background:${adminActiveSubTab === 'students' ? 'var(--bg-card)' : 'none'}; color:${adminActiveSubTab === 'students' ? 'var(--primary)' : 'var(--text-muted)'}; box-shadow:${adminActiveSubTab === 'students' ? 'var(--shadow-sm)' : 'none'};">
            👥 دليل وإدارة الطلاب (${students.length})
          </button>
          <button class="admin-subtab-btn ${adminActiveSubTab === 'analytics' ? 'active' : ''}" data-subtab="analytics" style="padding:0.5rem 1.25rem; border:none; border-radius:var(--radius-sm); font-weight:700; font-size:0.88rem; cursor:pointer; background:${adminActiveSubTab === 'analytics' ? 'var(--bg-card)' : 'none'}; color:${adminActiveSubTab === 'analytics' ? 'var(--primary)' : 'var(--text-muted)'}; box-shadow:${adminActiveSubTab === 'analytics' ? 'var(--shadow-sm)' : 'none'};">
            📊 التحليلات المالية والأكاديمية
          </button>
          <button class="admin-subtab-btn ${adminActiveSubTab === 'settings' ? 'active' : ''}" data-subtab="settings" style="padding:0.5rem 1.25rem; border:none; border-radius:var(--radius-sm); font-weight:700; font-size:0.88rem; cursor:pointer; background:${adminActiveSubTab === 'settings' ? 'var(--bg-card)' : 'none'}; color:${adminActiveSubTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)'}; box-shadow:${adminActiveSubTab === 'settings' ? 'var(--shadow-sm)' : 'none'};">
            ⚙️ إعدادات الـ API والذكاء الاصطناعي
          </button>
        </div>

        <!-- TAB 1: STUDENTS DIRECTORY -->
        <div id="admin-view-students" style="display:${adminActiveSubTab === 'students' ? 'flex' : 'none'}; flex-direction:column; gap:1.25rem;">
          
          <!-- Search & Filter Controls -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; gap:0.5rem; flex:1; max-width:420px;">
              <input type="text" id="admin-search-input" class="form-input" placeholder="🔍 بحث بالاسم، الهاتف، أو كود IELTS..." value="${studentSearchQuery}">
            </div>
            
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <span style="font-size:0.82rem; color:var(--text-muted); margin-left:0.25rem;">الحالة:</span>
              <button class="admin-filter-pill ${studentStatusFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding:0.35rem 0.85rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.8rem; font-weight:700; cursor:pointer; background:${studentStatusFilter === 'all' ? 'var(--primary)' : 'var(--bg-card-subtle)'}; color:${studentStatusFilter === 'all' ? '#fff' : 'var(--text-main)'};">
                الكل (${students.length})
              </button>
              <button class="admin-filter-pill ${studentStatusFilter === 'active' ? 'active' : ''}" data-filter="active" style="padding:0.35rem 0.85rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.8rem; font-weight:700; cursor:pointer; background:${studentStatusFilter === 'active' ? 'var(--success)' : 'var(--bg-card-subtle)'}; color:${studentStatusFilter === 'active' ? '#fff' : 'var(--text-main)'};">
                مفعل (${activeCount})
              </button>
              <button class="admin-filter-pill ${studentStatusFilter === 'pending' ? 'active' : ''}" data-filter="pending" style="padding:0.35rem 0.85rem; border-radius:var(--radius-full); border:1px solid var(--border-color); font-size:0.8rem; font-weight:700; cursor:pointer; background:${studentStatusFilter === 'pending' ? 'var(--danger)' : 'var(--bg-card-subtle)'}; color:${studentStatusFilter === 'pending' ? '#fff' : 'var(--text-main)'};">
                معلق 100$ (${pendingCount})
              </button>
            </div>
          </div>

          <!-- Students Table Container -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-sm);">
            <div style="padding:1.25rem 1.5rem; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main);">قائمة الطلاب المسجلين</h3>
              <span style="font-size:0.82rem; color:var(--text-muted);">عرض <strong>${filteredStudents.length}</strong> من إجمالي <strong>${students.length}</strong> طالب</span>
            </div>
            
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; text-align:right;">
                <thead>
                  <tr style="background:var(--bg-card-subtle); border-bottom:1px solid var(--border-color); font-size:0.82rem; color:var(--text-muted);">
                    <th style="padding:0.75rem 0.6rem;">#</th>
                    <th style="padding:0.75rem 0.6rem;">الطالب</th>
                    <th style="padding:0.75rem 0.6rem;">كود الدخول (Access Code)</th>
                    <th style="padding:0.75rem 0.6rem;">حالة الاشتراك</th>
                    <th style="padding:0.75rem 0.6rem;">المقالات</th>
                    <th style="padding:0.75rem 0.6rem;">أعلى باند</th>
                    <th style="padding:0.75rem 0.6rem;">الإجراءات السريعة</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 2: ANALYTICS & REVENUE -->
        <div id="admin-view-analytics" style="display:${adminActiveSubTab === 'analytics' ? 'flex' : 'none'}; flex-direction:column; gap:1.5rem;">
          
          <!-- Financial Metric Cards -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem;">
            
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm); position:relative; overflow:hidden;">
              <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--success);"></div>
              <span style="font-size:0.82rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:0.25rem;">💰 الإيرادات المحصلة الفعالة</span>
              <strong style="font-size:1.9rem; color:var(--success); display:block;">$${collectedRevenue.toLocaleString()}</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">${activeCount} مشترك دفعوا 100$</span>
            </div>

            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm); position:relative; overflow:hidden;">
              <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--danger);"></div>
              <span style="font-size:0.82rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:0.25rem;">⏳ الاشتراكات المعلقة المتوقعة</span>
              <strong style="font-size:1.9rem; color:var(--danger); display:block;">$${pendingRevenue.toLocaleString()}</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">${pendingCount} طالب بانتظار التحويل عبر الواتساب</span>
            </div>

            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm); position:relative; overflow:hidden;">
              <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--primary);"></div>
              <span style="font-size:0.82rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:0.25rem;">🎯 نسبة تفعيل الطلاب</span>
              <strong style="font-size:1.9rem; color:var(--primary); display:block;">${conversionRate}%</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">${activeCount} من أصل ${students.length} طالب</span>
            </div>

            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm); position:relative; overflow:hidden;">
              <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--warning);"></div>
              <span style="font-size:0.82rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:0.25rem;">📝 إجمالي المقالات المصححة</span>
              <strong style="font-size:1.9rem; color:var(--text-main); display:block;">${totalEssays}</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">متوسط الباند العام: Band ${avgBand}</span>
            </div>

          </div>

          <!-- Direct WhatsApp Channel Notice -->
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.25rem; box-shadow:var(--shadow-sm);">
            <div style="display:flex; align-items:center; gap:1rem;">
              <div style="width:48px; height:48px; border-radius:50%; background:#25D366; color:white; display:flex; align-items:center; justify-content:center; font-size:1.6rem; flex-shrink:0;">
                💬
              </div>
              <div>
                <strong style="font-size:1rem; color:var(--text-main); display:block;">قناة الواتساب الرسمية للتحصيل والتفعيل (+${teacherPhone})</strong>
                <span style="font-size:0.85rem; color:var(--text-muted);">عند تسجيل أي طالب بحالة معلقة، يظهر له زر مباشر لمراسلتك على هذا الرقم لتحويل الـ 100$ وتزويدك بكوده للتفعيل.</span>
              </div>
            </div>
            <a href="https://wa.me/${teacherPhone}" target="_blank" class="btn btn-sm" style="background:#25D366; color:white; padding:0.6rem 1.25rem; font-weight:700;">
              فتح محادثات المعلم على الواتساب ↗
            </a>
          </div>

        </div>

        <!-- TAB 3: AI & SYSTEM SETTINGS -->
        <div id="admin-view-settings" style="display:${adminActiveSubTab === 'settings' ? 'flex' : 'none'}; flex-direction:column; gap:1.5rem;">
          
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:2rem; box-shadow:var(--shadow-sm); max-width:850px;">
            <div style="border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem;">
              <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-main);">⚙️ ضبط مزود الذكاء الاصطناعي ومفاتيح الـ API</h3>
              <p style="font-size:0.85rem; color:var(--text-muted);">هذه الإعدادات خاصة بالمعلم فقط ولا يراها الطلاب أبداً على الإطلاق.</p>
            </div>

            <div class="form-group" style="margin-bottom:1.5rem;">
              <label class="form-label" style="font-weight:700;">مزود الذكاء الاصطناعي النشط (Active Engine):</label>
              <select id="admin-setting-provider-select" class="form-input" style="font-weight:700;">
                <option value="gemini" ${settings.active_provider === 'gemini' ? 'selected' : ''}>Google AI Studio (Gemini 3.6 Flash) - عالي الدقة وسريع</option>
                <option value="groq" ${settings.active_provider === 'groq' ? 'selected' : ''}>Groq Cloud (Llama 3.3 70B) - فائق السرعة</option>
                <option value="openrouter" ${settings.active_provider === 'openrouter' ? 'selected' : ''}>OpenRouter (نماذج متنوعة)</option>
                <option value="you" ${settings.active_provider === 'you' ? 'selected' : ''}>You.com Platform (Research & AI Answers) - https://you.com/platform</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label">مفتاح Google Gemini API Key:</label>
              <input type="password" id="admin-setting-gemini-key" class="form-input" placeholder="${settings.gemini_configured ? '•••••••••••••••• (تم الضبط بنجاح)' : 'AIzaSy...'}">
            </div>

            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label">مفتاح Groq Cloud API Key:</label>
              <input type="password" id="admin-setting-groq-key" class="form-input" placeholder="${settings.groq_configured ? '•••••••••••••••• (تم الضبط بنجاح)' : 'gsk_...'}">
            </div>

            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label">مفتاح OpenRouter API Key:</label>
              <input type="password" id="admin-setting-openrouter-key" class="form-input" placeholder="${settings.openrouter_configured ? '•••••••••••••••• (تم الضبط بنجاح)' : 'sk-or-v1-...'}">
            </div>

            <div class="form-group" style="margin-bottom:1.5rem;">
              <label class="form-label">مفتاح You.com Platform API Key (<a href="https://you.com/platform" target="_blank" style="color:var(--primary); text-decoration:none;">you.com/platform ↗</a>):</label>
              <input type="password" id="admin-setting-you-key" class="form-input" placeholder="${settings.you_configured ? '•••••••••••••••• (تم الضبط بنجاح)' : 'أدخل مفتاح You.com الخاص بك...'}">
            </div>

            <div style="border-top:1px solid var(--border-color); padding-top:1.5rem; margin-top:1.5rem;">
              <h4 style="font-size:1rem; font-weight:800; color:var(--text-main); margin-bottom:1rem;">🔐 إعدادات المعلم والاشتراك</h4>
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="form-group">
                  <label class="form-label">رقم هاتف المعلم للواتساب:</label>
                  <input type="text" id="admin-setting-teacher-whatsapp" class="form-input" value="${teacherPhone}">
                </div>

                <div class="form-group">
                  <label class="form-label">رمز مرور المعلم السري (Admin PIN):</label>
                  <input type="password" id="admin-setting-admin-pin" class="form-input" placeholder="${settings.admin_pin_configured ? '•••••••• (تم الضبط)' : 'admin123'}">
                </div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border-color);">
              <button id="admin-save-settings-inline-btn" class="btn btn-primary btn-lg" style="padding:0.75rem 2rem;">
                💾 حفظ كافة الإعدادات
              </button>
              <span id="admin-save-settings-status" style="font-size:0.88rem; font-weight:700; color:var(--success); display:none;">
                ✅ تم حفظ الإعدادات بنجاح!
              </span>
            </div>

          </div>

        </div>

      </div>
    `;

    // Attach Subtab Listeners
    container.querySelectorAll('.admin-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        adminActiveSubTab = btn.getAttribute('data-subtab');
        renderAdminDashboard();
      });
    });

    // Attach Search & Filter Listeners
    const searchInput = document.getElementById('admin-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        studentSearchQuery = e.target.value.trim();
        renderAdminDashboard();
      });
    }

    container.querySelectorAll('.admin-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        studentStatusFilter = btn.getAttribute('data-filter');
        renderAdminDashboard();
      });
    });

    // Attach Status Toggle
    container.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-current');
        const nextStatus = current === 'active' ? 'pending' : 'active';
        btn.textContent = 'جاري التحديث...';
        try {
          await updateStudentStatus(id, nextStatus);
          await renderAdminDashboard();
        } catch (e) {
          alert('فشل تحديث الحالة: ' + e.message);
        }
      });
    });

    // Attach Student File Inspect
    container.querySelectorAll('.view-student-file-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        localStorage.setItem('ielts_active_student_id', id);
        window.dispatchEvent(new CustomEvent('admin-inspect-student', { detail: { studentId: id } }));
      });
    });

    // Attach Student JSON File Download
    container.querySelectorAll('.download-student-file-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        try {
          const res = await fetch(`/api/students/${id}/file`);
          const data = await res.json();
          if (data.success) {
            const blob = new Blob([JSON.stringify(data.student_file, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `student_${name}_${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (e) {
          alert('فشل تنزيل ملف الطالب: ' + e.message);
        }
      });
    });

    // Attach Delete Student
    container.querySelectorAll('.delete-student-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (confirm(`هل أنت متأكد من حذف الطالب "${name}" وكافة مقالاته؟`)) {
          await deleteStudent(id);
          await renderAdminDashboard();
        }
      });
    });

    // Attach Copy Code
    container.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        alert(`تم نسخ كود الطالب: ${code}`);
      });
    });

    // Attach Open Add Student Modal
    document.getElementById('open-add-student-modal-btn')?.addEventListener('click', () => {
      document.getElementById('add-student-modal')?.classList.add('open');
    });

    // Attach Logout
    document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
      sessionStorage.removeItem('ielts_admin_auth');
      isAdminAuthenticated = false;
      renderAdminDashboard();
    });

    // Attach Inline Save Settings
    const saveSettingsInlineBtn = document.getElementById('admin-save-settings-inline-btn');
    const saveSettingsStatus = document.getElementById('admin-save-settings-status');
    if (saveSettingsInlineBtn) {
      saveSettingsInlineBtn.addEventListener('click', async () => {
        const active_provider = document.getElementById('admin-setting-provider-select').value;
        const gemini_api_key = document.getElementById('admin-setting-gemini-key').value;
        const groq_api_key = document.getElementById('admin-setting-groq-key').value;
        const openrouter_api_key = document.getElementById('admin-setting-openrouter-key').value;
        const you_api_key = document.getElementById('admin-setting-you-key')?.value;
        const teacher_whatsapp = document.getElementById('admin-setting-teacher-whatsapp').value.trim();
        const admin_pin = document.getElementById('admin-setting-admin-pin').value.trim();

        try {
          saveSettingsInlineBtn.textContent = 'جاري الحفظ...';
          await saveSettings({
            active_provider,
            gemini_api_key,
            groq_api_key,
            openrouter_api_key,
            you_api_key,
            teacher_whatsapp,
            admin_pin
          });
          saveSettingsInlineBtn.textContent = '💾 حفظ كافة الإعدادات';
          if (saveSettingsStatus) {
            saveSettingsStatus.style.display = 'inline';
            setTimeout(() => { saveSettingsStatus.style.display = 'none'; }, 4000);
          }
        } catch (err) {
          saveSettingsInlineBtn.textContent = '💾 حفظ كافة الإعدادات';
          alert('فشل حفظ الإعدادات: ' + err.message);
        }
      });
    }

  } catch (err) {
    container.innerHTML = `<div class="toast toast-error" style="position:static;">خطأ في تحميل لوحة تحكم المعلم: ${err.message}</div>`;
  }
}
