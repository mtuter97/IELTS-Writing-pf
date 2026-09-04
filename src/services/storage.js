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

// In-memory cache for serverless performance & resilience
const memoryStudents = new Map();
const memoryEssays = new Map();
let memorySettings = null;

const SEED_DATA_DIR = path.resolve(__dirname, '../../data');
const SEED_STUDENTS_DIR = path.join(SEED_DATA_DIR, 'students');
const SEED_ESSAYS_DIR = path.join(SEED_DATA_DIR, 'essays');
const SEED_SETTINGS_FILE = path.join(SEED_DATA_DIR, 'settings.json');

// Ensure base directories exist safely & seed initial files
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

// ==========================================
// 1. SMART CODE NORMALIZATION & SANITIZATION
// ==========================================

/**
 * Normalizes any student code entered by human or copied from WhatsApp
 * - Converts Arabic-Indic numbers (٠-٩) to ASCII (0-9)
 * - Strips invisible Unicode direction markers (RLM, LRM, ZWSP, etc.)
 * - Replaces all dashes/en-dashes with a standard hyphen '-'
 * - Collapses spaces around hyphens and trims
 */
export function normalizeStudentCode(input) {
  if (!input || typeof input !== 'string') return '';
  // Strip Unicode directional marks (LRM, RLM, LRE, RLE, PDF, LRO, RLO, ZWSP, BOM)
  let s = input.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '').trim();
  // Normalize Arabic-Indic digits to 0-9
  const arabicIndic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  s = s.replace(/[٠-٩]/g, d => {
    const idx = arabicIndic.indexOf(d);
    return idx !== -1 ? String(idx) : d;
  });
  // Normalize various dashes/hyphens to standard '-'
  s = s.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');
  // Strip redundant spaces around hyphens (e.g. "IELTS - 1282" -> "IELTS-1282")
  s = s.replace(/\s*-\s*/g, '-').trim();
  return s.toUpperCase();
}

/**
 * Extracts digits only from normalized string
 */
export function extractDigits(input) {
  const norm = normalizeStudentCode(input);
  return norm.replace(/[^0-9]/g, '');
}

// ==========================================
// 2. PERSISTENT CLOUD STORAGE ADAPTER (KV)
// ==========================================

function getKvConfig() {
  const envUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const envToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (envUrl && envToken) {
    return { url: envUrl.replace(/\/$/, ''), token: envToken };
  }

  // Check memory settings if saved via UI
  if (memorySettings && memorySettings.kv_rest_api_url && memorySettings.kv_rest_api_token) {
    return {
      url: memorySettings.kv_rest_api_url.trim().replace(/\/$/, ''),
      token: memorySettings.kv_rest_api_token.trim()
    };
  }

  // Check settings file
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (parsed.kv_rest_api_url && parsed.kv_rest_api_token) {
        return {
          url: parsed.kv_rest_api_url.trim().replace(/\/$/, ''),
          token: parsed.kv_rest_api_token.trim()
        };
      }
    } catch (_) {}
  }

  return null;
}

export function isCloudStorageConfigured() {
  return Boolean(getKvConfig());
}

async function kvExecute(cmd) {
  const cfg = getKvConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cmd)
    });
    if (!res.ok) {
      console.warn(`KV error [${res.status}]:`, await res.text());
      return null;
    }
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn('KV command execution failed:', err.message);
    return null;
  }
}

async function kvPipeline(commands) {
  const cfg = getKvConfig();
  if (!cfg || !commands.length) return [];
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map(d => d.result);
  } catch (err) {
    console.warn('KV pipeline execution failed:', err.message);
    return [];
  }
}

// Initial seeding flag to prevent repeated seeding per process
let hasSeededKv = false;

