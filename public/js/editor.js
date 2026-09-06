import { submitEssayEvaluation, fetchStudentDetails } from './api.js';
import { getActiveStudent, setActiveStudent } from './student.js';

// Cambridge IELTS Standard Practice Topics
export const PRACTICE_PROMPTS = {
  task_2: [
    {
      title: "Technology & Human Interaction (Cambridge 18)",
      prompt: "Some people believe that technology has made man more social, while others think it has made them more isolated. Discuss both views and give your own opinion."
    },
    {
      title: "Education & University Fees (Cambridge 17)",
      prompt: "Some people think that university education should be free for all students. Others believe that students should pay for their higher education. Discuss both views and give your own opinion."
    },
    {
      title: "Environmental Protection vs Economic Growth (Cambridge 16)",
      prompt: "Many people believe that environmental problems should be solved globally, whereas others think it is the responsibility of individual countries. Discuss both views and give your own opinion."
    },
    {
      title: "Remote Work & Urban Life (Cambridge 19)",
      prompt: "In many cities around the world, people are choosing to work from home instead of commuting to an office. Is this a positive or negative development?"
    }
  ],
  task_1_academic: [
    {
      title: "Energy Consumption Trends (Bar Chart)",
      prompt: "The chart below shows the total energy consumption in five countries between 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
    },
    {
      title: "Water Cycle Process (Diagram)",
      prompt: "The diagram below illustrates the stages in the natural water cycle. Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
    }
  ],
  task_1_general: [
    {
      title: "Formal Letter to Landlord",
      prompt: "You are renting an apartment and there has been a persistent plumbing problem that has not been repaired. Write a letter to your landlord explaining the issue, the impact on your daily life, and the action you expect them to take."
    }
  ],
  free_text: [
    {
      title: "✨ مسودة أو فقرة حرة (Custom Free Paragraph)",
      prompt: "اكتب أو الصق أي نص، مقال، أو فقرة ترغب في تشخيص وتدقيق قواعدها وتراكيبها اللغوية ومفرداتها والارتقاء بها لمستوى Band 8+."
    },
    {
      title: "✨ تدريب على المقدمة (Introduction Paragraph)",
      prompt: "Write an introduction paragraph with paraphrase and clear thesis statement."
    },
    {
      title: "✨ تدريب على فقرة جسم مقال (Body Paragraph with Example)",
      prompt: "Write a body paragraph with a clear topic sentence, supporting explanation, and specific example."
    }
  ]
};

function triggerToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (container) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  } else {
    alert(msg);
  }
}

let timerInterval = null;
let secondsRemaining = 40 * 60;
let isTimerRunning = false;
let currentTaskType = 'task_2';

