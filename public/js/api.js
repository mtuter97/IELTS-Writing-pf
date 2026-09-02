/**
 * API Client Layer
 */

const API_BASE = '/api';

export async function fetchStudents() {
  const res = await fetch(`${API_BASE}/students`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.students;
}

export async function createStudent(name) {
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.student;
}

export async function fetchStudentDetails(id) {
  const res = await fetch(`${API_BASE}/students/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function submitEssayEvaluation(payload) {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function fetchEssay(id) {
  const res = await fetch(`${API_BASE}/essays/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.essay;
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.settings;
}

export async function saveSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}
