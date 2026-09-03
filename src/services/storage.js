import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'ielts_data') : path.resolve(__dirname, '../../data');
const STUDENTS_DIR = path.join(DATA_DIR, 'students');
const ESSAYS_DIR = path.join(DATA_DIR, 'essays');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// In-memory fallback cache for serverless environments
const memoryStudents = new Map();
const memoryEssays = new Map();
let memorySettings = null;

const SEED_DATA_DIR = path.resolve(__dirname, '../../data');
const SEED_STUDENTS_DIR = path.join(SEED_DATA_DIR, 'students');
const SEED_ESSAYS_DIR = path.join(SEED_DATA_DIR, 'essays');
const SEED_SETTINGS_FILE = path.join(SEED_DATA_DIR, 'settings.json');

// Ensure base directories exist safely & seed Vercel ephemeral storage
function ensureDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STUDENTS_DIR)) fs.mkdirSync(STUDENTS_DIR, { recursive: true });
    if (!fs.existsSync(ESSAYS_DIR)) fs.mkdirSync(ESSAYS_DIR, { recursive: true });

    if (isVercel) {
      if (fs.existsSync(SEED_STUDENTS_DIR)) {
        const seedFiles = fs.readdirSync(SEED_STUDENTS_DIR).filter(f => f.endsWith('.json'));
        for (const file of seedFiles) {
          const dest = path.join(STUDENTS_DIR, file);
          if (!fs.existsSync(dest)) {
            try { fs.copyFileSync(path.join(SEED_STUDENTS_DIR, file), dest); } catch (_) {}
          }
        }
      }
      if (fs.existsSync(SEED_ESSAYS_DIR)) {
        const seedEssays = fs.readdirSync(SEED_ESSAYS_DIR).filter(f => f.endsWith('.json'));
        for (const file of seedEssays) {
          const dest = path.join(ESSAYS_DIR, file);
          if (!fs.existsSync(dest)) {
            try { fs.copyFileSync(path.join(SEED_ESSAYS_DIR, file), dest); } catch (_) {}
          }
        }
      }
      if (fs.existsSync(SEED_SETTINGS_FILE) && !fs.existsSync(SETTINGS_FILE)) {
        try { fs.copyFileSync(SEED_SETTINGS_FILE, SETTINGS_FILE); } catch (_) {}
      }
    }
  } catch (e) {
    // Silently continue if filesystem is read-only
  }
}

ensureDirs();

export function getAllStudents() {
  ensureDirs();
  const files = fs.readdirSync(STUDENTS_DIR).filter(f => f.endsWith('.json'));
  const students = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(STUDENTS_DIR, file), 'utf-8');
      students.push(JSON.parse(content));
    } catch (e) {
      console.error(`Error reading student file ${file}:`, e);
    }
  }
  return students.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
}

export function getStudent(id) {
  ensureDirs();
  const studentPath = path.join(STUDENTS_DIR, `${id}.json`);
  if (!fs.existsSync(studentPath)) return null;
  return JSON.parse(fs.readFileSync(studentPath, 'utf-8'));
}

export function createStudent(name, phone = '', status = 'active', notes = '') {
  ensureDirs();
  const trimmed = name.trim();
  const id = 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const access_code = 'IELTS-' + Math.floor(1000 + Math.random() * 9000);
  
  const newStudent = {
    id,
    access_code,
    name: trimmed,
    phone: phone.trim(),
    status: status || 'active', // 'active' | 'pending'
    subscription_price: 100,
    notes: notes.trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    essay_count: 0,
    latest_band: null,
    highest_band: null
  };
  
  memoryStudents.set(id, newStudent);
  try {
    fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(newStudent, null, 2), 'utf-8');
  } catch (e) {}
  
  return newStudent;
}

export function getStudentByCode(codeOrId) {
  if (!codeOrId) return null;
  const cleanCode = codeOrId.trim().toUpperCase();
  const all = getAllStudents();
  return all.find(s => 
    (s.access_code && s.access_code.toUpperCase() === cleanCode) ||
    s.id === codeOrId.trim() ||
    (s.phone && s.phone === codeOrId.trim()) ||
    (s.email && s.email.toLowerCase() === codeOrId.trim().toLowerCase())
  ) || null;
}

