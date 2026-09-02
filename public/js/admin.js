import { fetchStudents, createStudent, updateStudentStatus, deleteStudent, verifyAdminPin, fetchSettings } from './api.js';

let isAdminAuthenticated = false;

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
      <div style="text-align:center; padding:4rem 2rem; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color); max-width:550px; margin:2rem auto; box-shadow:var(--shadow-md);">
        <div style="font-size:3rem; margin-bottom:1rem;">🔐</div>
        <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">لوحة تحكم المعلم والمشرف</h3>
        <p style="color:var(--text-muted); font-size:0.92rem; margin-bottom:1.5rem; line-height:1.6;">
          أدخل رمز المرور السري الخاص بك للوصول إلى إدارة وتفعيل حسابات الطلاب، استخراج الأكواد، ومتابعة الاشتراكات.
        </p>
        
        <div style="display:flex; gap:0.5rem; max-width:340px; margin:0 auto 1rem;">
          <input type="password" id="admin-pin-inline-input" class="form-input" placeholder="أدخل رمز المرور (PIN)..." style="text-align:center; font-size:1.1rem; letter-spacing:2px;">
          <button id="admin-pin-submit-btn" class="btn btn-primary" style="white-space:nowrap;">دخول 🚀</button>
        </div>
        <div id="admin-pin-error" style="color:var(--danger); font-size:0.85rem; display:none; margin-bottom:0.5rem;"></div>
        <span style="font-size:0.75rem; color:var(--text-muted);">رمز المرور الافتراضي: <strong>admin123</strong> (يمكن تغييره من الإعدادات)</span>
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

  container.innerHTML = '<div style="text-align:center; padding:3rem;"><div class="spinner" style="margin:0 auto 1rem;"></div><p>جاري تحميل لوحة تحكم المعلم...</p></div>';

  try {
    const students = await fetchStudents();
    const settings = await fetchSettings();
    const activeCount = students.filter(s => s.status === 'active').length;
    const pendingCount = students.filter(s => s.status === 'pending').length;
    const totalEssays = students.reduce((sum, s) => sum + (s.essay_count || 0), 0);
    const subscriptionPrice = settings.subscription_price || 100;
    const totalRevenue = activeCount * subscriptionPrice;
    const teacherPhone = settings.teacher_whatsapp || '966549724510';

    const rowsHtml = students.map((s, idx) => {
      const isActive = s.status === 'active';
      const cleanPhone = (s.phone || '').replace(/[^0-9]/g, '');
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${s.name}، تم إعداد حسابك في أداة تصحيح كتابة الآيلتس. كود الدخول الخاص بك هو: ${s.access_code || s.id}. رابط المنصة: ${window.location.origin}`)}` : null;

      return `
        <tr style="border-bottom: 1px solid var(--border-color); font-size:0.88rem;">
          <td style="padding:0.85rem 0.5rem; font-weight:700;">#${idx + 1}</td>
          <td style="padding:0.85rem 0.5rem;">
            <strong style="display:block; color:var(--text-main); font-size:0.95rem;">${s.name}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted);">${s.phone || 'بدون هاتف'}</span>
          </td>
          <td style="padding:0.85rem 0.5rem;">
            <div style="display:inline-flex; align-items:center; gap:0.35rem; background:var(--bg-card-subtle); padding:0.25rem 0.65rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
              <span style="font-family:monospace; font-weight:800; color:var(--primary); font-size:0.92rem;">${s.access_code || s.id}</span>
              <button class="copy-code-btn" data-code="${s.access_code || s.id}" title="نسخ الكود" style="background:none; border:none; cursor:pointer; font-size:0.8rem;">📋</button>
            </div>
          </td>
          <td style="padding:0.85rem 0.5rem;">
            <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
              ${isActive ? '✅ مفعل نشط' : '⏳ معلق (100$)'}
            </span>
          </td>
          <td style="padding:0.85rem 0.5rem;">${s.essay_count || 0} مقال</td>
          <td style="padding:0.85rem 0.5rem;">
            <strong style="color:var(--primary);">${s.latest_band ? 'Band ' + s.latest_band : '-'}</strong>
          </td>
          <td style="padding:0.85rem 0.5rem;">
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              <button class="btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'} toggle-status-btn" data-id="${s.id}" data-current="${s.status}">
                ${isActive ? 'تعليق ⏸️' : 'تفعيل بنقرة ✅'}
              </button>
              ${waLink ? `
                <a href="${waLink}" target="_blank" class="btn btn-sm" style="background:#25D366; color:white;" title="مراسلة الطالب بالبيانات عبر الواتساب">
                  واتساب 💬
                </a>
              ` : ''}
              <button class="btn btn-sm btn-secondary delete-student-btn" data-id="${s.id}" data-name="${s.name}" title="حذف" style="color:var(--danger);">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">لا يوجد طلاب مسجلين بعد. أضف طالبك الأول بالضغط على زر "إضافة طالب جديد".</td></tr>';

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.75rem;">
        <!-- Admin Header Bar -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <h2 style="font-size:1.35rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
              <span>🛡️</span> لوحة تحكم المعلم (Teacher Management Suite)
            </h2>
            <p style="font-size:0.85rem; color:var(--text-muted);">
              إدارة تفعيل حسابات الطلاب ومراقبة الاشتراكات وأكواد الدخول
            </p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button id="open-add-student-modal-btn" class="btn btn-primary">
              <span>➕</span> إضافة طالب جديد
            </button>
            <button id="admin-logout-btn" class="btn btn-secondary btn-sm">
              خروج 🚪
            </button>
          </div>
        </div>

        <!-- Metrics Cards Grid -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1rem;">
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem;">
            <span style="font-size:0.8rem; color:var(--text-muted); display:block;">إجمالي الطلاب</span>
            <strong style="font-size:1.6rem; color:var(--text-main);">${students.length}</strong>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem;">
            <span style="font-size:0.8rem; color:var(--text-muted); display:block;">المشتركون المفعلون</span>
            <strong style="font-size:1.6rem; color:var(--success);">${activeCount}</strong>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem;">
            <span style="font-size:0.8rem; color:var(--text-muted); display:block;">في انتظار التفعيل (100$)</span>
            <strong style="font-size:1.6rem; color:var(--danger);">${pendingCount}</strong>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem;">
            <span style="font-size:0.8rem; color:var(--text-muted); display:block;">إجمالي المقالات المصححة</span>
            <strong style="font-size:1.6rem; color:var(--primary);">${totalEssays}</strong>
          </div>
        </div>

        <!-- WhatsApp Info Notice -->
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:var(--radius-md); padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <strong style="color:#166534; font-size:0.92rem; display:flex; align-items:center; gap:0.4rem;">
              <span>💬</span> رقم الواتساب المعتمد لتفعيل اشتراكات الطلاب:
            </strong>
            <span style="color:#15803d; font-size:0.85rem;">الطلاب يقومون بمراسلتك تلقائياً على <strong>+${teacherPhone}</strong> مع كود الحساب لدفع رسوم الاشتراك (100$) والتفعيل.</span>
          </div>
          <a href="https://wa.me/${teacherPhone}" target="_blank" class="btn btn-sm" style="background:#25D366; color:white;">
            فتح محادثاتي على الواتساب ↗
          </a>
        </div>

        <!-- Students Table -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
            <h3 style="font-size:1.1rem; font-weight:800;">📋 قائمة الطلاب وسجل الأكواد</h3>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:right;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); font-size:0.82rem; color:var(--text-muted);">
                  <th style="padding:0.6rem;">#</th>
                  <th style="padding:0.6rem;">اسم الطالب</th>
                  <th style="padding:0.6rem;">كود الدخول (Access Code)</th>
                  <th style="padding:0.6rem;">حالة الاشتراك</th>
                  <th style="padding:0.6rem;">المقالات</th>
                  <th style="padding:0.6rem;">آخر باند</th>
                  <th style="padding:0.6rem;">إجراءات المعلم</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Attach Action Listeners
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

    container.querySelectorAll('.delete-student-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (confirm(`هل أنت متأكد من حذف الطالب "${name}"؟`)) {
          await deleteStudent(id);
          await renderAdminDashboard();
        }
      });
    });

    container.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        alert(`تم نسخ كود الطالب: ${code}`);
      });
    });

    document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
      sessionStorage.removeItem('ielts_admin_auth');
      isAdminAuthenticated = false;
      renderAdminDashboard();
    });

    document.getElementById('open-add-student-modal-btn')?.addEventListener('click', () => {
      document.getElementById('add-student-modal')?.classList.add('open');
    });

  } catch (err) {
    container.innerHTML = `<div class="toast toast-error" style="position:static;">خطأ في تحميل لوحة تحكم المعلم: ${err.message}</div>`;
  }
}
