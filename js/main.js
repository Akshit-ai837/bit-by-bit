// ───────────────────────────────────────────
//  TrustChain AI — Main JavaScript Logic
//  File: js/main.js
// ───────────────────────────────────────────

// ── STATE ──────────────────────────────────
let milestones = [];
let escrowData = { total: 0 };

const pfiData = {
  "Arjun S.":  { score: 850, accuracy: 92, deadline: 95, disputes: 0 },
  "Priya M.":  { score: 700, accuracy: 78, deadline: 80, disputes: 1 },
  "Rahul K.":  { score: 500, accuracy: 60, deadline: 65, disputes: 3 },
  "Sneha R.":  { score: 780, accuracy: 85, deadline: 88, disputes: 0 },
};

// Helper: are we logged in and can use real backend AI endpoints?
function isAuthenticated() {
  return typeof isLoggedIn === 'function' && isLoggedIn();
}

// ── TAB SWITCHING ──────────────────────────
function switchTab(t) {
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelector(`[onclick="switchTab('${t}')"]`).classList.add("active");
  document.getElementById("panel-" + t).classList.add("active");
  if (t === "pfi") renderPFI();
  if (t === "escrow") renderEscrow();
}

// ── CLAUDE API CALL ────────────────────────
async function callClaude(prompt) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content.map(c => c.text || "").join("");
}

// ── LOADING HTML ───────────────────────────
function loadingHTML(msg) {
  return `<div class="loading">${msg}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

// ════════════════════════════════════════════
//  TAB 1 — NLP ANALYZER
// ════════════════════════════════════════════

async function runNLP() {
  const desc   = document.getElementById("nlp-input").value.trim();
  const budget = parseInt(document.getElementById("budget-input").value) || 50000;
  if (!desc) { alert("Please enter a project description"); return; }

  const btn = document.getElementById("nlp-btn");
  btn.disabled = true;
  btn.textContent = "Analyzing...";
  document.getElementById("nlp-output").innerHTML = loadingHTML("AI is decomposing your project");

  try {
    const data = await apiDemoNLP({ description: desc, budget });
    const ms   = data.milestones;

    milestones = ms.map((m, i) => ({ ...m, id: i, status: "pending" }));
    renderNLPOutput(milestones, budget);
    setupEscrow(milestones, budget);

  } catch (e) {
    document.getElementById("nlp-output").innerHTML =
      `<div class="aqa-box aqa-fail">Error: ${e.message}</div>`;
  }

  btn.disabled = false;
  btn.textContent = "Analyze with AI";
}

function renderNLPOutput(ms, budget) {
  const totalDays = ms.reduce((a, m) => a + m.days, 0);

  let html = `<div class="card">
    <div class="card-title">AI-generated project roadmap</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <span class="chip">${ms.length} milestones</span>
      <span class="chip">₹${budget.toLocaleString()} total</span>
      <span class="chip">${totalDays} days estimated</span>
    </div>`;

  ms.forEach((m, i) => {
    html += `<div class="nlp-ms-card">
      <div class="nlp-ms-header">
        <div class="nlp-ms-title">M${i + 1}: ${m.name}</div>
        <div class="nlp-ms-right">
          <span class="nlp-ms-days">${m.days} days</span>
          <span class="nlp-ms-pay">₹${m.payment.toLocaleString()}</span>
        </div>
      </div>
      <div class="nlp-ms-desc">${m.description}</div>
      <div>${m.checklist.map(c => `<span class="chip">${c}</span>`).join("")}</div>
    </div>`;
  });

  html += `</div>`;
  document.getElementById("nlp-output").innerHTML = html;
}

// ════════════════════════════════════════════
//  TAB 2 — ESCROW VAULT
// ════════════════════════════════════════════

function setupEscrow(ms, budget) {
  escrowData = { total: budget };
  renderEscrow();
}

function renderEscrow() {
  const released = milestones.filter(m => m.status === "done").reduce((a, m) => a + m.payment, 0);
  const refunded = milestones.filter(m => m.status === "refund").reduce((a, m) => a + m.payment, 0);
  const done     = milestones.filter(m => m.status === "done").length;

  document.getElementById("e-total").textContent    = "₹" + escrowData.total.toLocaleString();
  document.getElementById("e-released").textContent = "₹" + released.toLocaleString();
  document.getElementById("e-refunded").textContent = "₹" + refunded.toLocaleString();
  document.getElementById("e-ms-done").textContent  = done + "/" + milestones.length;

  if (!milestones.length) {
    document.getElementById("escrow-milestones").innerHTML =
      `<div style="font-size:13px;color:var(--text2)">Run the NLP Analyzer first.</div>`;
    document.getElementById("escrow-action-card").style.display = "none";
    return;
  }

  document.getElementById("escrow-action-card").style.display = "block";

  const pct = escrowData.total > 0 ? Math.round((released / escrowData.total) * 100) : 0;
  let html = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Release progress — ${pct}%</div>
    <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>`;

  milestones.forEach((m, i) => {
    const bCls   = m.status==="done"?"b-blue":m.status==="partial"?"b-amber":m.status==="refund"?"b-red":"b-gray";
    const bLabel = m.status==="done"?"released":m.status==="partial"?"on hold":m.status==="refund"?"refunded":"locked";
    html += `<div class="ms-row">
      <span class="ms-num">M${i+1}</span>
      <span class="ms-name">${m.name}</span>
      <span class="ms-amount">₹${m.payment.toLocaleString()}</span>
      <span class="ms-status"><span class="badge ${bCls}">${bLabel}</span></span>
    </div>`;
  });

  document.getElementById("escrow-milestones").innerHTML = html;

  const pending_ms = milestones.filter(m => m.status === "pending" || m.status === "partial");
  const sel = document.getElementById("ms-select");
  sel.innerHTML = pending_ms.length
    ? pending_ms.map(m => `<option value="${m.id}">M${m.id+1}: ${m.name}</option>`).join("")
    : "<option>All milestones settled</option>";
}

