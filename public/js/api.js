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

export async function createStudent(payload) {
  const body = typeof payload === 'string' ? { name: payload } : payload;
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.student;
}

export async function updateStudentStatus(id, status) {
  const res = await fetch(`${API_BASE}/students/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.student;
}

export async function deleteStudent(id) {
  const res = await fetch(`${API_BASE}/students/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function loginStudentByCode(code) {
  const res = await fetch(`${API_BASE}/students/login-by-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.student;
}

export async function verifyAdminPin(pin) {
  const res = await fetch(`${API_BASE}/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'رمز مرور غير صحيح');
  return data;
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
  if (!data.success) {
    const err = new Error(data.error || 'Evaluation failed');
    err.is_pending_activation = data.is_pending_activation;
    err.student_id = data.student_id;
    err.access_code = data.access_code;
    err.teacher_whatsapp = data.teacher_whatsapp;
    throw err;
  }
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
