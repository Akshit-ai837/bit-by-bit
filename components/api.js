// ─────────────────────────────────────────
//  trustchain/js/api.js
//  Shared API utility — all backend calls
//  go through this file
// ─────────────────────────────────────────

// Allow overriding backend host/port via window.BACKEND_URL (useful when port 5000/5001 is occupied)
const BACKEND_URLS = [
  window.BACKEND_URL,
  'http://localhost:5001/api',
  'http://localhost:5000/api',
].filter(Boolean);

// ── TOKEN HELPERS ──────────────────────────
function saveToken(token)  { localStorage.setItem('tc_token', token); }
function getToken()        { return localStorage.getItem('tc_token'); }
function removeToken()     { localStorage.removeItem('tc_token'); }

function saveUser(user)    { localStorage.setItem('tc_user', JSON.stringify(user)); }
function getUser()         { const u = localStorage.getItem('tc_user'); return u ? JSON.parse(u) : null; }
function removeUser()      { localStorage.removeItem('tc_user'); }

function isLoggedIn()      { return !!getToken(); }

function logout() {
  removeToken();
  removeUser();
  window.location.href = 'auth.html';
}

// ── BASE FETCH ─────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let lastError;
  const tried = [];

  for (const base of BACKEND_URLS) {
    const url = `${base}${endpoint}`;
    tried.push(url);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.errors?.[0]?.msg || `Server returned ${res.status}`);
      }

      return data;
    } catch (err) {
      lastError = err;
      // Try the next URL
    }
  }

  throw new Error(`Failed to reach backend. Tried: ${tried.join(', ')}. Last error: ${lastError?.message || 'unknown'}`);
}

// ════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════

async function apiRegister({ firstName, lastName, email, password, role, skill }) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, password, role, skill }),
  });
  saveToken(data.token);
  saveUser(data.user);
  return data;
}

async function apiLogin({ email, password }) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveToken(data.token);
  saveUser(data.user);
  return data;
}

async function apiGetMe() {
  return await apiFetch('/auth/me');
}

// ════════════════════════════════════════════
//  PROJECTS
// ════════════════════════════════════════════

async function apiGetMyProjects() {
  return await apiFetch('/projects/mine');
}

async function apiBrowseProjects(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return await apiFetch(`/projects${params ? '?' + params : ''}`);
}

async function apiGetProject(id) {
  return await apiFetch(`/projects/${id}`);
}

async function apiCreateProject({ title, description, budget, timeline, category }) {
  return await apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify({ title, description, budget, timeline, category }),
  });
}

async function apiAssignFreelancer(projectId, freelancerId) {
  return await apiFetch(`/projects/${projectId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ freelancerId }),
  });
}

// ════════════════════════════════════════════
//  MILESTONES
// ════════════════════════════════════════════

async function apiSubmitMilestone(projectId, milestoneId, { submittedWork, submittedLink, deliverableType }) {
  return await apiFetch(`/milestones/${projectId}/${milestoneId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ submittedWork, submittedLink, deliverableType }),
  });
}

// ════════════════════════════════════════════
//  ESCROW
// ════════════════════════════════════════════

async function apiGetEscrowSummary() {
  return await apiFetch('/escrow/summary');
}

async function apiGetProjectEscrow(projectId) {
  return await apiFetch(`/escrow/${projectId}`);
}

// ════════════════════════════════════════════
//  PFI
// ════════════════════════════════════════════

async function apiGetMyPFI() {
  return await apiFetch('/pfi/me');
}

async function apiGetLeaderboard() {
  return await apiFetch('/pfi/leaderboard');
}

async function apiGetPFIHistory(userId) {
  return await apiFetch(`/pfi/history/${userId}`);
}

// ── DEMO (public landing page) ─────────────────────────
async function apiDemoNLP({ description, budget }) {
  return await apiFetch('/demo/nlp', {
    method: 'POST',
    body: JSON.stringify({ description, budget }),
  });
}

async function apiDemoAQA({ work, type }) {
  return await apiFetch('/demo/aqa', {
    method: 'POST',
    body: JSON.stringify({ work, type }),
  });
}