async function releaseMilestone() {
  const id     = parseInt(document.getElementById("ms-select").value);
  const result = document.getElementById("ms-result").value;
  const m      = milestones.find(x => x.id === id);
  if (!m) return;

  const msg = document.getElementById("release-msg");
  msg.innerHTML = loadingHTML("AI verifying milestone");
  await new Promise(r => setTimeout(r, 1400));

  if (result === "full") {
    m.status = "done";
    msg.innerHTML = `<div class="aqa-box aqa-pass"><strong>Payment released.</strong> ₹${m.payment.toLocaleString()} transferred to freelancer. Milestone fully verified by AI.</div>`;
  } else if (result === "partial") {
    m.status = "partial";
    msg.innerHTML = `<div class="aqa-box aqa-partial"><strong>Partial work detected.</strong> Detailed feedback sent to freelancer. Payment held pending resubmission.</div>`;
  } else {
    m.status = "refund";
    msg.innerHTML = `<div class="aqa-box aqa-fail"><strong>Milestone unmet.</strong> Refund of ₹${m.payment.toLocaleString()} initiated to employer. Freelancer PFI penalized.</div>`;
  }
  renderEscrow();
}

// ════════════════════════════════════════════
//  TAB 3 — AUTOMATED QUALITY ASSURANCE (AQA)
// ════════════════════════════════════════════

async function runAQA() {
  const type = document.getElementById("aqa-type").value;
  const work = document.getElementById("aqa-input").value.trim();
  if (!work) { alert("Please describe the submitted work"); return; }

  const btn = document.getElementById("aqa-btn");
  btn.disabled = true;
  btn.textContent = "Checking...";
  document.getElementById("aqa-output").innerHTML = loadingHTML("AI quality engine evaluating submission");

  try {
    const data = await apiDemoAQA({ work, type });
    renderAQA(data.aqa);
  } catch (e) {
    document.getElementById("aqa-output").innerHTML =
      `<div class="aqa-box aqa-fail">Error: ${e.message}</div>`;
  }

  btn.disabled = false;
  btn.textContent = "Run AI quality check";
}

function renderAQA(d) {
  const cls        = d.verdict==="full"?"aqa-pass":d.verdict==="partial"?"aqa-partial":"aqa-fail";
  const label      = d.verdict==="full"?"Fully completed — payment triggered":d.verdict==="partial"?"Partially completed — feedback sent":"Unmet — refund protocol initiated";
  const scoreColor = d.score>=75?"var(--green)":d.score>=50?"var(--amber)":"var(--red)";

  let html = `<div class="card">
    <div class="aqa-score-wrap">
      <div class="card-title" style="margin:0">AQA verdict</div>
      <div style="text-align:right">
        <div class="aqa-score-big" style="color:${scoreColor}">${d.score}</div>
        <div class="aqa-score-sub">/ 100</div>
      </div>
    </div>
    <div class="aqa-box ${cls}" style="margin-bottom:14px"><strong>${label}</strong><br>${d.summary}</div>`;

  if (d.passed?.length) {
    html += `<div class="check-section"><div class="check-label">Passed checks</div>`;
    html += d.passed.map(p => `<span class="chip chip-green">${p}</span>`).join("");
    html += `</div>`;
  }
  if (d.issues?.length) {
    html += `<div class="check-section"><div class="check-label">Issues found</div>`;
    html += d.issues.map(i => `<span class="chip chip-red">${i}</span>`).join("");
    html += `</div>`;
  }
  if (d.feedback) {
    html += `<div style="font-size:13px;color:var(--text2);border-top:0.5px solid var(--border);padding-top:12px;margin-top:8px">
      <strong>AI feedback:</strong> ${d.feedback}
    </div>`;
  }
  html += `</div>`;
  document.getElementById("aqa-output").innerHTML = html;
}

