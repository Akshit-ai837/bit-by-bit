// ─────────────────────────────────────────
//  client-dashboard connected to backend
//  Add this <script> block to client-dashboard.html
//  Replace the existing <script> block
// ─────────────────────────────────────────

// Redirect if not logged in
if (!isLoggedIn()) window.location.href = 'auth.html';
const currentUser = getUser();
if (currentUser?.role !== 'client') window.location.href = 'freelancer-dashboard.html';

// Show user name in nav
document.querySelector('.avatar').textContent =
  (currentUser?.firstName?.[0] || 'C') + (currentUser?.lastName?.[0] || '');
document.querySelector('.page-title') &&
  (document.querySelector('.page-title').textContent = `Good morning, ${currentUser?.firstName} 👋`);

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const match = document.querySelector(`[onclick="showPanel('${id}')"]`);
  if (match) match.classList.add('active');

  // Load data for each panel
  if (id === 'overview' || id === 'projects') loadProjects();
  if (id === 'escrow')   loadEscrow();
  if (id === 'payments') loadProjects();
}

// ── LOAD PROJECTS ──────────────────────────
async function loadProjects() {
  try {
    const data = await apiGetMyProjects();
    renderProjects(data.projects);
    renderStats(data.projects);
  } catch (err) {
    console.error('Failed to load projects:', err.message);
  }
}

function renderStats(projects) {
  const active   = projects.filter(p => p.status === 'active').length;
  const released = projects.reduce((a, p) => a + (p.escrow?.released || 0), 0);
  const locked   = projects.reduce((a, p) => a + (p.escrow?.locked || 0), 0);
  const pending  = projects.reduce((a, p) =>
    a + p.milestones.filter(m => m.status === 'submitted' || m.status === 'in_review').length, 0);

  document.getElementById('e-total')   && (document.getElementById('e-total').textContent   = '₹' + locked.toLocaleString());
  document.getElementById('e-released')&& (document.getElementById('e-released').textContent= '₹' + released.toLocaleString());
}

function renderProjects(projects) {
  const container = document.getElementById('projects-list');
  if (!container) return;
  if (!projects.length) {
    container.innerHTML = `<div style="font-size:13px;color:var(--text2);padding:1rem 0">No projects yet. <a href="#" onclick="showPanel('post')" style="color:var(--green)">Post your first project →</a></div>`;
    return;
  }
  container.innerHTML = projects.map(p => {
    const done = p.milestones.filter(m => m.status === 'done').length;
    const total = p.milestones.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const statusBadge = p.status === 'active' ? 'b-green' : p.status === 'open' ? 'b-blue' : 'b-gray';
    return `<div class="project-card">
      <div class="project-card-top">
        <div>
          <div class="project-name">${p.title}</div>
          <div class="project-meta">${p.freelancer ? `Freelancer: ${p.freelancer.firstName} ${p.freelancer.lastName}` : 'No freelancer assigned'} · ${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="project-right">
          <span class="badge ${statusBadge}">${p.status}</span>
          <span class="project-amount">₹${p.budget.toLocaleString()}</span>
        </div>
      </div>
      <div class="progress-row">
        <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-pct">${pct}%</div>
      </div>
      <div class="project-footer">
        <span class="badge b-gray">${done}/${total} milestones done</span>
        <span class="badge b-blue">₹${(p.escrow?.released || 0).toLocaleString()} released</span>
      </div>
    </div>`;
  }).join('');
}

// ── LOAD ESCROW ────────────────────────────
async function loadEscrow() {
  try {
    const data = await apiGetEscrowSummary();
    document.getElementById('e-total').textContent    = '₹' + (data.summary.totalLocked + data.summary.totalReleased).toLocaleString();
    document.getElementById('e-released').textContent = '₹' + data.summary.totalReleased.toLocaleString();
    document.getElementById('e-refunded').textContent = '₹' + data.summary.totalRefunded.toLocaleString();
    document.getElementById('e-ms-done').textContent  = data.summary.projects.length + ' projects';
  } catch (err) {
    console.error('Failed to load escrow:', err.message);
  }
}

// ── POST PROJECT → calls POST /api/projects ─
async function postProject() {
  const title  = document.getElementById('proj-title').value.trim();
  const desc   = document.getElementById('proj-desc').value.trim();
  const budget = parseInt(document.getElementById('proj-budget').value) || 50000;
  const timeline = document.getElementById('proj-timeline').value;
  const category = document.getElementById('proj-cat').value;

  const msgEl = document.getElementById('post-msg');
  msgEl.classList.remove('show');

  if (!title || !desc) {
    msgEl.className = 'msg msg-error show';
    msgEl.textContent = 'Please fill in the project title and description.';
    return;
  }

  const btn = document.getElementById('post-btn');
  btn.disabled = true; btn.textContent = 'AI generating milestones...';
  document.getElementById('post-result').innerHTML = `<div class="loading" style="margin-top:1rem">AI is generating your project roadmap<span class="dot-anim">.</span><span class="dot-anim">.</span><span class="dot-anim">.</span></div>`;

  try {
    // Calls POST /api/projects → backend calls Claude AI internally
    const data = await apiCreateProject({ title, description: desc, budget, timeline, category });
    const project = data.project;

    let html = `<div class="card" style="max-width:640px">
      <div class="card-title">AI-generated milestones for "${project.title}"</div>`;
    project.milestones.forEach((m, i) => {
      html += `<div style="border:0.5px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:8px;background:var(--bg2)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:14px;font-weight:500">M${i+1}: ${m.name}</div>
          <div style="font-size:13px;color:var(--green);font-weight:500">₹${m.payment.toLocaleString()} · ${m.days}d</div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${m.description}</div>
        <div>${(m.checklist||[]).map(c=>`<span style="display:inline-block;background:var(--bg);border:0.5px solid var(--border);border-radius:20px;padding:2px 9px;font-size:11px;color:var(--text2);margin:2px">${c}</span>`).join('')}</div>
      </div>`;
    });
    html += `<div class="aqa-box aqa-pass" style="margin-top:8px">Project created and funds locked in escrow. Assign a freelancer to begin.</div></div>`;
    document.getElementById('post-result').innerHTML = html;
    msgEl.className = 'msg msg-success show';
    msgEl.textContent = 'Project posted! Milestones generated by AI and funds locked in escrow.';
    loadProjects();
  } catch (err) {
    document.getElementById('post-result').innerHTML = '';
    msgEl.className = 'msg msg-error show';
    msgEl.textContent = 'Error: ' + err.message;
  }

  btn.disabled = false; btn.textContent = 'Generate milestones with AI & Post';
}

function confirmPost() {}  // no longer needed — backend handles it

// Init
loadProjects();
loadEscrow();