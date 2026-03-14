
// ─────────────────────────────────────────
//  freelancer-dashboard connected to backend
// ─────────────────────────────────────────
 
// Redirect if not logged in or wrong role
if (!isLoggedIn()) window.location.href = 'auth.html';
const currentUser = getUser();
if (currentUser?.role !== 'freelancer') window.location.href = 'client-dashboard.html';
 
// Show user name in nav
document.querySelector('.avatar').textContent =
  (currentUser?.firstName?.[0] || 'F') + (currentUser?.lastName?.[0] || '');
 
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const match = document.querySelector(`[onclick="showPanel('${id}')"]`);
  if (match) match.classList.add('active');
 
  if (id === 'overview' || id === 'projects') loadMyProjects();
  if (id === 'pfi')      loadPFI();
  if (id === 'browse')   loadBrowseProjects();
  if (id === 'earnings') loadMyProjects();
}
 
// ── LOAD MY PROJECTS ───────────────────────
async function loadMyProjects() {
  try {
    const data = await apiGetMyProjects();
    renderMyProjects(data.projects);
    renderOverviewStats(data.projects);
    populateMilestoneSelect(data.projects);
  } catch (err) {
    console.error('Load projects failed:', err.message);
  }
}
 
function renderOverviewStats(projects) {
  const active   = projects.filter(p => p.status === 'active').length;
  const earned   = projects.reduce((a, p) => a + (p.escrow?.released || 0), 0);
  const pending  = projects.reduce((a, p) =>
    a + p.milestones.filter(m => m.status === 'active' || m.status === 'partial').length, 0);
 
  const els = {
    'stat-active':  active,
    'stat-earned':  '₹' + earned.toLocaleString(),
    'stat-pending': pending,
  };
  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}
 
function renderMyProjects(projects) {
  const container = document.getElementById('my-projects-list');
  if (!container) return;
  if (!projects.length) {
    container.innerHTML = `<div style="font-size:13px;color:var(--text2)">No active projects yet. <a onclick="showPanel('browse')" style="color:var(--green);cursor:pointer">Browse open projects →</a></div>`;
    return;
  }
  container.innerHTML = projects.map(p => {
    const done  = p.milestones.filter(m => m.status === 'done').length;
    const total = p.milestones.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;
    return `<div class="project-card">
      <div class="project-name">${p.title}</div>
      <div class="project-client">Client: ${p.client?.firstName} ${p.client?.lastName}</div>
      <div class="project-grid">
        <div class="project-stat"><div class="project-stat-val">₹${p.budget.toLocaleString()}</div><div class="project-stat-label">Total value</div></div>
        <div class="project-stat"><div class="project-stat-val">₹${(p.escrow?.released||0).toLocaleString()}</div><div class="project-stat-label">Earned so far</div></div>
        <div class="project-stat"><div class="project-stat-val">${done}/${total}</div><div class="project-stat-label">Milestones done</div></div>
      </div>
      <div class="progress-row">
        <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-pct">${pct}%</div>
      </div>
    </div>`;
  }).join('');
}
 
// ── POPULATE SUBMIT MILESTONE SELECT ───────
function populateMilestoneSelect(projects) {
  const sel = document.getElementById('submit-ms-select');
  if (!sel) return;
  const options = [];
  projects.forEach(p => {
    p.milestones
      .filter(m => m.status === 'active' || m.status === 'partial')
      .forEach(m => {
        options.push(`<option value="${p._id}|${m._id}">${p.title} — ${m.name} (₹${m.payment.toLocaleString()})</option>`);
      });
  });
  sel.innerHTML = options.length
    ? options.join('')
    : '<option>No active milestones</option>';
}
 