async function maybeSeedKv() {
  if (hasSeededKv || !isCloudStorageConfigured()) return;
  try {
    const existingIds = await kvExecute(['SMEMBERS', 'ielts:students_set']);
    if (!Array.isArray(existingIds) || existingIds.length === 0) {
      console.log('Seeding initial students into Cloud KV storage...');
      const localStudents = readDiskStudents();
      const pipelineCmds = [];
      for (const st of localStudents) {
        pipelineCmds.push(['SET', `ielts:student:${st.id}`, JSON.stringify(st)]);
        pipelineCmds.push(['SADD', 'ielts:students_set', st.id]);
      }

      const localEssays = readDiskEssays();
      for (const ess of localEssays) {
        pipelineCmds.push(['SET', `ielts:essay:${ess.id}`, JSON.stringify(ess)]);
        pipelineCmds.push(['SADD', 'ielts:all_essays_set', ess.id]);
        if (ess.student_id) {
          pipelineCmds.push(['SADD', `ielts:student_essays:${ess.student_id}`, ess.id]);
        }
      }

      if (pipelineCmds.length > 0) {
        await kvPipeline(pipelineCmds);
      }
    }
    hasSeededKv = true;
  } catch (e) {
    console.warn('Failed to auto-seed KV:', e.message);
  }
}

// ==========================================
// 3. DISK HELPERS
// ==========================================

function readDiskStudents() {
  ensureDirs();
  const dirToRead = fs.existsSync(STUDENTS_DIR) ? STUDENTS_DIR : SEED_STUDENTS_DIR;
  if (!fs.existsSync(dirToRead)) return [];
  const files = fs.readdirSync(dirToRead).filter(f => f.endsWith('.json'));
  const students = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dirToRead, file), 'utf-8');
      students.push(JSON.parse(content));
    } catch (_) {}
  }
  return students;
}

function readDiskEssays() {
  ensureDirs();
  const dirToRead = fs.existsSync(ESSAYS_DIR) ? ESSAYS_DIR : SEED_ESSAYS_DIR;
  if (!fs.existsSync(dirToRead)) return [];
  const files = fs.readdirSync(dirToRead).filter(f => f.endsWith('.json'));
  const essays = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dirToRead, file), 'utf-8');
      essays.push(JSON.parse(content));
    } catch (_) {}
  }
  return essays;
}

// ==========================================
// 4. CORE STUDENT OPERATIONS
// ==========================================

export async function getAllStudents() {
  ensureDirs();
  await maybeSeedKv();

  if (isCloudStorageConfigured()) {
    try {
      const ids = await kvExecute(['SMEMBERS', 'ielts:students_set']);
      if (Array.isArray(ids) && ids.length > 0) {
        const mgetCmd = ['MGET', ...ids.map(id => `ielts:student:${id}`)];
        const rawList = await kvExecute(mgetCmd);
        const students = [];
        if (Array.isArray(rawList)) {
          for (const raw of rawList) {
            if (raw) {
              try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                students.push(parsed);
                memoryStudents.set(parsed.id, parsed);
              } catch (_) {}
            }
          }
        }
        if (students.length > 0) {
          return students.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
        }
      }
    } catch (e) {
      console.warn('Error fetching students from KV, falling back:', e.message);
    }
  }

  // Local disk & Memory fallback
  const diskStudents = readDiskStudents();
  for (const st of diskStudents) {
    if (!memoryStudents.has(st.id)) {
      memoryStudents.set(st.id, st);
    }
  }

  const all = Array.from(memoryStudents.values());
  return all.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
}

export async function getStudent(id) {
  if (!id) return null;
  ensureDirs();

  // 1. Check in-memory
  if (memoryStudents.has(id)) {
    return memoryStudents.get(id);
  }

  // 2. Check KV if configured
  if (isCloudStorageConfigured()) {
    try {
      const raw = await kvExecute(['GET', `ielts:student:${id}`]);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        memoryStudents.set(id, parsed);
        return parsed;
      }
    } catch (_) {}
  }

  // 3. Check disk
  const studentPath = path.join(STUDENTS_DIR, `${id}.json`);
  if (fs.existsSync(studentPath)) {
    try {
      const content = fs.readFileSync(studentPath, 'utf-8');
      const parsed = JSON.parse(content);
      memoryStudents.set(id, parsed);
      return parsed;
    } catch (_) {}
  }

  const seedPath = path.join(SEED_STUDENTS_DIR, `${id}.json`);
  if (fs.existsSync(seedPath)) {
    try {
      const content = fs.readFileSync(seedPath, 'utf-8');
      const parsed = JSON.parse(content);
      memoryStudents.set(id, parsed);
      return parsed;
    } catch (_) {}
  }

  return null;
}

