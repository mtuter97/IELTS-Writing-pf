import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const studentsDir = path.resolve(__dirname, '../data/students');

const officialStudents = [
  {
    id: "stu_official_8567",
    name: "طالب مجتهد",
    phone: "01097971972",
    access_code: "IELTS-8567",
    status: "active",
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    target_band: 7.5,
    essays_history: [],
    mistakes_history: [],
    created_at: "2026-09-02T10:00:00.000Z",
    updated_at: "2026-09-03T21:00:00.000Z"
  },
  {
    id: "stu_official_4117",
    name: "البطل محمود",
    phone: "12345678910",
    access_code: "IELTS-4117",
    status: "active",
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    target_band: 7.5,
    essays_history: [],
    mistakes_history: [],
    created_at: "2026-09-02T10:05:00.000Z",
    updated_at: "2026-09-03T21:00:00.000Z"
  },
  {
    id: "stu_official_1282",
    name: "البطل يزيد",
    phone: "01090317220",
    access_code: "IELTS-1282",
    status: "active",
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    target_band: 7.5,
    essays_history: [],
    mistakes_history: [],
    created_at: "2026-09-02T10:10:00.000Z",
    updated_at: "2026-09-03T21:00:00.000Z"
  },
  {
    id: "stu_official_2605",
    name: "روان الجميله",
    phone: "01094130302",
    access_code: "IELTS-2605",
    status: "active",
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    target_band: 7.5,
    essays_history: [],
    mistakes_history: [],
    created_at: "2026-09-02T10:15:00.000Z",
    updated_at: "2026-09-03T21:00:00.000Z"
  },
  {
    id: "stu_official_7474",
    name: "رغد الجميله",
    phone: "01121663640",
    access_code: "IELTS-7474",
    status: "active",
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    target_band: 7.5,
    essays_history: [],
    mistakes_history: [],
    created_at: "2026-09-02T10:20:00.000Z",
    updated_at: "2026-09-03T21:00:00.000Z"
  },
  {
    id: "stu_official_5739",
    name: "اسيل الجميله",
    phone: "01099061362",
    access_code: "IELTS-5739",
    status: "active",
    essay_count: 0,
    latest_band: null,
    highest_band: null,
    target_band: 7.5,
    essays_history: [],
    mistakes_history: [],
    created_at: "2026-09-02T10:25:00.000Z",
    updated_at: "2026-09-03T21:00:00.000Z"
  }
];

// Clean directory completely
if (fs.existsSync(studentsDir)) {
  const existingFiles = fs.readdirSync(studentsDir);
  for (const f of existingFiles) {
    fs.unlinkSync(path.join(studentsDir, f));
  }
} else {
  fs.mkdirSync(studentsDir, { recursive: true });
}

// Write the 6 official students
for (const s of officialStudents) {
  fs.writeFileSync(path.join(studentsDir, `${s.id}.json`), JSON.stringify(s, null, 2), 'utf-8');
}

console.log('Synchronized students directory to exactly the 6 official students from screenshot.');
