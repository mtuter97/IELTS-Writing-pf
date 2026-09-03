/**
 * API Client Layer with Privacy and Secure Admin Headers
 */

const API_BASE = '/api';

export function getStoredAdminPin() {
  return localStorage.getItem('ielts_admin_pin') || sessionStorage.getItem('ielts_admin_pin') || '';
}

export function setStoredAdminPin(pin) {
  if (pin) {
    localStorage.setItem('ielts_admin_pin', pin);
    sessionStorage.setItem('ielts_admin_pin', pin);
  } else {
    localStorage.removeItem('ielts_admin_pin');
    sessionStorage.removeItem('ielts_admin_pin');
  }
}

function getAdminHeaders() {
  const pin = getStoredAdminPin();
  const headers = { 'Content-Type': 'application/json' };
  if (pin) {
    headers['x-admin-pin'] = pin;
  }
  return headers;
}

export async function fetchStudents() {
  const res = await fetch(`${API_BASE}/students`, {
    headers: getAdminHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.students;
}

export async function createStudent(payload) {
  const body = typeof payload === 'string' ? { name: payload } : payload;
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.student;
}

export async function updateStudentStatus(id, status) {
  const res = await fetch(`${API_BASE}/students/${id}/status`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.student;
}

export async function deleteStudent(id) {
  const res = await fetch(`${API_BASE}/students/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders()
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

export async function authWithGoogle(googleData) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(googleData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'فشل تسجيل الدخول عبر Google');
  return data;
}

export async function activateStudentByCode(studentId, code) {
  const res = await fetch(`${API_BASE}/students/${studentId}/activate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'كود التفعيل غير صحيح');
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
  setStoredAdminPin(pin);
  return data;
}

export async function fetchStudentDetails(id) {
  const res = await fetch(`${API_BASE}/students/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function fetchStudentMasterFile(id) {
  const res = await fetch(`${API_BASE}/students/${id}/file`, {
    headers: getAdminHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.student_file;
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
    err.requires_login = data.requires_login;
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
    headers: getAdminHeaders(),
    body: JSON.stringify(settings)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}
