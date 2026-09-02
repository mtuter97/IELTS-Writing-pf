/**
 * Theme Manager (Light / Dark Mode)
 */

export function initTheme() {
  const savedTheme = localStorage.getItem('ielts_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ielts_theme', theme);

  const icon = document.getElementById('theme-toggle-icon');
  const text = document.getElementById('theme-toggle-text');

  if (icon && text) {
    if (theme === 'dark') {
      icon.textContent = '☀️';
      text.textContent = 'فاتح';
    } else {
      icon.textContent = '🌙';
      text.textContent = 'داكن';
    }
  }
}