// ── SUBMIT WORK → calls POST /api/milestones/:p/:m/submit ──
async function submitWork() {
  const selVal = document.getElementById('submit-ms-select')?.value;
  const desc   = document.getElementById('submit-desc').value.trim();
  const link   = document.getElementById('submit-link').value.trim();
  const type   = document.getElementById('submit-type').value;
 
  if (!desc) { alert('Please describe your submitted work.'); return; }
  if (!selVal || !selVal.includes('|')) { alert('Please select a milestone.'); return; }
 
  const [projectId, milestoneId] = selVal.split('|');
  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = 'AI verifying...';
  document.getElementById('submit-result').innerHTML = `<div class="loading">AI quality engine evaluating your submission<span class="dot-anim">.</span><span class="dot-anim">.</span><span class="dot-anim">.</span></div>`;
 
  try {
    // Calls backend → backend calls Claude AI → returns AQA result
    const data = await apiSubmitMilestone(projectId, milestoneId, {
      submittedWork:   desc,
      submittedLink:   link,
      deliverableType: type,
    });
 
    const aqa = data.aqa;
    const cls = aqa.verdict==='full'?'aqa-pass':aqa.verdict==='partial'?'aqa-partial':'aqa-fail';
    const label = aqa.verdict==='full'?'Fully verified — payment released!':aqa.verdict==='partial'?'Partially verified — revision needed':'Not verified — please resubmit';
    const scoreColor = aqa.score>=75?'var(--green)':aqa.score>=50?'var(--amber)':'var(--red)';
 
    let html = `<div style="background:var(--bg);border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:1.25rem;margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:15px;font-weight:500">AI Verification Result</div>
        <div style="font-size:28px;font-weight:500;color:${scoreColor}">${aqa.score}/100</div>
      </div>
      <div class="aqa-result ${cls} show"><strong>${label}</strong><br>${aqa.summary}</div>`;
    if (aqa.passed?.length) {
      html += `<div style="margin-top:10px"><div style="font-size:12px;color:var(--text2);margin-bottom:5px">Passed checks</div>`;
      html += aqa.passed.map(p=>`<span style="display:inline-block;background:var(--green-light);color:var(--green-dark);border:0.5px solid #5DCAA5;border-radius:20px;padding:2px 10px;font-size:12px;margin:2px">${p}</span>`).join('');
      html += `</div>`;
    }
    if (aqa.issues?.length) {
      html += `<div style="margin-top:8px"><div style="font-size:12px;color:var(--text2);margin-bottom:5px">Issues found</div>`;
      html += aqa.issues.map(i=>`<span style="display:inline-block;background:var(--red-light);color:var(--red-dark);border:0.5px solid #F09595;border-radius:20px;padding:2px 10px;font-size:12px;margin:2px">${i}</span>`).join('');
      html += `</div>`;
    }
    if (aqa.feedback) html += `<div style="font-size:13px;color:var(--text2);border-top:0.5px solid var(--border);padding-top:10px;margin-top:10px"><strong>AI feedback:</strong> ${aqa.feedback}</div>`;
    html += `</div>`;
    document.getElementById('submit-result').innerHTML = html;
    loadMyProjects();  // refresh project data
  } catch (err) {
    document.getElementById('submit-result').innerHTML =
      `<div style="font-size:13px;color:var(--red-dark);padding:10px 0">Error: ${err.message}</div>`;
  }
 
  btn.disabled = false; btn.textContent = 'Submit for AI verification';
}
 
// ── LOAD PFI → calls GET /api/pfi/me ──────
async function loadPFI() {
  try {
    const data = await apiGetMyPFI();
    const pfi  = data.pfi;
 
    const scoreEl = document.querySelector('.pfi-score-big');
    if (scoreEl) scoreEl.textContent = pfi.score;
    const tierEl = document.querySelector('.pfi-tier');
    if (tierEl) tierEl.textContent = pfi.tier + ' Freelancer';
 
    // Render history
    const histEl = document.getElementById('pfi-history-body');
    if (histEl && data.history?.length) {
      histEl.innerHTML = data.history.map(h => `
        <tr>
          <td>${new Date(h.createdAt).toLocaleDateString()}</td>
          <td>${h.note || h.event}</td>
          <td style="color:${h.delta > 0 ? 'var(--green)' : 'var(--red)'};font-weight:500">${h.delta > 0 ? '+' : ''}${h.delta}</td>
          <td style="font-weight:500">${h.scoreAfter}</td>
        </tr>`).join('');
    }
  } catch (err) {
    console.error('PFI load failed:', err.message);
  }
}
 
// ── BROWSE PROJECTS → calls GET /api/projects ─
async function loadBrowseProjects() {
  const container = document.getElementById('browse-list');
  if (!container) return;
  container.innerHTML = `<div class="loading">Loading open projects<span class="dot-anim">.</span><span class="dot-anim">.</span><span class="dot-anim">.</span></div>`;
  try {
    const data = await apiBrowseProjects();
    if (!data.projects.length) {
      container.innerHTML = `<div style="font-size:13px;color:var(--text2)">No open projects right now.</div>`;
      return;
    }
    container.innerHTML = data.projects.map(p => `
      <div class="browse-card">
        <div class="browse-top">
          <div><div class="browse-title">${p.title}</div><span class="badge b-blue">${p.category}</span></div>
          <div class="browse-budget">₹${p.budget.toLocaleString()}</div>
        </div>
        <div class="browse-desc">${p.description.slice(0, 120)}${p.description.length > 120 ? '...' : ''}</div>
        <div class="browse-footer">
          <span class="badge b-gray">${p.milestones?.length || 0} milestones · ${p.timeline}</span>
          <button class="btn btn-green btn-sm">Apply now</button>
        </div>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<div style="font-size:13px;color:var(--red-dark)">Error: ${err.message}</div>`;
  }
}
 
// Init
loadMyProjects();
loadPFI();
 