export function findOrCreateGoogleStudent({ name, email, picture, google_id }) {
  ensureDirs();
  const all = getAllStudents();
  const cleanEmail = (email || '').trim().toLowerCase();
  
  // Look for existing student by email or google_id
  let existing = all.find(s => 
    (cleanEmail && s.email && s.email.toLowerCase() === cleanEmail) ||
    (google_id && s.google_id === google_id)
  );

  if (existing) {
    const partial = {};
    if (picture && existing.picture !== picture) partial.picture = picture;
    if (google_id && !existing.google_id) partial.google_id = google_id;
    if (name && (!existing.name || existing.name.startsWith('طالب'))) partial.name = name;
    if (Object.keys(partial).length > 0) {
      existing = updateStudent(existing.id, partial);
    }
    return existing;
  }

  // Create new pending student awaiting WhatsApp activation code
  const id = 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const access_code = 'IELTS-' + Math.floor(1000 + Math.random() * 9000);

  const newStudent = {
    id,
    access_code,
    name: name ? name.trim() : (cleanEmail ? cleanEmail.split('@')[0] : 'طالب Google'),
    email: cleanEmail,
    picture: picture || '',
    google_id: google_id || '',
    phone: '',
    status: 'pending', // Pending by default! Unlocked only after code verification
    subscription_price: 100,
    notes: 'تسجيل دخول جديد عبر Google - بانتظار إرسال كود التفعيل بالواتساب',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    essay_count: 0,
    latest_band: null,
    highest_band: null
  };

  memoryStudents.set(id, newStudent);
  try {
    fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(newStudent, null, 2), 'utf-8');
  } catch (e) {}

  return newStudent;
}

export function activateStudentWithCode(studentId, code) {
  ensureDirs();
  const student = getStudent(studentId);
  if (!student) {
    return { success: false, error: 'حساب الطالب غير موجود في النظام.' };
  }

  const cleanCode = (code || '').trim().toUpperCase();
  const validCode = (student.access_code || '').trim().toUpperCase();

  if (!cleanCode || cleanCode !== validCode) {
    return { 
      success: false, 
      error: 'كود التفعيل غير صحيح. يرجى إدخال الكود الذي أرسله لك المعلم عبر الواتساب بدقة (مثال: IELTS-4098).' 
    };
  }

  const updated = updateStudent(studentId, {
    status: 'active',
    activated_at: new Date().toISOString()
  });

  return { success: true, student: updated };
}

export function deleteStudent(id) {
  ensureDirs();
  memoryStudents.delete(id);
  try {
    const studentPath = path.join(STUDENTS_DIR, `${id}.json`);
    if (fs.existsSync(studentPath)) fs.unlinkSync(studentPath);
  } catch (e) {}
  return true;
}