export async function createStudent(name, phone = '', status = 'active', notes = '') {
  ensureDirs();
  const trimmed = name.trim();
  const id = 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const access_code = 'IELTS-' + Math.floor(1000 + Math.random() * 9000);

  const newStudent = {
    id,
    access_code,
    name: trimmed,
    phone: phone.trim(),
    status: status || 'active',
    subscription_price: 100,
    notes: notes.trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    essays_history: []
  };

  memoryStudents.set(id, newStudent);

  // Save to KV
  if (isCloudStorageConfigured()) {
    try {
      await kvPipeline([
        ['SET', `ielts:student:${id}`, JSON.stringify(newStudent)],
        ['SADD', 'ielts:students_set', id]
      ]);
    } catch (e) {
      console.warn('Failed saving student to KV:', e.message);
    }
  }

  // Save to disk
  try {
    fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(newStudent, null, 2), 'utf-8');
  } catch (_) {}

  return newStudent;
}

export async function updateStudent(id, partial) {
  ensureDirs();
  const current = await getStudent(id);
  if (!current) return null;

  const updated = {
    ...current,
    ...partial,
    updated_at: new Date().toISOString()
  };

  memoryStudents.set(id, updated);

  // Save to KV
  if (isCloudStorageConfigured()) {
    try {
      await kvExecute(['SET', `ielts:student:${id}`, JSON.stringify(updated)]);
    } catch (e) {
      console.warn('Failed updating student in KV:', e.message);
    }
  }

  // Save to disk
  try {
    fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(updated, null, 2), 'utf-8');
  } catch (_) {}

  return updated;
}

export async function deleteStudent(id) {
  ensureDirs();
  memoryStudents.delete(id);

  if (isCloudStorageConfigured()) {
    try {
      await kvPipeline([
        ['DEL', `ielts:student:${id}`],
        ['SREM', 'ielts:students_set', id],
        ['DEL', `ielts:student_essays:${id}`]
      ]);
    } catch (_) {}
  }

  try {
    const studentPath = path.join(STUDENTS_DIR, `${id}.json`);
    if (fs.existsSync(studentPath)) fs.unlinkSync(studentPath);
  } catch (_) {}

  return true;
}

/**
 * Intelligent Code Resolution:
 * Matches access_code, digits-only (e.g. 1282 or ١٢٨٢), phone, email, or id
 */
export async function getStudentByCode(codeOrId) {
  if (!codeOrId) return null;
  const rawClean = (codeOrId || '').trim();
  const normalizedInput = normalizeStudentCode(rawClean);
  const inputDigits = extractDigits(rawClean);

  const all = await getAllStudents();

  // 1. Direct match on normalized access code
  let match = all.find(s => {
    const sc = normalizeStudentCode(s.access_code || '');
    return sc && sc === normalizedInput;
  });
  if (match) return match;

  // 2. Direct match on ID, Phone, or Email
  match = all.find(s => 
    (s.id && s.id.toLowerCase() === rawClean.toLowerCase()) ||
    (s.phone && s.phone.replace(/[^0-9]/g, '') === inputDigits && inputDigits.length >= 7) ||
    (s.email && s.email.toLowerCase() === rawClean.toLowerCase())
  );
  if (match) return match;

  // 3. Smart digits matching (e.g. student inputs '1282' or '١٢٨٢' for 'IELTS-1282')
  if (inputDigits && inputDigits.length >= 3) {
    match = all.find(s => {
      const studentDigits = extractDigits(s.access_code || '');
      return studentDigits && (studentDigits === inputDigits || studentDigits.endsWith(inputDigits));
    });
    if (match) return match;
  }

  // 4. Fuzzy check if user entered code without hyphen e.g. "IELTS1282"
  const strippedInput = normalizedInput.replace(/[^A-Z0-9]/g, '');
  match = all.find(s => {
    const strippedCode = normalizeStudentCode(s.access_code || '').replace(/[^A-Z0-9]/g, '');
    return strippedCode && strippedCode === strippedInput;
  });

  return match || null;
}