export function initEditor() {
  const essayInput = document.getElementById('essay-input');
  const promptInput = document.getElementById('prompt-input');
  const typeButtons = document.querySelectorAll('.type-btn');
  const promptPicker = document.getElementById('prompt-select');
  const examModeToggle = document.getElementById('exam-mode-checkbox');
  const timerDisplay = document.getElementById('timer-digits');
  const timerToggleBtn = document.getElementById('timer-toggle-btn');
  const timerResetBtn = document.getElementById('timer-reset-btn');
  const timerPresetBtns = document.querySelectorAll('.timer-preset-btn');
  const submitBtn = document.getElementById('submit-essay-btn');

  const playIconSvg = '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const pauseIconSvg = '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  // Task type selection with persistence
  const savedTaskType = localStorage.getItem('ielts_draft_task_type');
  if (savedTaskType) {
    currentTaskType = savedTaskType;
    typeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === savedTaskType);
    });
  }

  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTaskType = btn.getAttribute('data-type');
      localStorage.setItem('ielts_draft_task_type', currentTaskType);
      updateTaskDefaults();
    });
  });

  // Restore saved drafts if user refreshes page
  const savedPrompt = localStorage.getItem('ielts_draft_prompt');
  if (savedPrompt && promptInput && !promptInput.value) {
    promptInput.value = savedPrompt;
  }

  const savedEssay = localStorage.getItem('ielts_draft_essay');
  if (savedEssay && essayInput && !essayInput.value) {
    essayInput.value = savedEssay;
  }

  if (promptInput) {
    promptInput.addEventListener('input', () => {
      localStorage.setItem('ielts_draft_prompt', promptInput.value);
    });
  }

  // Load Prompt Dropdown
  function populatePromptPicker() {
    if (!promptPicker) return;
    promptPicker.innerHTML = '<option value="">-- اختر موضوعاً نموذجياً من اختبارات كامبريدج --</option>';
    const list = PRACTICE_PROMPTS[currentTaskType] || [];
    list.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = p.title;
      promptPicker.appendChild(opt);
    });
  }

  if (promptPicker) {
    promptPicker.addEventListener('change', (e) => {
      const idx = e.target.value;
      const list = PRACTICE_PROMPTS[currentTaskType] || [];
      if (idx !== '' && list[idx]) {
        promptInput.value = list[idx].prompt;
        localStorage.setItem('ielts_draft_prompt', promptInput.value);
      }
    });
  }

  function updateTaskDefaults() {
    populatePromptPicker();
    const isFree = currentTaskType === 'free_text';
    const minWords = isFree ? 0 : (currentTaskType === 'task_2' ? 250 : 150);
    
    // Determine standard duration according to IELTS task guidelines
    let defaultMins = 40;
    if (currentTaskType === 'task_1_academic' || currentTaskType === 'task_1_general') {
      defaultMins = 20;
    } else if (isFree) {
      // For free paragraph / text, match active preset or default to 40 (or 20)
      const activePill = document.querySelector('.timer-preset-btn.active');
      defaultMins = activePill ? (parseInt(activePill.getAttribute('data-mins'), 10) || 40) : 40;
    } else {
      defaultMins = 40;
    }

    if (timerPresetBtns && timerPresetBtns.length > 0) {
      timerPresetBtns.forEach(btn => {
        const mins = parseInt(btn.getAttribute('data-mins'), 10);
        btn.classList.toggle('active', mins === defaultMins);
      });
    }

    // Stop and reset timer cleanly if running
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
    }

    secondsRemaining = defaultMins * 60;
    updateTimerDisplay();
    updateWordCount();

    if (isFree) {
      if (promptInput) promptInput.placeholder = "اكتب موضوعك أو اترك هذا الحقل فارغاً لتقييم النص مباشرة...";
      if (essayInput) essayInput.placeholder = "اكتب أو الصق أي نص أو فقرة بأي عدد من الكلمات، وسيقوم الفاحص بتشخيص القواعد والمفردات والترابط وتقديم نموذج تحسين Band 8+...";
    } else {
      if (promptInput) promptInput.placeholder = "الصق نص السؤال هنا...";
      if (essayInput) essayInput.placeholder = "ابدأ بكتابة مقالك هنا مباشرة...";
    }

    const tipTextEl = document.getElementById('task-criteria-tip-text');
    if (tipTextEl) {
      if (currentTaskType === 'task_1_academic') {
        tipTextEl.innerHTML = `<strong>معايير Task 1 (تقرير أكاديمي):</strong> المعيار هو <b>Task Achievement (150 كلمة كحد أدنى)</b>. ⚠️ شرط حاسم: كتابة نظرة عامة شاملة (Overview) واستخراج المعالم الرئيسية مع دعمها بالأرقام. تجنب تماماً إبداء أي رأي شخصي أو تفسيرات غير موجودة في الرسم البياني!`;
      } else if (currentTaskType === 'task_1_general') {
        tipTextEl.innerHTML = `<strong>معايير Task 1 (رسالة عامة):</strong> المعيار هو <b>Task Achievement (150 كلمة كحد أدنى)</b>. ⚠️ شرط حاسم: توضيح الغرض من الرسالة من السطر الأول، تغطية النقاط الثلاث، والالتزام بأسلوب (رسمي أو ودي) متسق دون خلط.`;
      } else if (isFree) {
        tipTextEl.innerHTML = `<strong>وضع التدريب على فقرة حرة:</strong> بدون قيود على عدد الكلمات. يركز الفاحص 100% على سلامة القواعد (GRA)، دقة وتنوع المفردات (LR)، والترابط وسلاسة الجمل (CC) مع تقديم صياغة نموذجية Band 8.5+.`;
      } else {
        tipTextEl.innerHTML = `<strong>معايير Task 2 (مقال أكاديمي):</strong> المعيار هو <b>Task Response (250 كلمة كحد أدنى - ثلثا الدرجة)</b>. ⚠️ شرط حاسم: تغطية جميع عناصر السؤال (مثل مناقشة الرأيين معاً)، وتحديد موقف واضح طوال المقال، وتطوير الحجج بأمثلة وشروحات منطقية دون استطراد.`;
      }
    }
  }

  // Word Counter
  function updateWordCount() {
    const text = essayInput.value.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const isFree = currentTaskType === 'free_text';
    const minWords = isFree ? 0 : (currentTaskType === 'task_2' ? 250 : 150);

    const counterPill = document.getElementById('word-count-pill');
    const countNumber = document.getElementById('word-count-number');
    const countMin = document.getElementById('word-count-min');

    if (countNumber) countNumber.textContent = words;
    if (countMin) {
      countMin.textContent = isFree ? 'حر' : minWords;
    }

    if (counterPill) {
      counterPill.classList.remove('under', 'near', 'ready');
      if (isFree || words >= minWords) {
        counterPill.classList.add('ready');
      } else if (words >= minWords - 20) {
        counterPill.classList.add('near');
      } else {
        counterPill.classList.add('under');
      }
    }
  }

  if (essayInput) {
    essayInput.addEventListener('input', () => {
      updateWordCount();
      localStorage.setItem('ielts_draft_essay', essayInput.value);
    });
  }

  // Gentle Web Audio chime on timer completion
  function playTimerChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Audio context restricted or unavailable
    }
  }

  // Timer logic
  function updateTimerDisplay() {
    if (!timerDisplay) return;
    const mins = Math.max(0, Math.floor(secondsRemaining / 60));
    const secs = Math.max(0, secondsRemaining % 60);
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const timerBox = document.getElementById('timer-box');
    if (timerBox) {
      if ((isTimerRunning && secondsRemaining <= 300) || secondsRemaining === 0) {
        timerBox.classList.add('warning');
      } else {
        timerBox.classList.remove('warning');
      }
    }
  }

  function toggleTimer() {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
      updateTimerDisplay();
    } else {
      // Safety guard: if timer is at 00:00 (or less), reset to selected preset before starting
      if (secondsRemaining <= 0) {
        const activePill = document.querySelector('.timer-preset-btn.active');
        const defaultMins = activePill ? (parseInt(activePill.getAttribute('data-mins'), 10) || 40) : (currentTaskType === 'task_2' ? 40 : 20);
        secondsRemaining = defaultMins * 60;
        const timerBox = document.getElementById('timer-box');
        if (timerBox) timerBox.classList.remove('warning');
      }

      isTimerRunning = true;
      if (timerToggleBtn) timerToggleBtn.innerHTML = pauseIconSvg;
      updateTimerDisplay();

      timerInterval = setInterval(() => {
        if (secondsRemaining > 1) {
          secondsRemaining--;
          updateTimerDisplay();
        } else if (secondsRemaining === 1) {
          secondsRemaining = 0;
          updateTimerDisplay();
          clearInterval(timerInterval);
          isTimerRunning = false;
          if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
          const timerBox = document.getElementById('timer-box');
          if (timerBox) timerBox.classList.add('warning');
          playTimerChime();
          triggerToast('⏰ انتهى الوقت المحدد للمهمة! يمكنك مراجعة مقالك وتسليمه للتقييم.', 'warning');
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
          if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
        }
      }, 1000);
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
    const activePill = document.querySelector('.timer-preset-btn.active');
    const defaultMins = activePill ? (parseInt(activePill.getAttribute('data-mins'), 10) || 40) : (currentTaskType === 'task_2' ? 40 : 20);
    secondsRemaining = defaultMins * 60;
    updateTimerDisplay();
    const timerBox = document.getElementById('timer-box');
    if (timerBox) timerBox.classList.remove('warning');
    triggerToast('تمت إعادة ضبط المؤقت بنجاح.', 'info');
  }

  // Duration Slider Preset Pills
  timerPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mins = parseInt(btn.getAttribute('data-mins'), 10) || 40;
      clearInterval(timerInterval);
      isTimerRunning = false;
      if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
      secondsRemaining = mins * 60;
      updateTimerDisplay();
      const timerBox = document.getElementById('timer-box');
      if (timerBox) timerBox.classList.remove('warning');
    });
  });

  if (timerToggleBtn) timerToggleBtn.addEventListener('click', toggleTimer);
  if (timerResetBtn) timerResetBtn.addEventListener('click', resetTimer);

  // Exam Mode Toggle
  if (examModeToggle) {
    examModeToggle.addEventListener('change', (e) => {
      const isExam = e.target.checked;
      if (essayInput) {
        essayInput.spellcheck = !isExam;
        essayInput.setAttribute('autocorrect', isExam ? 'off' : 'on');
        essayInput.setAttribute('autocapitalize', isExam ? 'off' : 'sentences');
        if (isExam) {
          essayInput.classList.add('exam-mode-active');
        } else {
          essayInput.classList.remove('exam-mode-active');
        }
      }
    });
  }

  // Submit Essay for Evaluation
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const text = essayInput.value.trim();
      const promptText = promptInput.value.trim();
      let student = getActiveStudent();

      if (!text) {
        triggerToast('يرجى كتابة أو لصق النص أولاً في مساحة الكتابة.', 'error');
        if (essayInput) essayInput.focus();
        return;
      }

      // Check if user is logged in
      if (!student) {
        const studentModal = document.getElementById('student-modal');
        if (studentModal) studentModal.classList.add('open');
        triggerToast('يرجى تسجيل الدخول بكود الطالب أو حساب Google للمتابعة.', 'info');
        return;
      }

      if (student.status !== 'active') {
        // Fast re-check with server if teacher just activated
        try {
          const freshData = await fetchStudentDetails(student.id);
          const freshStudent = (freshData && freshData.student) ? freshData.student : freshData;
          if (freshStudent && freshStudent.status === 'active') {
            student = freshStudent;
            setActiveStudent(student);
          }
        } catch (_) {}
      }

      if (student.status !== 'active') {
        const banner = document.getElementById('subscription-notice-banner');
        if (banner) {
          banner.style.display = 'block';
          banner.scrollIntoView({ behavior: 'smooth' });
        }
        triggerToast('حسابك بانتظار إدخال كود التفعيل من المعلم لتشغيل أداة التقييم.', 'warning');
        return;
      }

      // Show animated loading overlay with diagnostic steps
      const overlay = document.getElementById('evaluating-overlay');
      const stepText = document.getElementById('eval-step-text');
      if (overlay) overlay.classList.add('active');

      const isFree = currentTaskType === 'free_text';
      const steps = isFree ? [
        'قراءة النص وتحليله وفق القواعد الأكاديمية...',
        'تشخيص القواعد النحوية (GRA) وتراكيب الجمل...',
        'فحص المفردات والتلازم اللفظي الأكاديمي (LR)...',
        'تدقيق الترابط والتماسك والأسلوب اللغوي (CC)...',
        'صياغة نموذج إعادة الكتابة Band 8+ والتقرير النهائي...'
      ] : [
        'قراءة المقال وتحليله وفق معايير كامبريدج الرسمية...',
        'فحص معيار Task Response وتغطية الأفكار الرئيسية...',
        'تدقيق التماسك والترابط (Coherence & Cohesion) والفقرات...',
        'تشخيص دقة المفردات والتراكيب الأكاديمية (Lexical Resource)...',
        'مراجعة القواعد النحوية (GRA) ومطابقتها مع سجل أخطائك السابقة...',
        'تجميع التقرير وحساب الباند النهائي وتوليد التوصيات...'
      ];

      let stepIdx = 0;
      if (stepText) stepText.textContent = steps[0];
      const stepInterval = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        if (stepText) stepText.textContent = steps[stepIdx];
      }, 2000);

      try {
        const payload = {
          student_id: student ? student.id : null,
          task_type: currentTaskType,
          prompt_question: promptText || (isFree ? 'تقييم نص حر' : 'موضوع غير محدد'),
          essay_content: text
        };

        const result = await submitEssayEvaluation(payload);
        clearInterval(stepInterval);
        if (overlay) overlay.classList.remove('active');

        // Dispatch event to show report
        window.dispatchEvent(new CustomEvent('evaluation-completed', { detail: result }));

      } catch (err) {
        clearInterval(stepInterval);
        if (overlay) overlay.classList.remove('active');
        
        if (err.requires_login) {
          const studentModal = document.getElementById('student-modal');
          if (studentModal) studentModal.classList.add('open');
          triggerToast(`🔒 ${err.message}`, 'error');
        } else if (err.is_pending_activation) {
          const banner = document.getElementById('subscription-notice-banner');
          if (banner) {
            banner.style.display = 'block';
            banner.scrollIntoView({ behavior: 'smooth' });
          }
          triggerToast(`⚠️ ${err.message}`, 'warning');
        } else {
          triggerToast(`فشل التقييم: ${err.message}`, 'error');
        }
      }
    });
  }

  // Initial setup
  updateTaskDefaults();
}