// ════════════════════════════════════════════
//  TAB 4 — PROFESSIONAL FIDELITY INDEX (PFI)
// ════════════════════════════════════════════

async function renderPFI() {
  if (isAuthenticated()) {
    try {
      const data = await apiGetMyPFI();
      const pfi  = data.pfi;
      const tier = pfi.tier;
      const score = pfi.score;
      const col = score>=800?"var(--green)":score>=700?"var(--blue)":"var(--amber)";
      const pct = Math.round((score / 1000) * 100);

      const el = document.getElementById('pfi-list');
      if (!el) return;

      el.innerHTML = `<div class="pfi-row">
        <div class="pfi-name">You</div>
        <div class="pfi-right">
          <div class="pfi-bar-bg">
            <div class="pfi-bar" style="width:${pct}%;background:${col}"></div>
          </div>
          <div class="pfi-meta">
            Accuracy ${pfi.accuracy}% · Deadlines ${pfi.deadline}% · Disputes ${pfi.disputes}
            · <span class="badge ${score>=800?"b-green":score>=700?"b-blue":score>=600?"b-gray":"b-red"}" style="font-size:10px;padding:2px 8px">${tier}</span>
          </div>
        </div>
        <div class="pfi-score" style="color:${col}">${score}</div>
      </div>`;

      // Disable the demo score controls when logged in
      const controls = document.getElementById('pfi-controls');
      if (controls) controls.style.display = 'none';

      const note = document.getElementById('pfi-note');
      if (note) note.textContent = 'Logged in — showing your real PFI score from the backend.';

      return;
    } catch (err) {
      console.error('Failed to load PFI:', err.message);
    }
  }

  // Fallback demo mode (no auth)
  let html = "";
  Object.entries(pfiData)
    .sort((a, b) => b[1].score - a[1].score)
    .forEach(([name, d]) => {
      const pct  = Math.round((d.score / 1000) * 100);
      const col  = d.score>=800?"var(--green)":d.score>=700?"var(--blue)":"var(--amber)";
      const tier = d.score>=800?"Elite":d.score>=700?"Trusted":d.score>=600?"Standard":"At Risk";
      const tCls = d.score>=800?"b-green":d.score>=700?"b-blue":d.score>=600?"b-gray":"b-red";

      html += `<div class="pfi-row">
        <div class="pfi-name">${name}</div>
        <div class="pfi-right">
          <div class="pfi-bar-bg">
            <div class="pfi-bar" style="width:${pct}%;background:${col}"></div>
          </div>
          <div class="pfi-meta">
            Accuracy ${d.accuracy}% · Deadlines ${d.deadline}% · Disputes ${d.disputes}
            · <span class="badge ${tCls}" style="font-size:10px;padding:2px 8px">${tier}</span>
          </div>
        </div>
        <div class="pfi-score" style="color:${col}">${d.score}</div>
      </div>`;
    });

  document.getElementById("pfi-list").innerHTML = html;
}

function updatePFI() {
  if (isAuthenticated()) {
    document.getElementById('pfi-msg').innerHTML =
      `<strong>Logged in:</strong> Your PFI is calculated from real milestone submissions. Use the dashboard to see live updates.`;
    return;
  }

  const name    = document.getElementById("pfi-freelancer").value;
  const outcome = document.getElementById("pfi-outcome").value;
  const d       = pfiData[name];
  let delta = 0, msg = "";

  if (outcome === "full")    { delta = +15; msg = "+15 pts — milestone fully completed on time."; d.accuracy = Math.min(100, d.accuracy+1); }
  else if (outcome === "partial") { delta = -5;  msg = "-5 pts — partial submission penalized."; }
  else if (outcome === "late")    { delta = -8;  msg = "-8 pts — late delivery penalized."; d.deadline = Math.max(0, d.deadline-1); }
  else                            { delta = -25; msg = "-25 pts — unmet milestone, dispute logged."; d.disputes++; }

  d.score = Math.max(0, Math.min(1000, d.score + delta));
  document.getElementById("pfi-msg").innerHTML =
    `<strong>${name}:</strong> ${msg} New PFI score: <strong style="color:var(--green)">${d.score}</strong>`;

  renderPFI();
}

// ── INIT ───────────────────────────────────
renderPFI();