export async function findOrCreateGoogleStudent({ name, email, picture, google_id }) {
  ensureDirs();
  const all = await getAllStudents();
  const cleanEmail = (email || '').trim().toLowerCase();

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
      existing = await updateStudent(existing.id, partial);
    }
    return existing;
  }

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
    status: 'pending', // Pending by default until activated with code or teacher 1-click
    subscription_price: 100,
    notes: 'تسجيل دخول جديد عبر Google - بانتظار إرسال كود التفعيل بالواتساب',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    essays_history: []
  };

  memoryStudents.set(id, newStudent);

  if (isCloudStorageConfigured()) {
    try {
      await kvPipeline([
        ['SET', `ielts:student:${id}`, JSON.stringify(newStudent)],
        ['SADD', 'ielts:students_set', id]
      ]);
    } catch (_) {}
  }

  try {
    fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(newStudent, null, 2), 'utf-8');
  } catch (_) {}

  return newStudent;
}

export async function activateStudentWithCode(studentId, code) {
  ensureDirs();
  const student = await getStudent(studentId);
  if (!student) {
    return { success: false, error: 'حساب الطالب غير موجود في النظام.' };
  }

  const normalizedInput = normalizeStudentCode(code);
  const inputDigits = extractDigits(code);
  const studentCode = normalizeStudentCode(student.access_code || '');
  const studentDigits = extractDigits(student.access_code || '');

  const isExactCode = normalizedInput && normalizedInput === studentCode;
  const isDigitsMatch = inputDigits && studentDigits && (inputDigits === studentDigits || studentDigits.endsWith(inputDigits));
  const isHyphenlessMatch = normalizedInput.replace(/[^A-Z0-9]/g, '') === studentCode.replace(/[^A-Z0-9]/g, '');

  if (!isExactCode && !isDigitsMatch && !isHyphenlessMatch) {
    return { 
      success: false, 
      error: 'كود التفعيل غير صحيح. يمكنك إدخال الكود كاملاً (مثال: IELTS-4098) أو إدخال الأرقام فقط (مثال: 4098).' 
    };
  }

  const updated = await updateStudent(studentId, {
    status: 'active',
    activated_at: new Date().toISOString()
  });

  return { success: true, student: updated };
}

// ==========================================
// 5. CORE ESSAY OPERATIONS
// ==========================================

export async function saveEssay(essay) {
  ensureDirs();
  const id = essay.id || ('ess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const record = {
    ...essay,
    id,
    created_at: essay.created_at || new Date().toISOString()
  };

  memoryEssays.set(id, record);

  // 1. Cloud Storage Save
  if (isCloudStorageConfigured()) {
    try {
      const cmds = [
        ['SET', `ielts:essay:${id}`, JSON.stringify(record)],
        ['SADD', 'ielts:all_essays_set', id]
      ];
      if (record.student_id) {
        cmds.push(['SADD', `ielts:student_essays:${record.student_id}`, id]);
      }
      await kvPipeline(cmds);
    } catch (e) {
      console.warn('Failed saving essay to KV:', e.message);
    }
  }

  // 2. Disk Save
  try {
    fs.writeFileSync(path.join(ESSAYS_DIR, `${id}.json`), JSON.stringify(record, null, 2), 'utf-8');
  } catch (_) {}

  // 3. Update student stats & essay history
  if (record.student_id) {
    const student = await getStudent(record.student_id);
    if (student) {
      const overallBand = record.feedback?.scores?.overall_band || 0;
      const highestBand = Math.max(student.highest_band || 0, overallBand);
      const essaysHistory = Array.isArray(student.essays_history) ? [...student.essays_history] : [];

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

      await updateStudent(record.student_id, {
        essay_count: (student.essay_count || 0) + 1,
        latest_band: overallBand,
        highest_band: highestBand,
        essays_history: essaysHistory.slice(0, 100)
      });
    }
  }

  return record;
}