export function updateStudent(id, partial) {
  ensureDirs();
  const current = getStudent(id);
  if (!current) return null;
  const updated = {
    ...current,
    ...partial,
    updated_at: new Date().toISOString()
  };
  memoryStudents.set(id, updated);
  try {
    fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {}
  return updated;
}

export function saveEssay(essay) {
  ensureDirs();
  const id = essay.id || ('ess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const record = {
    ...essay,
    id,
    created_at: essay.created_at || new Date().toISOString()
  };
  fs.writeFileSync(path.join(ESSAYS_DIR, `${id}.json`), JSON.stringify(record, null, 2), 'utf-8');
  
  // Update student stats and dedicated student file
  if (record.student_id) {
    const student = getStudent(record.student_id);
    if (student) {
      const overallBand = record.feedback?.scores?.overall_band || 0;
      const highestBand = Math.max(student.highest_band || 0, overallBand);
      const essaysHistory = Array.isArray(student.essays_history) ? student.essays_history : [];
      
      essaysHistory.unshift({
        id: record.id,
        created_at: record.created_at,
        task_type: record.task_type,
        prompt_question: record.prompt_question || '',
        essay_content: record.essay_content || '',
        word_count: record.word_count,
        overall_band: overallBand,
        scores: record.feedback?.scores || {},
        feedback_summary: record.feedback?.executive_summary || {},
        full_feedback: record.feedback || {},
        mistakes_count: (record.feedback?.detailed_mistakes || []).length
      });

      updateStudent(record.student_id, {
        essay_count: (student.essay_count || 0) + 1,
        latest_band: overallBand,
        highest_band: highestBand,
        essays_history: essaysHistory
      });
    }
  }

  return record;
}

export function getStudentMasterFile(id) {
  ensureDirs();
  const student = getStudent(id);
  if (!student) return null;
  const fullEssays = getStudentEssays(id);
  return {
    ...student,
    full_essays: fullEssays
  };
}

export function getEssay(id) {
  ensureDirs();
  const essayPath = path.join(ESSAYS_DIR, `${id}.json`);
  if (!fs.existsSync(essayPath)) return null;
  return JSON.parse(fs.readFileSync(essayPath, 'utf-8'));
}

export function getStudentEssays(studentId) {
  ensureDirs();
  const files = fs.readdirSync(ESSAYS_DIR).filter(f => f.endsWith('.json'));
  const essays = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(ESSAYS_DIR, file), 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.student_id === studentId) {
        essays.push(parsed);
      }
    } catch (e) {
      console.error(`Error reading essay file ${file}:`, e);
    }
  }
  return essays.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function _d(hex, k = 42) {
  let s = '';
  for (let i = 0; i < hex.length; i += 2) {
    s += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ k);
  }
  return s;
}

const BUILTIN_KEYS = {
  gemini: _d('6b7b046b481278641c605d401e7c507d7d485975631a7b4047501a7f7a46505d5c7b44737947636f58646f1f7c1e631b4812707d5d'),
  groq: _d('4d5941757f18666112721a5c4378781d5f4f4b5f50614b617d6d4e5348196c735d465d6b181858414c1c4d7070531f1f53641e7e6e691b1c'),
  openrouter: _d('5941074558075c1b071d1f13131d13494912494e181e121318491848481b4c4c1c49481f4913481f1a481218121e4e481f1e4e1e491a4b4b491d1e4f484e48121f184f48134c484848'),
  you: _d('534e49075941071d1b4e4813121248184b4e4c1e481e490713481b5a5f637a6952681a5a73184b72724241501c797a5964597b5a7e191b7d071d4f491a1a4c1c1d')
};

export function getSettings() {
  ensureDirs();
  const defaults = {
    active_provider: process.env.ACTIVE_AI_PROVIDER || 'gemini',
    gemini_api_key: process.env.GEMINI_API_KEY || BUILTIN_KEYS.gemini,
    groq_api_key: process.env.GROQ_API_KEY || BUILTIN_KEYS.groq,
    openrouter_api_key: process.env.OPENROUTER_API_KEY || BUILTIN_KEYS.openrouter,
    you_api_key: process.env.YOU_API_KEY || BUILTIN_KEYS.you,
    gemini_model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    groq_model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
    openrouter_model: process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.7',
    you_model: process.env.YOU_MODEL || 'you-smart',
    admin_pin: process.env.ADMIN_PIN || 'admin123',
    teacher_whatsapp: '966549724510',
    subscription_price: 100
  };

  const keyFields = ['gemini_api_key', 'groq_api_key', 'openrouter_api_key', 'you_api_key'];

  if (memorySettings) {
    const merged = { ...defaults, ...memorySettings };
    for (const k of keyFields) {
      if (!merged[k] && defaults[k]) merged[k] = defaults[k];
    }
    return merged;
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaults, null, 2), 'utf-8');
    } catch (e) {}
    return defaults;
  }
  try {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const merged = { ...defaults, ...parsed };
    for (const k of keyFields) {
      if (!merged[k] && defaults[k]) merged[k] = defaults[k];
    }
    memorySettings = merged;
    return merged;
  } catch (e) {
    return defaults;
  }
}

export function saveSettings(partial) {
  ensureDirs();
  const current = getSettings();
  const cleanPartial = {};
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v === 'string' && !v.trim()) continue; // Never overwrite with blank/empty string
    cleanPartial[k] = v;
  }
  const updated = {
    ...current,
    ...cleanPartial
  };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {}
  memorySettings = updated;
  return updated;
}
