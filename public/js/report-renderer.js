/**
 * IELTS Feedback Report Renderer
 */

let currentFeedbackData = null;
let currentEssayData = null;
let activeMistakeFilter = 'all';

export function renderFeedbackReport(essayRecord, feedback) {
  currentEssayData = essayRecord;
  currentFeedbackData = feedback;

  const container = document.getElementById('report-content-area');
  if (!container) return;

  const scores = feedback.scores || {};
  const overallBand = scores.overall_band || 6.0;
  const scorePct = Math.round((overallBand / 9.0) * 100);

  const isTask1 = essayRecord?.task_type === 'task_1_academic' || essayRecord?.task_type === 'task_1_general';
  const isFreeText = essayRecord?.task_type === 'free_text';
  const trCodeLabel = isFreeText ? 'Topic Focus' : (isTask1 ? 'TA (25%)' : 'TR (25%)');
  const defaultTrName = isFreeText ? 'Topic Focus & Ideas' : (isTask1 ? 'Task Achievement (TA)' : 'Task Response (TR)');

  const taskTypeNames = {
    task_2: 'Writing Task 2 (مقال أكاديمي - 250+ كلمة)',
    task_1_academic: 'Writing Task 1 (تقرير أكاديمي - 150+ كلمة)',
    task_1_general: 'Writing Task 1 (رسالة عامة - 150+ كلمة)',
    free_text: 'تدريب على نص/فقرة حُرّة'
  };
  const displayTaskName = taskTypeNames[essayRecord?.task_type] || (essayRecord?.task_type || 'Task 2').replace(/_/g, ' ');

  const trScore = scores.task_achievement_or_response || { band: 6.0, criterion_name: defaultTrName, justification: '' };
  const ccScore = scores.coherence_cohesion || { band: 6.0, criterion_name: 'Coherence and Cohesion', justification: '' };
  const lrScore = scores.lexical_resource || { band: 6.0, criterion_name: 'Lexical Resource', justification: '' };
  const graScore = scores.grammatical_range_accuracy || { band: 6.0, criterion_name: 'Grammatical Range & Accuracy', justification: '' };

  const summary = feedback.executive_summary || {};
  const wordAnalysis = summary.word_count_analysis || { count: essayRecord.word_count, status: 'sufficient' };
  const mistakes = feedback.detailed_mistakes || [];
  const recurringMistakes = mistakes.filter(m => m.is_recurring);

  // Build Recurring Alert Banner HTML if any
  let recurringBannerHtml = '';
  if (recurringMistakes.length > 0) {
    const pills = recurringMistakes.map(m => `
      <span class="recurring-pill">
        ⚠️ ${m.rule_friendly_name} (${m.history_count}x)
      </span>
    `).join('');

    recurringBannerHtml = `
      <div class="recurring-alert-box">
        <div class="alert-icon">🚨</div>
        <div class="alert-content" style="flex:1;">
          <h4>تنبيه مصحح الآيلتس: تم رصد أخطاء متكررة من مقالاتك السابقة!</h4>
          <p>
            لقد وقعت في هذه القواعد النحوية/الدلالية في مقالات سابقة مسجلة في حسابك. تكرار نفس الخطأ هو العائق الأكبر أمام وصولك للباند 7+.
          </p>
          <div class="recurring-tags-list">
            ${pills}
          </div>
        </div>
      </div>
    `;
  }

  // Rewrite Paragraphs HTML
  const rewriteHtml = (feedback.paragraph_by_paragraph_review || []).map(p => `
    <div class="rewrite-paragraph-card">
      <div class="rewrite-header">
        <span>فقرة ${p.paragraph_number}: ${p.type || 'Body Paragraph'}</span>
        <span class="badge badge-success">مستوى Band 8.5+</span>
      </div>
      <div style="padding:1rem; font-size:0.88rem; color:var(--text-secondary); background:white; border-bottom:1px solid var(--border-color);">
        <strong>ملاحظة الفاحص:</strong> ${p.feedback}
      </div>
      <div class="rewrite-content">
        ${p.improved_version}
      </div>
    </div>
  `).join('');

  // Action Plan HTML
  const actionPlanHtml = (feedback.action_plan || []).map((step, idx) => `
    <div class="action-step-item">
      <div class="step-badge">${idx + 1}</div>
      <div class="step-text">${step}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="report-wrapper">
      <!-- Top Action Bar -->
      <div class="report-top-actions">
        <div class="report-title-info">
          <h2>تقرير تشخيص الأداء المعتمد (Official Diagnostic Report)</h2>
          <p>الطالب: <strong>${essayRecord.student_name || 'Guest'}</strong> | نوع الاختبار: <strong>${displayTaskName}</strong> | التاريخ: <strong>${new Date(essayRecord.created_at).toLocaleDateString('ar-EG', { dateStyle: 'long' })}</strong></p>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button id="print-pdf-btn" class="btn btn-primary btn-sm">
            🖨️ طباعة وتصدير PDF رسمي
          </button>
        </div>
      </div>

      <!-- Executive Score Banner -->
      <div class="executive-score-banner">
        <div class="band-gauge" style="--score-pct: ${scorePct};">
          <div class="band-gauge-inner">
            <span class="band-number">${overallBand.toFixed(1)}</span>
            <span class="band-label">Overall Band</span>
          </div>
        </div>

        <div class="executive-meta">
          <h3>تقييم فاحص الآيلتس (Examiner's Verdict)</h3>
          <p class="executive-verdict">${summary.examiner_verdict || 'تم تقييم المقال وفق معايير كامبريدج ومجلس الثقافة البريطاني الرسمية.'}</p>
          
          <div style="margin-top:1rem; display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${(summary.key_strengths || []).map(s => `<span class="badge badge-success">✓ ${s}</span>`).join('')}
            ${(summary.primary_weaknesses || []).map(w => `<span class="badge badge-danger">✗ ${w}</span>`).join('')}
          </div>
        </div>

        <div class="executive-stats-list">
          <div class="stat-row">
            <span class="stat-label">عدد الكلمات:</span>
            <span class="stat-val">${wordAnalysis.count} كلمة</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">حالة النصاب:</span>
            <span class="stat-val" style="color: ${wordAnalysis.status === 'sufficient' ? '#4ade80' : '#f87171'}">
              ${wordAnalysis.status === 'sufficient' ? 'مكتمل رسمي' : 'أقل من المطلوب ⚠️'}
            </span>
          </div>
          <div class="stat-row">
            <span class="stat-label">الأخطاء المرصودة:</span>
            <span class="stat-val">${mistakes.length} خطأ</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">أخطاء متكررة:</span>
            <span class="stat-val" style="color:${recurringMistakes.length > 0 ? '#f87171' : '#4ade80'}">${recurringMistakes.length}</span>
          </div>
        </div>
      </div>

      <!-- Recurring Alert Banner -->
      ${recurringBannerHtml}

      <!-- 4 Criteria Cards -->
      <div class="criteria-grid">
        <!-- TR / TA -->
        <div class="criteria-card">
          <div class="criteria-header">
            <span class="criteria-code">${trCodeLabel}</span>
            <span class="criteria-band">Band ${trScore.band?.toFixed(1) || '6.0'}</span>
          </div>
          <div class="criteria-name">${trScore.criterion_name || defaultTrName}</div>
          <div class="criteria-justification">${trScore.justification}</div>
        </div>

        <!-- CC -->
        <div class="criteria-card">
          <div class="criteria-header">
            <span class="criteria-code">CC (25%)</span>
            <span class="criteria-band">Band ${ccScore.band?.toFixed(1) || '6.0'}</span>
          </div>
          <div class="criteria-name">${ccScore.criterion_name || 'Coherence & Cohesion'}</div>
          <div class="criteria-justification">${ccScore.justification}</div>
        </div>

        <!-- LR -->
        <div class="criteria-card">
          <div class="criteria-header">
            <span class="criteria-code">LR (25%)</span>
            <span class="criteria-band">Band ${lrScore.band?.toFixed(1) || '6.0'}</span>
          </div>
          <div class="criteria-name">${lrScore.criterion_name || 'Lexical Resource'}</div>
          <div class="criteria-justification">${lrScore.justification}</div>
        </div>

        <!-- GRA -->
        <div class="criteria-card">
          <div class="criteria-header">
            <span class="criteria-code">GRA (25%)</span>
            <span class="criteria-band">Band ${graScore.band?.toFixed(1) || '6.0'}</span>
          </div>
          <div class="criteria-name">${graScore.criterion_name || 'Grammatical Range & Accuracy'}</div>
          <div class="criteria-justification">${graScore.justification}</div>
        </div>
      </div>

      <!-- Detailed Mistakes Section -->
      <div class="mistakes-section">
        <div class="section-header">
          <div class="section-title">
            <span>🔍 تحليل الأخطاء التراكمية والقواعد الواجب تغطيتها</span>
            <span class="badge badge-primary">${mistakes.length}</span>
          </div>

          <div class="mistake-filter-tabs">
            <button class="filter-btn active" data-filter="all">الكل (${mistakes.length})</button>
            <button class="filter-btn" data-filter="GRA">نحو (${mistakes.filter(m => m.category === 'GRA').length})</button>
            <button class="filter-btn" data-filter="LR">مفردات (${mistakes.filter(m => m.category === 'LR').length})</button>
            <button class="filter-btn" data-filter="CC">ترابط (${mistakes.filter(m => m.category === 'CC').length})</button>
            <button class="filter-btn" data-filter="recurring" style="color:var(--danger);">متكررة فقط (${recurringMistakes.length})</button>
          </div>
        </div>

        <div id="filtered-mistakes-container" class="mistakes-list">
          <!-- Populated by filter -->
        </div>
      </div>

      <!-- Model Rewrite Section -->
      ${rewriteHtml ? `
        <div class="rewrite-section">
          <div class="section-title">
            <span>✨ إعادة الصياغة النموذجية بمستوى Band 8+ (Model Revision)</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">
            قارن أسلوب كتابتك بنسخة احترافية تحافظ على أفكارك الأصلية ولكن بتراكيب لغوية معقدة ومفردات أكاديمية سلسة:
          </p>
          ${rewriteHtml}
        </div>
      ` : ''}

      <!-- Action Plan Section -->
      <div class="action-plan-section">
        <div class="section-title">
          <span>🚀 خطة العمل المباشرة لرفع الباند في المحاولة القادمة (Action Plan)</span>
        </div>
        <div class="action-steps-list">
          ${actionPlanHtml}
        </div>
      </div>
    </div>
  `;

  // Render Mistake List with Filter
  renderMistakesList();

  // Attach Filter Listeners
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMistakeFilter = btn.getAttribute('data-filter');
      renderMistakesList();
    });
  });

  // Attach Print PDF Listener
  const printBtn = container.querySelector('#print-pdf-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

function renderMistakesList() {
  const container = document.getElementById('filtered-mistakes-container');
  if (!container || !currentFeedbackData) return;

  const mistakes = currentFeedbackData.detailed_mistakes || [];
  let filtered = mistakes;

  if (activeMistakeFilter === 'recurring') {
    filtered = mistakes.filter(m => m.is_recurring);
  } else if (activeMistakeFilter !== 'all') {
    filtered = mistakes.filter(m => m.category === activeMistakeFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">
        لا توجد أخطاء تندرج تحت هذا التصنيف. عمل ممتاز!
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(m => `
    <div class="mistake-card ${m.is_recurring ? 'is-recurring' : ''}">
      <div class="mistake-meta">
        <div class="mistake-tags">
          <span class="badge ${m.category === 'GRA' ? 'badge-primary' : m.category === 'LR' ? 'badge-success' : 'badge-warning'}">
            ${m.category}
          </span>
          ${m.is_recurring ? `
            <span class="badge badge-danger">⚠️ متكرر (${m.history_count} مرات)</span>
          ` : ''}
          <span class="badge badge-warning" style="font-size:0.7rem;">${m.severity || 'moderate'}</span>
        </div>
        <span style="font-family:monospace; font-size:0.78rem; color:var(--text-muted);">${m.rule_tag}</span>
      </div>

      <div class="rule-name">
        ${m.rule_friendly_name || m.rule_tag}
      </div>

      <div class="snippet-comparison">
        <div class="snippet-original">
          <strong>النص في مقالك:</strong>
          <span>"${m.original_snippet}"</span>
        </div>
        <div class="snippet-suggested">
          <strong>التصحيح المقترح:</strong>
          <span>"${m.suggested_correction}"</span>
        </div>
      </div>

      <div class="mistake-explanation">
        ${m.explanation}
      </div>

      ${m.rule_micro_lesson ? `
        <div class="micro-lesson-box">
          <span>💡 <strong>القاعدة للعلاج وتجنب تكراره:</strong> ${m.rule_micro_lesson}</span>
        </div>
      ` : ''}
    </div>
  `).join('');
}
