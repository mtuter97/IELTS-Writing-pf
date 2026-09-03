import { submitEssayEvaluation } from './api.js';
import { getActiveStudent } from './student.js';

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
  ]
};

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
  const submitBtn = document.getElementById('submit-essay-btn');

  // Task type selection
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTaskType = btn.getAttribute('data-type');
      updateTaskDefaults();
    });
  });

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
      }
    });
  }

  function updateTaskDefaults() {
    populatePromptPicker();
    const minWords = currentTaskType === 'task_2' ? 250 : 150;
    const minutes = currentTaskType === 'task_2' ? 40 : 20;
    secondsRemaining = minutes * 60;
    updateTimerDisplay();
    updateWordCount();
  }

  // Word Counter
  function updateWordCount() {
    const text = essayInput.value.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minWords = currentTaskType === 'task_2' ? 250 : 150;

    const counterPill = document.getElementById('word-count-pill');
    const countNumber = document.getElementById('word-count-number');
    const countMin = document.getElementById('word-count-min');

    if (countNumber) countNumber.textContent = words;
    if (countMin) countMin.textContent = minWords;

    if (counterPill) {
      counterPill.classList.remove('under', 'near', 'ready');
      if (words >= minWords) {
        counterPill.classList.add('ready');
      } else if (words >= minWords - 20) {
        counterPill.classList.add('near');
      } else {
        counterPill.classList.add('under');
      }
    }
  }

  if (essayInput) {
    essayInput.addEventListener('input', updateWordCount);
  }

  // Timer logic
  function updateTimerDisplay() {
    if (!timerDisplay) return;
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const timerBox = document.getElementById('timer-box');
    if (timerBox) {
      if (secondsRemaining <= 300) { // 5 mins left
        timerBox.classList.add('warning');
      } else {
        timerBox.classList.remove('warning');
      }
    }
  }

  const playIconSvg = '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const pauseIconSvg = '<svg class="svg-icon svg-icon-xs" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  function toggleTimer() {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
    } else {
      isTimerRunning = true;
      if (timerToggleBtn) timerToggleBtn.innerHTML = pauseIconSvg;
      timerInterval = setInterval(() => {
        if (secondsRemaining > 0) {
          secondsRemaining--;
          updateTimerDisplay();
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
          if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
          alert('⏰ انتهى الوقت المحدد للمهمة!');
        }
      }, 1000);
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    if (timerToggleBtn) timerToggleBtn.innerHTML = playIconSvg;
    const activePill = document.querySelector('.timer-preset-btn.active');
    const minutes = activePill ? (parseInt(activePill.getAttribute('data-mins'), 10) || 40) : (currentTaskType === 'task_2' ? 40 : 20);
    secondsRemaining = minutes * 60;
    updateTimerDisplay();
  }

  // Duration Slider Preset Pills
  const timerPresetBtns = document.querySelectorAll('.timer-preset-btn');
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
      const student = getActiveStudent();

      if (!text) {
        alert('يرجى كتابة أو لصق نص المقال أولاً.');
        return;
      }

      const words = text.split(/\s+/).filter(Boolean).length;
      const minRequired = currentTaskType === 'task_2' ? 250 : 150;
      if (words < 50) {
        alert(`المقال قصير جداً (${words} كلمة). لا يمكن للفاحص تقييم مقال يقل عن 50 كلمة.`);
        return;
      }

      if (words < minRequired) {
        const proceed = confirm(`تنبيه: عدد الكلمات (${words}) أقل من الحد الأدنى الرسمي المطلوب (${minRequired} كلمة). في اختبار الآيلتس سيؤدي هذا لخصم درجات في معيار Task Response. هل تود المتابعة والتقييم على أي حال؟`);
        if (!proceed) return;
      }

      // 🔒 Strict Authorization Check: Only active paid students can evaluate
      if (!student) {
        const studentModal = document.getElementById('student-modal');
        if (studentModal) studentModal.classList.add('open');
        const loginError = document.getElementById('login-modal-error');
        if (loginError) {
          loginError.style.display = 'block';
          loginError.textContent = '🔒 محاكي التقييم متاح حصرياً للطلاب المشتركين. أدخل كود الدخول الخاص بك أو تواصل مع المعلم لاستلام الكود.';
        }
        alert('🔒 تنبيه الاشتراك:\n\nمحاكي التقييم وتشخيص الأخطاء متاح حصرياً للطلاب المشتركين والمفعلين.\n\nيرجى تسجيل الدخول بكود الطالب الخاص بك، أو التواصل مع المعلم لتفعيل اشتراكك.');
        return;
      }

      if (student.status !== 'active') {
        const banner = document.getElementById('subscription-notice-banner');
        if (banner) {
          banner.style.display = 'block';
          banner.scrollIntoView({ behavior: 'smooth' });
        }
        alert('⏳ تنبيه الاشتراك:\n\nحسابك بانتظار إدخال كود التفعيل من المعلم. يرجى التواصل مع المعلم عبر الواتساب لتفعيل حسابك.');
        return;
      }

      // Show animated loading overlay with diagnostic steps
      const overlay = document.getElementById('evaluating-overlay');
      const stepText = document.getElementById('eval-step-text');
      if (overlay) overlay.classList.add('active');

      const steps = [
        'قراءة المقال وتحليله وفق معايير كامبريدج الرسمية...',
        'فحص معيار Task Response وتغطية الأفكار الرئيسية...',
        'تدقيق التماسك والترابط (Coherence & Cohesion) والفقرات...',
        'تشخيص دقة المفردات والتراكيب الأكاديمية (Lexical Resource)...',
        'مراجعة القواعد النحوية (GRA) ومطابقتها مع سجل أخطائك السابقة...',
        'تجميع التقرير وحساب الباند النهائي وتوليد التوصيات...'
      ];

      let stepIdx = 0;
      const stepInterval = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        if (stepText) stepText.textContent = steps[stepIdx];
      }, 2500);

      try {
        const payload = {
          student_id: student ? student.id : null,
          task_type: currentTaskType,
          prompt_question: promptText,
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
          const loginError = document.getElementById('login-modal-error');
          if (loginError) {
            loginError.style.display = 'block';
            loginError.textContent = err.message;
          }
          alert(`🔒 تنبيه الاشتراك:\n${err.message}`);
        } else if (err.is_pending_activation) {
          const banner = document.getElementById('subscription-notice-banner');
          if (banner) {
            banner.style.display = 'block';
            banner.scrollIntoView({ behavior: 'smooth' });
          }
          alert(`⚠️ تنبيه الاشتراك:\n${err.message}`);
        } else {
          alert(`حدث خطأ أثناء التقييم:\n${err.message}\n\nيرجى التأكد من إدخال مفتاح الـ API بشكل صحيح في شاشة الإعدادات.`);
        }
      }
    });
  }

  // Initial setup
  updateTaskDefaults();
}
