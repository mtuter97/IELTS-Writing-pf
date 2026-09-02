import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getStudentsHandler,
  createStudentHandler,
  getStudentDetailsHandler,
  evaluateEssayHandler,
  getEssayHandler,
  getSettingsHandler,
  saveSettingsHandler
} from './controllers/feedback-controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/students', getStudentsHandler);
app.post('/api/students', createStudentHandler);
app.get('/api/students/:id', getStudentDetailsHandler);

app.post('/api/evaluate', evaluateEssayHandler);
app.get('/api/essays/:id', getEssayHandler);

app.get('/api/settings', getSettingsHandler);
app.post('/api/settings', saveSettingsHandler);

// Fallback for SPA routing if accessed through Express
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default app;