export async function getEssay(id) {
  if (!id) return null;
  ensureDirs();

  if (memoryEssays.has(id)) {
    return memoryEssays.get(id);
  }

  if (isCloudStorageConfigured()) {
    try {
      const raw = await kvExecute(['GET', `ielts:essay:${id}`]);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        memoryEssays.set(id, parsed);
        return parsed;
      }
    } catch (_) {}
  }

  const essayPath = path.join(ESSAYS_DIR, `${id}.json`);
  if (fs.existsSync(essayPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(essayPath, 'utf-8'));
      memoryEssays.set(id, parsed);
      return parsed;
    } catch (_) {}
  }

  return null;
}

export async function getStudentEssays(studentId) {
  if (!studentId) return [];
  ensureDirs();

  // 1. If KV configured, read from student essay set
  if (isCloudStorageConfigured()) {
    try {
      const ids = await kvExecute(['SMEMBERS', `ielts:student_essays:${studentId}`]);
      if (Array.isArray(ids) && ids.length > 0) {
        const mgetCmd = ['MGET', ...ids.map(id => `ielts:essay:${id}`)];
        const rawList = await kvExecute(mgetCmd);
        const essays = [];
        if (Array.isArray(rawList)) {
          for (const raw of rawList) {
            if (raw) {
              try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                essays.push(parsed);
                memoryEssays.set(parsed.id, parsed);
              } catch (_) {}
            }
          }
        }
        if (essays.length > 0) {
          return essays.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      }
    } catch (_) {}
  }

  // 2. Fallback: check student object's own embedded essays_history
  const student = await getStudent(studentId);
  if (student && Array.isArray(student.essays_history) && student.essays_history.length > 0) {
    return student.essays_history.map(h => ({
      id: h.id,
      student_id: studentId,
      student_name: student.name,
      task_type: h.task_type,
      prompt_question: h.prompt_question,
      essay_content: h.essay_content,
      word_count: h.word_count,
      created_at: h.created_at,
      feedback: h.full_feedback || {}
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // 3. Fallback: scan disk
  const diskEssays = readDiskEssays();
  const matched = diskEssays.filter(e => e.student_id === studentId);
  return matched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getStudentMasterFile(id) {
  ensureDirs();
  const student = await getStudent(id);
  if (!student) return null;
  const fullEssays = await getStudentEssays(id);
  return {
    ...student,
    full_essays: fullEssays
  };
}

// ==========================================
// 6. SETTINGS & AI CONFIGURATION
// ==========================================

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

export async function getSettings() {
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
    subscription_price: 100,
    kv_rest_api_url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    kv_rest_api_token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  };

  const keyFields = ['gemini_api_key', 'groq_api_key', 'openrouter_api_key', 'you_api_key'];

  // Check KV if configured
  if (isCloudStorageConfigured()) {
    try {
      const raw = await kvExecute(['GET', 'ielts:settings']);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const merged = { ...defaults, ...parsed };
        for (const k of keyFields) {
          if (!merged[k] && defaults[k]) merged[k] = defaults[k];
        }
        memorySettings = merged;
        return merged;
      }
    } catch (_) {}
  }

  if (memorySettings) {
    const merged = { ...defaults, ...memorySettings };
    for (const k of keyFields) {
      if (!merged[k] && defaults[k]) merged[k] = defaults[k];
    }
    return merged;
  }

  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      const merged = { ...defaults, ...parsed };
      for (const k of keyFields) {
        if (!merged[k] && defaults[k]) merged[k] = defaults[k];
      }
      memorySettings = merged;
      return merged;
    } catch (_) {}
  }

  return defaults;
}

export async function saveSettings(partial) {
  ensureDirs();
  const current = await getSettings();
  const cleanPartial = {};
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v === 'string' && !v.trim()) continue;
    cleanPartial[k] = v;
  }
  const updated = {
    ...current,
    ...cleanPartial
  };

  memorySettings = updated;

  // Save to KV if configured
  if (isCloudStorageConfigured() || (updated.kv_rest_api_url && updated.kv_rest_api_token)) {
    try {
      await kvExecute(['SET', 'ielts:settings', JSON.stringify(updated)]);
    } catch (_) {}
  }

  // Save to disk
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (_) {}

  return updated;
}
