// shared utility functions used across all pages
const API = (() => {
  if (window.CB_API_BASE) return window.CB_API_BASE;
  if (window.location.protocol.startsWith('http')) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
})();

const THEME_KEY = 'cb_theme';

function normalizeDepartment(department) {
  if (!department) return department;
  const normalized = String(department).trim().toUpperCase().replace(/\s+/g, ' ');
  return ['CSE', 'CSE1', 'CSE 1', 'CSE-1', 'CSE2', 'CSE 2', 'CSE-2'].includes(normalized)
    ? 'CSE'
    : String(department).trim();
}

function getToken() {
  return localStorage.getItem('cb_token');
}

function getUser() {
  const u = localStorage.getItem('cb_user');
  if (!u) return null;

  const user = JSON.parse(u);
  if (user.department) {
    user.department = normalizeDepartment(user.department);
  }
  return user;
}

function saveAuth(token, user) {
  const normalizedUser = {
    ...user,
    department: normalizeDepartment(user.department)
  };
  localStorage.setItem('cb_token', token);
  localStorage.setItem('cb_user', JSON.stringify(normalizedUser));
}

function logout() {
  localStorage.removeItem('cb_token');
  localStorage.removeItem('cb_user');
  window.location.href = '/';
}

// if not logged in, redirect to login
function requireAuth() {
  if (!getToken()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

// if already logged in, redirect to dashboard
function redirectIfAuth() {
  if (getToken()) {
    window.location.href = '/dashboard.html';
  }
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  // if FormData, remove content-type so browser sets it with boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let res;
  try {
    res = await fetch(API + endpoint, { ...options, headers });
  } catch (_) {
    throw new Error('Cannot connect to server. Start backend and verify API port.');
  }

  if (res.status === 401) {
    logout();
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

function showAlert(containerId, message, type = 'success') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => {
    el.innerHTML = '';
  }, 4000);
}

function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', normalized);
  localStorage.setItem(THEME_KEY, normalized);
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.textContent = normalized === 'dark' ? 'Light Mode' : 'Dark Mode';
  });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const systemPrefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  applyTheme(saved || (systemPrefersDark ? 'dark' : 'light'));

  if (
    !document.getElementById('theme-fab') &&
    !document.querySelector('.sidebar') &&
    !document.getElementById('sidebar-container')
  ) {
    const fab = document.createElement('button');
    fab.id = 'theme-fab';
    fab.className = 'theme-fab';
    fab.setAttribute('type', 'button');
    fab.setAttribute('data-theme-toggle', '1');
    document.body.appendChild(fab);
  }

  bindThemeToggles();
}

function bindThemeToggles() {
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    if (btn.dataset.boundTheme === '1') return;
    btn.dataset.boundTheme = '1';
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });

  const current = document.documentElement.getAttribute('data-theme') || 'light';
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.textContent = current === 'dark' ? 'Light Mode' : 'Dark Mode';
  });
}

function persistFilterState(storageKey, fieldIds) {
  if (!Array.isArray(fieldIds) || !fieldIds.length) return;

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch {
    saved = {};
  }

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (Object.prototype.hasOwnProperty.call(saved, id) && saved[id] !== undefined) {
      el.value = saved[id];
    }

    const eventName = el.tagName === 'INPUT' ? 'input' : 'change';
    el.addEventListener(eventName, () => {
      saved[id] = el.value;
      localStorage.setItem(storageKey, JSON.stringify(saved));
    });
  });
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function roleBadge(role) {
  const map = {
    admin: 'badge-admin',
    teacher: 'badge-teacher',
    cr: 'badge-cr',
    student: 'badge-student'
  };
  return `<span class="badge ${map[role] || 'badge-info'}">${role}</span>`;
}

function initSidebar() {
  const user = getUser();
  if (!user) return;

  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl = document.getElementById('sidebar-name');
  const roleEl = document.getElementById('sidebar-role');

  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = `${user.role} • ${normalizeDepartment(user.department) || ''}`;

  const links = document.querySelectorAll('.sidebar nav a');
  links.forEach((link) => {
    if (link.href === window.location.href) {
      link.classList.add('active');
    }
  });

  const adminLinks = document.querySelectorAll('[data-role="admin"]');
  const crLinks = document.querySelectorAll('[data-role="cr"]');
  const teacherLinks = document.querySelectorAll('[data-role="teacher"]');

  adminLinks.forEach((el) => {
    if (user.role !== 'admin') el.style.display = 'none';
  });

  crLinks.forEach((el) => {
    if (!['cr', 'admin'].includes(user.role)) el.style.display = 'none';
  });

  teacherLinks.forEach((el) => {
    if (!['teacher', 'admin'].includes(user.role)) el.style.display = 'none';
  });

  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  bindThemeToggles();
}

function starsHtml(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= Math.round(rating) ? '★' : '☆';
  }
  return `<span class="stars">${html}</span>`;
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

initTheme();
