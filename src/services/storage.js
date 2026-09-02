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

// Ensure base directories exist safely
function ensureDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STUDENTS_DIR)) fs.mkdirSync(STUDENTS_DIR, { recursive: true });
    if (!fs.existsSync(ESSAYS_DIR)) fs.mkdirSync(ESSAYS_DIR, { recursive: true });
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

export function createStudent(name) {
  ensureDirs();
  const trimmed = name.trim();
  const id = 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newStudent = {
    id,
    name: trimmed,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    essay_count: 0,
    latest_band: null,
    highest_band: null
  };
  fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(newStudent, null, 2), 'utf-8');
  return newStudent;
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
  fs.writeFileSync(path.join(STUDENTS_DIR, `${id}.json`), JSON.stringify(updated, null, 2), 'utf-8');
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
  
  // Update student stats
  if (record.student_id) {
    const student = getStudent(record.student_id);
    if (student) {
      const overallBand = record.feedback?.scores?.overall_band || 0;
      const highestBand = Math.max(student.highest_band || 0, overallBand);
      updateStudent(record.student_id, {
        essay_count: (student.essay_count || 0) + 1,
        latest_band: overallBand,
        highest_band: highestBand
      });
    }
  }

  return record;
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

export function getSettings() {
  ensureDirs();
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings = {
      active_provider: process.env.ACTIVE_AI_PROVIDER || 'gemini',
      gemini_api_key: process.env.GEMINI_API_KEY || '',
      groq_api_key: process.env.GROQ_API_KEY || '',
      openrouter_api_key: process.env.OPENROUTER_API_KEY || '',
      gemini_model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      groq_model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      openrouter_model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
    return defaultSettings;
  }
  try {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Fill in environment fallbacks if empty
    return {
      active_provider: parsed.active_provider || process.env.ACTIVE_AI_PROVIDER || 'gemini',
      gemini_api_key: parsed.gemini_api_key || process.env.GEMINI_API_KEY || '',
      groq_api_key: parsed.groq_api_key || process.env.GROQ_API_KEY || '',
      openrouter_api_key: parsed.openrouter_api_key || process.env.OPENROUTER_API_KEY || '',
      gemini_model: parsed.gemini_model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      groq_model: parsed.groq_model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      openrouter_model: parsed.openrouter_model || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
    };
  } catch (e) {
    return {};
  }
}

export function saveSettings(partial) {
  ensureDirs();
  const current = getSettings();
  const updated = {
    ...current,
    ...partial
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
