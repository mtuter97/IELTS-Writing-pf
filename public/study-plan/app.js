// IELTS Master Preparation Portal - Complete Application & Strategy Engine
document.addEventListener('DOMContentLoaded', () => {
  const data = window.COURSE_DATA;
  if (!data) {
    console.error("COURSE_DATA not loaded!");
    return;
  }

  // --- 1. State Management ---
  const state = {
    activeWeek: 1,
    activeVideoFilter: 'All',
    searchQuery: '',
    completedTasks: JSON.parse(localStorage.getItem('ielts_completed_tasks') || '[]'),
    currentPhotoIndex: parseInt(localStorage.getItem('ielts_hero_photo_idx') || '0', 10),
    photos: [
      { src: 'assets/images/user_hero_transparent.png', name: 'مفرغة' },
      { src: 'assets/images/user_hero_portrait.png', name: 'رسمية' },
      { src: 'assets/images/user_hero_alt1.jpg', name: 'تفاعلية' }
    ],
    // Slides Engine State
    currentSlideDeckWeek: 1,
    currentSlideIndex: 0,
    currentWeekSlidesList: []
  };

  // --- 2. Odometer Smooth Animated Counter ---
  function animateValue(element, start, end, duration, suffix = '') {
    if (!element) return;
    const startNum = parseInt(start) || 0;
    const endNum = parseInt(end) || 0;
    if (startNum === endNum) {
      element.textContent = endNum + suffix;
      return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startNum + (endNum - startNum) * ease);
      element.textContent = current + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = endNum + suffix;
      }
    };
    window.requestAnimationFrame(step);
  }

  // --- 3. Hero Photo Switcher ---
  const heroImg = document.getElementById('heroCutoutImg') || document.getElementById('heroAvatarImg');
  const photoSwitchBtn = document.getElementById('photoSwitchBtn');
  const photoSwitchLabel = document.getElementById('photoSwitchLabel');
  
  function updateHeroPhoto() {
    if (heroImg && state.photos[state.currentPhotoIndex]) {
      const current = state.photos[state.currentPhotoIndex];
      heroImg.src = current.src;
      if (photoSwitchLabel) {
        photoSwitchLabel.textContent = `صورة: ${current.name}`;
      } else if (photoSwitchBtn) {
        photoSwitchBtn.innerHTML = `<i class="fa-solid fa-camera-rotate"></i> صورة: ${current.name}`;
      }
    }
  }
  updateHeroPhoto();

  if (photoSwitchBtn) {
    photoSwitchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.currentPhotoIndex = (state.currentPhotoIndex + 1) % state.photos.length;
      localStorage.setItem('ielts_hero_photo_idx', state.currentPhotoIndex);
      updateHeroPhoto();
    });
  }

  if (heroImg) {
    heroImg.style.cursor = 'pointer';
    heroImg.title = 'اضغط لتبديل زاوية صورة الكوتش محمود السعيد';
    heroImg.addEventListener('click', () => {
      state.currentPhotoIndex = (state.currentPhotoIndex + 1) % state.photos.length;
      localStorage.setItem('ielts_hero_photo_idx', state.currentPhotoIndex);
      updateHeroPhoto();
    });
  }

  // --- 4. Render Daily Cadence ---
  const cadenceContainer = document.getElementById('cadenceGrid');
  if (cadenceContainer && data.dailyCadence) {
    cadenceContainer.innerHTML = data.dailyCadence.map(item => `
      <div class="cadence-card">
        <span class="cadence-time">${item.time}</span>
        <h4 class="cadence-title">${item.title}</h4>
        <div class="cadence-action">
          <span>⚡</span> ${item.action}
        </div>
        <p class="cadence-desc ar-text">${item.desc}</p>
      </div>
    `).join('');
  }

  // --- 5. Render Actual Live Discussion Sessions (الحصص الفعلية) ---
  const liveSessionsGrid = document.getElementById('liveSessionsGrid');
  if (liveSessionsGrid && data.liveSessions) {
    liveSessionsGrid.innerHTML = data.liveSessions.map(s => {
      const files = (data.weekFiles && data.weekFiles[String(s.week)]) || [];
      return `
        <div class="live-session-card">
          <div>
            <div class="session-header-row">
              <span class="session-timing-badge">
                <span>🕒</span> ${s.day} • ${s.time} (${s.date})
              </span>
              <span class="session-skill-tag">${s.skill}</span>
            </div>

            <h3 class="session-card-title">${s.title}</h3>

            <!-- Actual Live Discussion Agenda -->
            <div class="session-agenda-block">
              <div class="agenda-heading">
                <span>🎯</span> محاور ونقاط نقاش الحصة الفعلية (Live Agenda):
              </div>
              <ul class="agenda-items-list ar-text">
                ${s.discussionAgenda.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>

            <!-- Strategy Spotlight -->
            <div class="session-spotlight-box">
              <span style="color: var(--mb-clr-sd-1); font-weight: 800;">⚡ الاستراتيجية:</span>
              <span>${s.strategySpotlight}</span>
            </div>

            <!-- Referenced Files for this Session -->
            ${files.length > 0 ? `
              <div style="margin-bottom: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--mb-clr-sd-1); margin-bottom: 6px;">
                  📄 ملفات الحصة المرجعية (PDF):
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${files.slice(0, 2).map(f => `
                    <a href="${f.path}" target="_blank" rel="noopener" class="btn-session-watch" style="padding: 4px 8px; font-size: 10.5px; flex: 0 0 auto;" title="${f.desc}">
                      <span>📥</span> ${f.name.split('(')[0].trim()}
                    </a>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Homework & Deadline -->
            <div style="font-size: 11.5px; color: var(--mb-clr-text-muted); margin-bottom: 12px;" class="ar-text">
              <strong style="color: #FFF;">📌 التكليف:</strong> ${s.assignment}<br>
              <strong style="color: var(--mb-clr-sd-1);">⏰ الموعد النهائي:</strong> ${s.deadline}
            </div>
          </div>

          <!-- Session Action Buttons -->
          <div class="session-actions-strip">
            <button class="btn-session-watch launch-slides-btn" data-week="${s.week}">
              <span>📽️</span> شرائح الحصة
            </button>
            <a href="presentation.html?week=${s.week}" target="_blank" class="btn-session-watch" style="flex:0 0 auto;" title="فتح العارض المستقل بشاشة كاملة">
              <span>🖥️</span>
            </a>
            ${s.foreignMasterVideo ? `
              <button class="btn-session-master play-master-btn" data-master-id="${s.foreignMasterVideo}">
                <span>🇬🇧</span> ماستركلاس مناظر
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 6. Render Weekly Curriculum Roadmap (Tabs & Panels with Dual Slide Launchers) ---
  const roadmapTabsContainer = document.getElementById('roadmapTabs');
  const roadmapPanelsContainer = document.getElementById('roadmapPanels');

  if (roadmapTabsContainer && roadmapPanelsContainer && data.weeks) {
    // Tabs
    roadmapTabsContainer.innerHTML = data.weeks.map(w => `
      <button class="week-tab-btn ${w.week === state.activeWeek ? 'active' : ''}" data-week="${w.week}">
        ${w.week === 0 ? 'الأسبوع 0: التهيئة' : 'الأسبوع ' + w.week}
      </button>
    `).join('');

    // Panels
    roadmapPanelsContainer.innerHTML = data.weeks.map(w => {
      const isWeekActive = w.week === state.activeWeek;
      const files = (data.weekFiles && data.weekFiles[String(w.week)]) || [];
      return `
        <div class="week-panel ${isWeekActive ? 'active' : ''}" id="panel-week-${w.week}">
          <div class="week-header-block">
            <div>
              <span class="week-badge">${w.badge}</span>
              <h3 class="week-title">${w.title}</h3>
              <div class="week-dates">📅 ${w.dates}</div>
            </div>

            <!-- Dual Slide Launchers -->
            <div class="slide-launch-group">
              <button class="btn btn-primary launch-slides-btn" data-week="${w.week}">
                <span>📽️ عرض سريع للسلايدات</span>
              </button>
              <a href="presentation.html?week=${w.week}" target="_blank" class="btn btn-outline" style="border-color: var(--mb-clr-sd-1); color: var(--mb-clr-sd-1);" title="فتح العارض المستقل بشاشة كاملة">
                <span>🖥️ العارض المستقل (Full Deck)</span> ➔
              </a>
            </div>
          </div>

          <!-- Referenced Files Strip for this Week -->
          ${files.length > 0 ? `
            <div style="background: rgba(255, 96, 47, 0.06); border: 1px dashed var(--mb-clr-pr-1); border-radius: var(--mb-radius-md); padding: 12px 16px; margin: 16px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #FFF;">
                <span style="color: var(--mb-clr-pr-1); font-size: 16px;">📂</span>
                <span>الملفات والمستندات المرجعية لهذا الأسبوع:</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${files.map(f => `
                  <a href="${f.path}" target="_blank" rel="noopener" class="btn-session-watch" style="padding: 6px 12px; font-size: 11px; flex: 0 0 auto;" title="${f.desc}">
                    <span>📄</span> ${f.name} <span style="opacity: 0.6; font-size: 10px;">(${f.size})</span>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="week-grid-layout">
            <!-- Left Column: Sessions & Objectives -->
            <div class="week-subcard">
              <h4 class="week-subcard-title">🕒 الحصص وورش العمل الفعلية</h4>
              <div class="session-pill-list">
                ${w.sessions.map(s => `
                  <div class="session-pill-item">
                    <span class="session-day-time">${s.day} @ ${s.time}</span>
                    <span class="session-name">${s.title}</span>
                  </div>
                `).join('')}
              </div>

              <h4 class="week-subcard-title" style="margin-top: 24px;">🎯 أهداف التعلم الأسبوعية</h4>
              <ul class="objectives-list ar-text">
                ${w.objectives.map(obj => `<li>${obj}</li>`).join('')}
              </ul>

              ${w.clinic ? `
                <div class="alert-banner clinic ar-text" style="margin-top: 16px;">
                  <span>🏥</span> <strong>${w.clinic}</strong>
                </div>
              ` : ''}

              ${w.deadline ? `
                <div class="alert-banner ar-text" style="margin-top: 12px;">
                  <span>⚠️</span> <strong>${w.deadline}</strong>
                </div>
              ` : ''}
            </div>

            <!-- Right Column: Interactive Action Checklist -->
            <div class="week-subcard">
              <h4 class="week-subcard-title">📝 قائمة المهام الأسبوعية (Checklist)</h4>
              <div class="tasks-checklist">
                ${w.tasks.map((task, idx) => {
                  const taskId = `w${w.week}_t${idx}`;
                  const isChecked = state.completedTasks.includes(taskId);
                  return `
                    <label class="task-item ${isChecked ? 'completed' : ''}" data-task-id="${taskId}">
                      <input type="checkbox" class="task-checkbox" ${isChecked ? 'checked' : ''}>
                      <span class="task-text ar-text">${task}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Tab Switch
    roadmapTabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.week-tab-btn');
      if (!btn) return;
      const targetWeek = parseInt(btn.dataset.week, 10);
      state.activeWeek = targetWeek;

      roadmapTabsContainer.querySelectorAll('.week-tab-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.week, 10) === targetWeek);
      });

      roadmapPanelsContainer.querySelectorAll('.week-panel').forEach(p => {
        p.classList.toggle('active', p.id === `panel-week-${targetWeek}`);
      });
    });

    // Checklist Click
    roadmapPanelsContainer.addEventListener('change', (e) => {
      if (e.target.matches('.task-checkbox')) {
        const item = e.target.closest('.task-item');
        const taskId = item.dataset.taskId;
        if (e.target.checked) {
          item.classList.add('completed');
          if (!state.completedTasks.includes(taskId)) state.completedTasks.push(taskId);
        } else {
          item.classList.remove('completed');
          state.completedTasks = state.completedTasks.filter(id => id !== taskId);
        }
        localStorage.setItem('ielts_completed_tasks', JSON.stringify(state.completedTasks));
        updateProgressMetrics();
      }
    });

    // Launch Slides Modal
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.launch-slides-btn');
      if (btn) {
        const targetWeek = parseInt(btn.dataset.week, 10);
        openWeekSlides(targetWeek);
      }
    });
  }

  // --- 7. Render Referenced Course Files Vault (#filesVaultGrid) ---
  const filesVaultGrid = document.getElementById('filesVaultGrid');
  if (filesVaultGrid && data.courseFilesVault) {
    filesVaultGrid.innerHTML = data.courseFilesVault.map(f => `
      <div class="file-vault-card">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span class="session-skill-tag">${f.category}</span>
            <span style="font-size: 11px; color: var(--mb-clr-sd-1); font-family: var(--mb-font-head); font-weight: 700;">
              ${f.week === 0 ? 'Foundation' : 'Week ' + f.week} • ${f.size}
            </span>
          </div>
          <h4 class="file-vault-title" style="font-size: 15px; font-weight: 800; color: #FFF; margin-bottom: 6px; line-height: 1.4;">
            ${f.name}
          </h4>
          <p class="file-vault-desc ar-text" style="font-size: 12px; color: var(--mb-clr-text-muted); line-height: 1.5; margin-bottom: 16px;">
            ${f.desc}
          </p>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--mb-border);">
          <span style="font-size: 11px; font-family: var(--mb-font-head); color: #FFF; font-weight: 700;">
            <i class="fa-solid fa-file-pdf text-rose-500 mr-1"></i> ${f.filename}
          </span>
          <a href="${encodeURI(f.path)}" target="_blank" download="${f.filename || ''}" rel="noopener" class="btn btn-primary" style="padding: 6px 14px; font-size: 11.5px; border-radius: 8px;">
            <span>فتح وتحميل</span> ➔
          </a>
        </div>
      </div>
    `).join('');
  }

  // --- 8. Render Strategy Laboratory (CHIPSET, TEXS, BRO, WHTFM, PSTA, Letters, Clinic) ---
  const strategyPanesContainer = document.getElementById('strategyPanesContainer');
  const strategyTabsBar = document.getElementById('strategyTabsBar');

  if (strategyPanesContainer && data.chipsetSystem) {
    strategyPanesContainer.innerHTML = `
      <!-- 1. CHIPSET Pane -->
      <div class="strategy-pane active" id="pane-chipset">
        <div style="margin-bottom: 20px; background: rgba(255, 96, 47, 0.08); padding: 18px 22px; border-radius: var(--mb-radius-md); border-right: 4px solid var(--mb-clr-pr-1);" class="ar-text">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 18px; color: #FFF; margin-bottom: 6px;">نظام توليد الأفكار الفوري (CHIPSET) - 22 مساراً معرفياً</h3>
              <p style="font-size: 13px; color: var(--mb-clr-text-muted); line-height: 1.6;">
                تم تصميمه لإنهاء مشكلة التردد أو التوقف التام عن الكتابة والتحدث أثناء ضغط الوقت في الامتحان.
              </p>
            </div>
            <a href="CHIPSET.png" target="_blank" rel="noopener" class="btn-session-watch" style="flex: 0 0 auto;">
              <span>🖼️ فتح مخطط CHIPSET الأصلي PNG</span>
            </a>
          </div>
        </div>

        <div class="chipset-grid">
          ${data.chipsetSystem.categories.map(c => `
            <div class="chipset-card">
              <div class="chipset-letter-badge">${c.letter} (${c.count})</div>
              <div class="chipset-name">${c.name}</div>
              <div class="chipset-keywords ar-text">الكلمات المفتاحية: ${c.keywords}</div>
              <div class="chipset-example ar-text"><strong>تطبيق مقترح:</strong> ${c.exampleTopic}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. TEXS Pane -->
      <div class="strategy-pane" id="pane-texs">
        <div style="margin-bottom: 20px; background: rgba(255, 188, 24, 0.08); padding: 18px 22px; border-radius: var(--mb-radius-md); border-right: 4px solid var(--mb-clr-sd-1);" class="ar-text">
          <h3 style="font-size: 18px; color: #FFF; margin-bottom: 6px;">معادلة بناء فقرات المقال الأكاديمي (TEXS Body Architecture)</h3>
          <p style="font-size: 13.5px; color: var(--mb-clr-text-muted); line-height: 1.6;">
            المعادلة التي يستخدمها مصححو كامبريدج لتقييم معيار Task Response ومعيار Coherence & Cohesion بـ Band 8.0+.
          </p>
        </div>

        <div class="step-flow-grid">
          ${data.texsSystem.steps.map(s => `
            <div class="step-flow-card accent-orange">
              <div class="step-flow-letter">${s.step}</div>
              <div class="step-flow-title">${s.title}</div>
              <div class="step-flow-desc ar-text">${s.desc}</div>
              <div class="step-flow-example"><em>"${s.example}"</em></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. BRO Pane -->
      <div class="strategy-pane" id="pane-bro">
        <div style="margin-bottom: 20px; background: rgba(56, 189, 248, 0.08); padding: 18px 22px; border-radius: var(--mb-radius-md); border-right: 4px solid #38BDF8;" class="ar-text">
          <h3 style="font-size: 18px; color: #FFF; margin-bottom: 6px;">معادلة كتابة مقدمة المقال في 4 دقائق (BRO Introduction Blueprint)</h3>
          <p style="font-size: 13.5px; color: var(--mb-clr-text-muted); line-height: 1.6;">
            مقدمة أكاديمية ثلاثية الجمل تنهيها في أقل من 5 دقائق وتضمن أعلى درجات التماسك وإعلان الموقف الصريح.
          </p>
        </div>

        <div class="step-flow-grid">
          ${data.broSystem.steps.map(s => `
            <div class="step-flow-card accent-amber">
              <div class="step-flow-letter">${s.step}</div>
              <div class="step-flow-title">${s.title}</div>
              <div class="step-flow-desc ar-text">${s.desc}</div>
              <div class="step-flow-example"><em>"${s.example}"</em></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 4. WHTFM Pane -->
      <div class="strategy-pane" id="pane-whtfm">
        <div style="margin-bottom: 20px; background: rgba(168, 85, 247, 0.08); padding: 18px 22px; border-radius: var(--mb-radius-md); border-right: 4px solid #A855F7;" class="ar-text">
          <h3 style="font-size: 18px; color: #FFF; margin-bottom: 6px;">معادلة مونولوج التحدث لمدة دقيقتين (WHTFM Speaking Formula)</h3>
          <p style="font-size: 13.5px; color: var(--mb-clr-text-muted); line-height: 1.6;">
            تقضي على السكتات وكلمات التردد ('aaaaa') تماماً في الجزء الثاني من اختبار التحدث (Part 2 Cue Card).
          </p>
        </div>

        <div class="step-flow-grid">
          ${data.whtfmSystem.steps.map(s => `
            <div class="step-flow-card accent-orange">
              <div class="step-flow-letter">${s.step}</div>
              <div class="step-flow-title">${s.title}</div>
              <div class="step-flow-desc ar-text">${s.desc}</div>
              <div class="step-flow-example"><em>"${s.example}"</em></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 5. PSTA Pane -->
      <div class="strategy-pane" id="pane-psta">
        <div style="margin-bottom: 20px; background: rgba(34, 197, 94, 0.08); padding: 18px 22px; border-radius: var(--mb-radius-md); border-right: 4px solid #22C55E;" class="ar-text">
          <h3 style="font-size: 18px; color: #FFF; margin-bottom: 6px;">بروتوكول التدقيق اللغوي للدقائق الخمس الأخيرة (PSTA Protocol)</h3>
          <p style="font-size: 13.5px; color: var(--mb-clr-text-muted); line-height: 1.6;">
            توقف عن الكتابة عند الدقيقة 35 وخصص الـ 5 دقائق المتبقية حصرياً لهذا التدقيق لحفظ درجة أو نصف درجة كاملة من الضياع.
          </p>
        </div>

        <div class="step-flow-grid">
          ${data.pstaSystem.steps.map(s => `
            <div class="step-flow-card accent-amber">
              <div class="step-flow-letter">${s.letter}</div>
              <div class="step-flow-title">${s.focus}</div>
              <div class="step-flow-desc ar-text">${s.checklist}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 6. General Letters Pane -->
      <div class="strategy-pane" id="pane-letters">
        <div style="margin-bottom: 20px; background: rgba(56, 189, 248, 0.08); padding: 18px 22px; border-radius: var(--mb-radius-md); border-right: 4px solid #38BDF8;" class="ar-text">
          <h3 style="font-size: 18px; color: #FFF; margin-bottom: 6px;">مصفوفة تصنيف خطابات التدريب العام (10 سيناريوهات للـ Recipient)</h3>
          <p style="font-size: 13.5px; color: var(--mb-clr-text-muted); line-height: 1.6;">
            تحديد النبرة (Register: Formal vs Semi-Formal vs Informal) والتحية والتوقيع الصحيح بدقة.
          </p>
        </div>

        <div class="table-responsive">
          <table class="letters-table">
            <thead>
              <tr>
                <th>المرسل إليه (Recipient)</th>
                <th>نوع الخطاب</th>
                <th>صيغة التحية (Salutation)</th>
                <th>التوقيع والخاتمة (Sign-off)</th>
                <th>قواعد النبرة والأسلوب (Tone Rules)</th>
              </tr>
            </thead>
            <tbody>
              ${data.writingLab.task1GeneralLetters.map(l => {
                let badgeClass = 'formal';
                if (l.type.includes('Semi')) badgeClass = 'semi';
                if (l.type.includes('Informal')) badgeClass = 'informal';
                return `
                  <tr>
                    <td><strong>${l.recipient}</strong></td>
                    <td><span class="reg-badge ${badgeClass}">${l.type}</span></td>
                    <td><code>${l.salutation}</code></td>
                    <td><code>${l.signOff}</code></td>
                    <td class="ar-text">${l.toneRules}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 7. Clinic Pane -->
      <div class="strategy-pane" id="pane-clinic">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div style="background: var(--mb-clr-surface); padding: 24px; border-radius: var(--mb-radius-md); border-top: 4px solid var(--mb-clr-pr-1);" class="ar-text">
            <span style="font-size: 11px; font-weight: 800; color: var(--mb-clr-pr-1); text-transform: uppercase;">الدعم السبتي التخصصي</span>
            <h3 style="font-size: 19px; color: #FFF; margin: 8px 0 12px;">عيادة الآيلتس (IELTS Clinic: 1:00 PM - 2:30 PM)</h3>
            <p style="font-size: 13px; color: var(--mb-clr-text-muted); line-height: 1.6; margin-bottom: 14px;">
              جلسة إجبارية أسبوعية للطلاب الحاصلين على Band 5.0 أو 5.5 لتشخيص واستئصال أسباب المشكلة:
            </p>
            <ul style="padding-right: 18px; font-size: 12.5px; color: #E2E8F0; line-height: 1.7;">
              <li><strong>كتابة أقل من 250 كلمة:</strong> تدريب سرعة الطباعة وإدارة الوقت.</li>
              <li><strong>سرد أفكار دون تعليل:</strong> تدريب قسري على معادلة TEXS وتوليد الأمثلة.</li>
              <li><strong>أخطاء الجرامر القاتلة:</strong> جلسة علاجية على توافق الفاعل والفعل والأدوات.</li>
            </ul>
          </div>

          <div style="background: var(--mb-clr-surface); padding: 24px; border-radius: var(--mb-radius-md); border-top: 4px solid var(--mb-clr-sd-1);" class="ar-text">
            <span style="font-size: 11px; font-weight: 800; color: var(--mb-clr-sd-1); text-transform: uppercase;">المجلد الإجباري</span>
            <h3 style="font-size: 19px; color: #FFF; margin: 8px 0 12px;">سجل "أخطائي وأفتخر" (My Mistakes and Proud)</h3>
            <p style="font-size: 13px; color: var(--mb-clr-text-muted); line-height: 1.6; margin-bottom: 14px;">
              كشكول مخصص يدون فيه كل طالب كل خطأ لغوي أو إملائي تم تصحيحه في مقالاته أو امتحاناته الشفهية:
            </p>
            <ul style="padding-right: 18px; font-size: 12.5px; color: #E2E8F0; line-height: 1.7;">
              <li>كتابة الجملة الخاطئة بالأحمر والجملة المصحوبة بالتعديل بالأخضر.</li>
              <li>بيان القاعدة اللغوية التي تم خرقها (SVA أو Article أو Preposition).</li>
              <li>مراجعة الكشكول صباح كل يوم لمنع تكرار الخطأ في الامتحان الفعلي.</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Strategy Tabs Switch Event
    if (strategyTabsBar) {
      strategyTabsBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.strategy-tab-btn');
        if (!btn) return;
        const targetPane = btn.dataset.pane;

        strategyTabsBar.querySelectorAll('.strategy-tab-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });

        strategyPanesContainer.querySelectorAll('.strategy-pane').forEach(p => {
          p.classList.toggle('active', p.id === targetPane);
        });
      });
    }
  }

  // --- 9. Render Foreign Masters (10 Native IELTS Experts) ---
  const foreignMastersGrid = document.getElementById('foreignMastersGrid');
  if (foreignMastersGrid && data.foreignMasters) {
    foreignMastersGrid.innerHTML = data.foreignMasters.map(m => `
      <div class="master-card">
        <div class="master-header">
          <div class="master-avatar">🇬🇧</div>
          <div>
            <div class="master-name">${m.teacher}</div>
            <div class="master-channel">${m.channel}</div>
          </div>
        </div>

        <span class="master-badge">${m.badge}</span>
        <div style="font-size: 11px; color: var(--mb-clr-sd-1); font-weight: 700; margin: 6px 0;">مهارة: ${m.skill} • الأسبوع ${m.weekCorrelation}</div>
        <h4 class="master-video-title">${m.title}</h4>
        <p class="master-video-desc ar-text">${m.desc}</p>
        
        <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 6px; font-size: 11.5px; color: var(--mb-clr-sd-1); margin-bottom: 14px;" class="ar-text">
          <strong>محور النقاش:</strong> ${m.discussionFocus}
        </div>

        <div class="master-actions">
          <button class="btn btn-outline play-master-btn" data-master-id="${m.id}">
            <span>▶ تشغيل الماستركلاس (${m.duration})</span>
          </button>
          <a href="${m.url}" target="_blank" rel="noopener" class="icon-btn" title="Open in YouTube">
            ↗
          </a>
        </div>
      </div>
    `).join('');
  }

  // --- 10. Render Video Vault (49 Curriculum Videos) ---
  const videoGrid = document.getElementById('videoGrid');
  const videoSearchInput = document.getElementById('videoSearchInput');
  const videoFilterPills = document.getElementById('videoFilterPills');

  function renderVideos() {
    if (!videoGrid || !data.videos) return;
    const query = state.searchQuery.toLowerCase().trim();
    const filter = state.activeVideoFilter;

    const filtered = data.videos.filter(v => {
      const matchFilter = (filter === 'All') || (v.category === filter);
      const matchQuery = !query || v.title.toLowerCase().includes(query) || v.category.toLowerCase().includes(query) || String(v.week).includes(query);
      return matchFilter && matchQuery;
    });

    if (filtered.length === 0) {
      videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--mb-clr-text-muted);">
          No videos found matching your filter criteria.
        </div>
      `;
      return;
    }

    videoGrid.innerHTML = filtered.map(v => `
      <div class="video-card">
        <div class="video-thumb-wrap">
          <img src="https://img.youtube.com/vi/${v.yt_id}/hqdefault.jpg" alt="${v.title}" class="video-thumb" loading="lazy" onerror="this.src='assets/images/chipset_logo.png'">
          <div class="video-overlay"></div>
          <button class="video-play-icon play-video-btn" data-video-id="${v.id}" data-yt-id="${v.yt_id}" data-title="${v.title}" title="Play Video">
            ▶
          </button>
        </div>
        <div class="video-card-body">
          <span class="video-tag">الأسبوع ${v.week} • ${v.category}</span>
          <h4 class="video-title">${v.title}</h4>
          <div class="video-card-footer">
            <button class="btn btn-outline play-video-btn" style="padding: 6px 14px; font-size: 11.5px; width: 100%;" data-video-id="${v.id}" data-yt-id="${v.yt_id}" data-title="${v.title}">
              ▶ تشغيل الدرس المنهجي
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }
  renderVideos();

  // Video Filter Clicks
  if (videoFilterPills) {
    videoFilterPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      state.activeVideoFilter = pill.dataset.filter;
      videoFilterPills.querySelectorAll('.filter-pill').forEach(p => {
        p.classList.toggle('active', p === pill);
      });
      renderVideos();
    });
  }

  // Video Search Input
  if (videoSearchInput) {
    videoSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderVideos();
    });
  }

  // --- 11. Render Speaking Bank (Expected Questions Booklet) ---
  const speakingGrid = document.getElementById('speakingGrid');
  if (speakingGrid && data.speakingBank) {
    speakingGrid.innerHTML = `
      <!-- Golden Rules Card -->
      <div class="speaking-card" style="border-top: 4px solid var(--mb-clr-pr-1);">
        <div class="speaking-header">
          <span class="speaking-part-badge">The 9 Golden Rules</span>
          <a href="Expected Speaking Questions Booklet Final-1.pdf" target="_blank" rel="noopener" class="btn-session-watch" style="padding: 3px 8px; font-size: 10px;">
            📄 فتح الكتيب 51 صفحة
          </a>
        </div>
        <h4 class="speaking-topic">قواعد Band 8 الذهبية في التحدث</h4>
        <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; font-size:12.5px; color:#E2E8F0; line-height:1.6;" class="ar-text">
          ${data.speakingBank.goldenRules.map(r => `
            <li style="position:relative; padding-right:16px;"><span style="position:absolute; right:0; color:var(--mb-clr-pr-1);">✦</span> ${r}</li>
          `).join('')}
        </ul>
      </div>

      <!-- High-Yield Idioms Card -->
      <div class="speaking-card" style="border-top: 4px solid var(--mb-clr-sd-1);">
        <div class="speaking-header">
          <span class="speaking-part-badge">2-3 Idioms Strictly</span>
          <span style="font-size: 11px; color: var(--mb-clr-pr-1); font-weight: 700;">بدون إفراط (عقوبة Band 5)</span>
        </div>
        <h4 class="speaking-topic">مصطلحات Band 8 ذات العائد العالي</h4>
        <div style="display:flex; flex-direction:column; gap:10px; font-size:12px;">
          ${data.speakingBank.highYieldIdioms.slice(0, 6).map(i => `
            <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 6px;">
              <div style="font-weight: 800; color: var(--mb-clr-sd-1); font-family: var(--mb-font-head); font-size: 13px;">${i.idiom}</div>
              <div style="color: #CBD5E1;" class="ar-text">${i.meaning}</div>
              <div style="color: var(--mb-clr-text-muted); font-size: 11px; margin-top: 2px;"><em>"${i.example}"</em></div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Cue Cards with WHTFM -->
      ${data.speakingBank.cueCards.map(cc => `
        <div class="speaking-card">
          <div class="speaking-header">
            <span class="speaking-part-badge">Part 2 Cue Card (WHTFM)</span>
            <span style="font-size: 11px; color: var(--mb-clr-sd-1); font-weight: 700;">دقيقتين تحدث</span>
          </div>
          <h4 class="speaking-topic">${cc.topic}</h4>
          <div class="speaking-sample-box ar-text">
            <div style="font-weight: 800; color: #FFF; margin-bottom: 6px;">مخطط WHTFM النموذجي:</div>
            <div style="font-size: 11.5px; line-height: 1.6; color: #E2E8F0;">
              <strong>W:</strong> ${cc.whtfmOutline.W}<br>
              <strong>H:</strong> ${cc.whtfmOutline.H}<br>
              <strong>T:</strong> ${cc.whtfmOutline.T}<br>
              <strong>F:</strong> ${cc.whtfmOutline.F}<br>
              <strong>M:</strong> ${cc.whtfmOutline.M}
            </div>
          </div>
        </div>
      `).join('')}
    `;
  }

  // --- 12. Render The 7 Fatal Grammar Mistakes Table ---
  const grammarTableBody = document.getElementById('grammarTableBody');
  if (grammarTableBody && data.fatalGrammarMistakes) {
    grammarTableBody.innerHTML = data.fatalGrammarMistakes.map(item => `
      <tr>
        <td>
          <span class="matrix-error-title">${item.name}</span>
          <div style="font-size: 11.5px; color: var(--mb-clr-sd-1); margin-top: 4px;" class="ar-text">${item.rule}</div>
        </td>
        <td>
          <div class="matrix-code-block wrong">${item.bad}</div>
        </td>
        <td>
          <div class="matrix-code-block correct">${item.good}</div>
        </td>
        <td>
          <span class="matrix-penalty-badge ar-text">${item.penalty}</span>
        </td>
      </tr>
    `).join('');
  }

  // --- 13. Weekly Slides Deck Presentation Modal Engine ---
  const slidesModal = document.getElementById('slidesDeckModal');
  const slideWeekTitle = document.getElementById('slideDeckWeekTitle');
  const slideCounterEl = document.getElementById('slideDeckCounter');
  const slideCanvasEl = document.getElementById('slideDeckCanvas');
  const slideIndicatorsEl = document.getElementById('slideDeckIndicators');
  const slidePrevBtn = document.getElementById('slideDeckPrevBtn');
  const slideNextBtn = document.getElementById('slideDeckNextBtn');
  const slideCloseBtn = document.getElementById('slideDeckCloseBtn');
  const slideFullscreenBtn = document.getElementById('slideDeckFullscreenBtn');

  function openWeekSlides(weekNum) {
    const slides = (data.weeklySlides && data.weeklySlides[String(weekNum)]) || [];
    if (!slides || slides.length === 0) {
      alert(`لا توجد شرائح متاحة للأسبوع ${weekNum} حالياً.`);
      return;
    }
    state.currentSlideDeckWeek = weekNum;
    state.currentWeekSlidesList = slides;
    state.currentSlideIndex = 0;

    if (slidesModal) {
      slidesModal.classList.add('active');
      renderSlide();
    }
  }

  function renderSlide() {
    const slides = state.currentWeekSlidesList;
    const curIdx = state.currentSlideIndex;
    const s = slides[curIdx];
    if (!s || !slideCanvasEl) return;

    const files = (data.weekFiles && data.weekFiles[String(state.currentSlideDeckWeek)]) || [];

    if (slideWeekTitle) {
      slideWeekTitle.innerHTML = `<span>📽️</span> الأسبوع ${state.currentSlideDeckWeek}: ${s.category || 'ماستر كلاس'}`;
    }
    if (slideCounterEl) {
      slideCounterEl.textContent = `الشريحة ${curIdx + 1} من ${slides.length}`;
    }

    slideCanvasEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <span class="slide-category-badge">⚡ ${s.category || 'ماستر كلاس'}</span>
        <span style="font-size: 12px; color: var(--mb-clr-sd-1); font-weight: 700; font-family: var(--mb-font-head);">SLIDE ${curIdx + 1} / ${slides.length}</span>
      </div>

      <h2 class="slide-heading">${s.title}</h2>
      <div class="slide-subheading">${s.subtitle || ''}</div>

      <div class="slide-content-text ar-text">
        ${s.content}
      </div>

      <!-- Referenced Files on Slide -->
      ${files.length > 0 ? `
        <div style="margin-top: 14px; padding: 10px 14px; background: rgba(0,0,0,0.3); border-radius: 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="font-size: 11px; font-weight: 700; color: var(--mb-clr-sd-1);">📄 المستندات المرجعية:</span>
          ${files.map(f => `
            <a href="${f.path}" target="_blank" rel="noopener" class="btn-session-watch" style="padding: 4px 10px; font-size: 11px; flex: 0 0 auto;">
              <span>📥</span> ${f.name}
            </a>
          `).join('')}
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px;">
        ${s.discussionTopic ? `
          <div class="slide-formula-card" style="border-right: 4px solid var(--mb-clr-sd-1); background: rgba(255, 188, 24, 0.06);">
            <div style="font-size: 11px; font-weight: 800; color: var(--mb-clr-sd-1); text-transform: uppercase;">🎯 محور نقاش الحصة الفعلية:</div>
            <div style="font-size: 13px; color: #E2E8F0; margin-top: 4px;" class="ar-text">${s.discussionTopic}</div>
          </div>
        ` : ''}

        ${s.formula ? `
          <div class="slide-formula-card" style="border-right: 4px solid var(--mb-clr-pr-1); background: rgba(255, 96, 47, 0.06);">
            <div style="font-size: 11px; font-weight: 800; color: var(--mb-clr-pr-1); text-transform: uppercase;">📐 القاعدة / المعادلة الذهبية:</div>
            <div style="font-size: 13px; font-weight: 800; color: #FFF; margin-top: 4px;">${s.formula}</div>
          </div>
        ` : ''}

        ${s.teacherNote ? `
          <div class="slide-formula-card" style="grid-column: span 2; border-right: 4px solid #38BDF8; background: rgba(56, 189, 248, 0.06);">
            <div style="font-size: 11px; font-weight: 800; color: #38BDF8; text-transform: uppercase;">💡 توجيه وتنبيه المدرب:</div>
            <div style="font-size: 13px; color: #CBD5E1; margin-top: 4px;" class="ar-text">${s.teacherNote}</div>
          </div>
        ` : ''}
      </div>
    `;

    if (slidePrevBtn) slidePrevBtn.disabled = (curIdx === 0);
    if (slideNextBtn) slideNextBtn.disabled = (curIdx === slides.length - 1);

    if (slideIndicatorsEl) {
      slideIndicatorsEl.innerHTML = slides.map((_, i) => `
        <div class="slide-dot ${i === curIdx ? 'active' : ''}" data-slide-index="${i}"></div>
      `).join('');
    }
  }

  if (slidePrevBtn) {
    slidePrevBtn.addEventListener('click', () => {
      if (state.currentSlideIndex > 0) {
        state.currentSlideIndex--;
        renderSlide();
      }
    });
  }

  if (slideNextBtn) {
    slideNextBtn.addEventListener('click', () => {
      if (state.currentSlideIndex < state.currentWeekSlidesList.length - 1) {
        state.currentSlideIndex++;
        renderSlide();
      }
    });
  }

  if (slideCloseBtn) {
    slideCloseBtn.addEventListener('click', () => {
      if (slidesModal) slidesModal.classList.remove('active');
    });
  }

  if (slideFullscreenBtn) {
    slideFullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        slidesModal.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  if (slideIndicatorsEl) {
    slideIndicatorsEl.addEventListener('click', (e) => {
      const dot = e.target.closest('.slide-dot');
      if (dot) {
        state.currentSlideIndex = parseInt(dot.dataset.slideIndex, 10);
        renderSlide();
      }
    });
  }

  // Keyboard navigation for slides modal
  document.addEventListener('keydown', (e) => {
    if (!slidesModal || !slidesModal.classList.contains('active')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      if (state.currentSlideIndex < state.currentWeekSlidesList.length - 1) {
        state.currentSlideIndex++;
        renderSlide();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (state.currentSlideIndex > 0) {
        state.currentSlideIndex--;
        renderSlide();
      }
    } else if (e.key === 'Escape') {
      slidesModal.classList.remove('active');
    } else if (e.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) {
        slidesModal.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  // --- 14. Video Player Modal Engine ---
  const videoModal = document.getElementById('videoModal');
  const modalIframe = document.getElementById('modalVideoIframe');
  const modalTitle = document.getElementById('modalVideoTitle');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  function openVideoModal(ytId, title) {
    if (!videoModal || !modalIframe) return;
    modalTitle.textContent = title || "IELTS Video Lecture";
    modalIframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
    videoModal.classList.add('active');
  }

  function closeVideoModal() {
    if (!videoModal || !modalIframe) return;
    modalIframe.src = '';
    videoModal.classList.remove('active');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeVideoModal);
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.play-video-btn');
    if (btn) {
      const ytId = btn.dataset.ytId;
      const title = btn.dataset.title;
      openVideoModal(ytId, title);
    }
  });

  // Foreign Master Play Button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.play-master-btn');
    if (btn) {
      const masterId = btn.dataset.masterId;
      const master = data.foreignMasters.find(m => m.id === masterId);
      if (master) {
        openVideoModal(master.yt_id, `${master.teacher} - ${master.title}`);
      }
    }
  });

  // --- 15. Progress Tracking & Metrics ---
  function updateProgressMetrics() {
    let totalTasks = 0;
    data.weeks.forEach(w => {
      totalTasks += (w.tasks ? w.tasks.length : 0);
    });
    if (totalTasks === 0) totalTasks = 28;

    const completed = state.completedTasks.length;
    const pct = Math.round((completed / totalTasks) * 100);

    const navPct = document.getElementById('navProgressPct');
    const navBar = document.getElementById('navProgressBar');
    const heroStat = document.getElementById('heroCompletedTasks');

    if (navPct) animateValue(navPct, parseInt(navPct.textContent) || 0, pct, 500, '%');
    if (navBar) navBar.style.width = pct + '%';
    if (heroStat) heroStat.textContent = `${completed} / ${totalTasks}`;
  }
  updateProgressMetrics();

  // --- 16. Theme Switcher (Dark / Light Mode) ---
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
    } else {
      document.body.classList.remove('light-theme');
      if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
    }
    localStorage.setItem('ielts_theme', theme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
      const next = (current === 'light') ? 'dark' : 'light';
      applyTheme(next);
    });
  }

  // Init theme from localStorage
  const savedTheme = localStorage.getItem('ielts_theme') || 'dark';
  applyTheme(savedTheme);

  console.log("IELTS Master Portal initialized with 100% precision and complete Metobuild theme.");
});
