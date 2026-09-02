import {
  getAllStudents,
  getStudent,
  createStudent,
  saveEssay,
  getEssay,
  getStudentEssays,
  getSettings,
  saveSettings
} from '../services/storage.js';
import { getStudentMistakeHistory, correlateAndAnnotateMistakes } from '../services/mistake-tracker.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/system-prompt.js';
import { evaluateWithAI } from '../services/ai-provider.js';
import { calculateOfficialBand, MIN_WORD_COUNTS, IELTS_TASK_TYPES } from '../config/constants.js';

export async function getStudentsHandler(req, res) {
  try {
    const students = getAllStudents();
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function createStudentHandler(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Student name is required.' });
    }
    const student = createStudent(name);
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getStudentDetailsHandler(req, res) {
  try {
    const { id } = req.params;
    const student = getStudent(id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }
    const essays = getStudentEssays(id);
    const mistakeProfile = getStudentMistakeHistory(id);

    // Prepare score progression data
    const scoreHistory = essays.map(e => ({
      id: e.id,
      date: e.created_at,
      task_type: e.task_type,
      overall_band: e.feedback?.scores?.overall_band || 0,
      tr_ta_band: e.feedback?.scores?.task_achievement_or_response?.band || 0,
      cc_band: e.feedback?.scores?.coherence_cohesion?.band || 0,
      lr_band: e.feedback?.scores?.lexical_resource?.band || 0,
      gra_band: e.feedback?.scores?.grammatical_range_accuracy?.band || 0,
      word_count: e.word_count
    }));

    res.json({
      success: true,
      student,
      essays,
      scoreHistory,
      mistakeProfile
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function evaluateEssayHandler(req, res) {
  try {
    const { student_id, task_type = IELTS_TASK_TYPES.TASK_2, prompt_question, essay_content } = req.body;

    if (!essay_content || !essay_content.trim()) {
      return res.status(400).json({ success: false, error: 'Essay content is required.' });
    }

    // Word count calculation
    const words = essay_content.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minThreshold = MIN_WORD_COUNTS[task_type] || 250;

    // Student profile verification
    let student = null;
    let mistakeHistory = null;
    if (student_id) {
      student = getStudent(student_id);
      if (student) {
        mistakeHistory = getStudentMistakeHistory(student_id);
      }
    }

    // Active AI Provider & Key resolution
    const settings = getSettings();
    const provider = settings.active_provider || 'gemini';
    let apiKey = '';
    let model = '';

    if (provider === 'gemini') {
      apiKey = settings.gemini_api_key;
      model = settings.gemini_model;
    } else if (provider === 'groq') {
      apiKey = settings.groq_api_key;
      model = settings.groq_model;
    } else if (provider === 'openrouter') {
      apiKey = settings.openrouter_api_key;
      model = settings.openrouter_model;
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: `No API key configured for provider '${provider}'. Please add your API key in Settings.`
      });
    }

    // Build Prompts
    const systemPrompt = buildSystemPrompt(task_type, mistakeHistory);
    const userPrompt = buildUserPrompt(task_type, prompt_question, essay_content);

    // Call AI
    const rawAiResult = await evaluateWithAI({
      provider,
      apiKey,
      model,
      systemPrompt,
      userPrompt
    });

    // Enforce official Band Score calculation & Rounding
    const scores = rawAiResult.scores || {};
    const trScore = scores.task_achievement_or_response?.band || 6.0;
    const ccScore = scores.coherence_cohesion?.band || 6.0;
    const lrScore = scores.lexical_resource?.band || 6.0;
    const graScore = scores.grammatical_range_accuracy?.band || 6.0;

    const calculatedOverall = calculateOfficialBand({
      task_response: trScore,
      coherence_cohesion: ccScore,
      lexical_resource: lrScore,
      grammatical_range_accuracy: graScore
    });
    scores.overall_band = calculatedOverall;

    // Annotate detailed mistakes with recurring indicators
    const rawMistakes = rawAiResult.detailed_mistakes || [];
    const annotatedMistakes = correlateAndAnnotateMistakes(student_id, rawMistakes);
    rawAiResult.detailed_mistakes = annotatedMistakes;

    // Word count status
    rawAiResult.executive_summary = rawAiResult.executive_summary || {};
    rawAiResult.executive_summary.word_count_analysis = {
      count: wordCount,
      min_required: minThreshold,
      status: wordCount >= minThreshold ? 'sufficient' : 'penalty_risk',
      comment: wordCount >= minThreshold 
        ? `Word count is ${wordCount}, satisfying the ${minThreshold}-word minimum requirement.`
        : `Word count is ${wordCount}, below the ${minThreshold}-word minimum. Examiners will apply a Task Response penalty.`
    };

    // Save Essay Record
    const essayRecord = saveEssay({
      student_id: student?.id || null,
      student_name: student?.name || 'Guest Student',
      task_type,
      prompt_question: prompt_question || '',
      essay_content,
      word_count: wordCount,
      feedback: rawAiResult
    });

    res.json({
      success: true,
      essay: essayRecord,
      feedback: rawAiResult
    });
  } catch (err) {
    console.error('Evaluation Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getEssayHandler(req, res) {
  try {
    const { id } = req.params;
    const essay = getEssay(id);
    if (!essay) {
      return res.status(404).json({ success: false, error: 'Essay not found.' });
    }
    res.json({ success: true, essay });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSettingsHandler(req, res) {
  try {
    const settings = getSettings();
    // Mask sensitive keys when returning to UI
    const masked = {
      active_provider: settings.active_provider,
      gemini_configured: Boolean(settings.gemini_api_key),
      groq_configured: Boolean(settings.groq_api_key),
      openrouter_configured: Boolean(settings.openrouter_api_key),
      gemini_model: settings.gemini_model,
      groq_model: settings.groq_model,
      openrouter_model: settings.openrouter_model
    };
    res.json({ success: true, settings: masked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function saveSettingsHandler(req, res) {
  try {
    const {
      active_provider,
      gemini_api_key,
      groq_api_key,
      openrouter_api_key,
      gemini_model,
      groq_model,
      openrouter_model
    } = req.body;

    const updates = {};
    if (active_provider) updates.active_provider = active_provider;
    if (gemini_api_key !== undefined) updates.gemini_api_key = gemini_api_key.trim();
    if (groq_api_key !== undefined) updates.groq_api_key = groq_api_key.trim();
    if (openrouter_api_key !== undefined) updates.openrouter_api_key = openrouter_api_key.trim();
    if (gemini_model) updates.gemini_model = gemini_model;
    if (groq_model) updates.groq_model = groq_model;
    if (openrouter_model) updates.openrouter_model = openrouter_model;

    const updated = saveSettings(updates);
    res.json({
      success: true,
      message: 'Settings saved successfully.',
      active_provider: updated.active_provider
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
