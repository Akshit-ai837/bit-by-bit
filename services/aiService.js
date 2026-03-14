// ─────────────────────────────────────────
//  services/aiService.js
//  OpenRouter API integration
//  — generateMilestones()
//  — verifyWork()
// ─────────────────────────────────────────

const https = require('https');

// Helper: call OpenRouter API
function callOpenRouter(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-3.5-turbo',
      stream: false,
      temperature: 0.7,
    });

    if (!process.env.OPENROUTER_API_KEY) {
      return reject(new Error('Missing OPENROUTER_API_KEY environment variable. Set it in your .env file.'));
    }

    const options = {
      hostname: 'openrouter.ai',
      path:     '/api/v1/chat/completions',
      method:   'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          console.log('OpenRouter response data:', data);
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.choices[0].message.content;
          resolve(text);
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── GENERATE MILESTONES ───────────────────
async function generateMilestones(description, budget) {
  const prompt = `You are an AI project manager for a freelance platform.
Project: "${description}"
Budget: ₹${budget}

Return ONLY valid JSON (no markdown, no explanation):
{"milestones":[{"name":"string","description":"string","days":number,"payment":number,"checklist":["item1","item2","item3"]}]}

Rules:
- Generate 4-6 milestones
- Payment values must sum to exactly ${budget}
- Be specific and technical
- Each milestone needs 3-4 checklist items
- Order milestones logically`;

  try {
    const text  = await callOpenRouter(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    const data  = JSON.parse(clean);
    return data.milestones;
  } catch (err) {
    // If the API key is missing or invalid, fail fast so the frontend can show a clear error.
    const msg = (err.message || '').toLowerCase();
    console.error('Full error:', err);
    if (msg.includes('missing openrouter_api_key') || msg.includes('invalid') || msg.includes('unauthorized') || msg.includes('authentication')) {
      console.error('OpenRouter API error:', err.message);
      throw err;
    }

    // Fallback milestones if AI fails
    console.error('AI milestone generation failed:', err.message);
    const perMilestone = Math.floor(budget / 4);
    return [
      { name: 'Planning & Design',    description: 'Initial planning and design phase',    days: 7,  payment: perMilestone,                   checklist: ['Requirements doc', 'Wireframes', 'Tech stack decision'] },
      { name: 'Core Development',     description: 'Main development work',                days: 14, payment: perMilestone,                   checklist: ['Core features', 'Database setup', 'API integration'] },
      { name: 'Testing & QA',         description: 'Testing and quality assurance',        days: 5,  payment: perMilestone,                   checklist: ['Unit tests', 'Bug fixes', 'Performance testing'] },
      { name: 'Deployment & Handoff', description: 'Final deployment and documentation',   days: 4,  payment: budget - perMilestone * 3,      checklist: ['Deployment', 'Documentation', 'Final delivery'] },
    ];
  }
}

// ── VERIFY WORK (AQA) ─────────────────────
async function verifyWork(submittedWork, deliverableType, milestoneName) {
  const typeLabel = {
    code:    'software/code project',
    content: 'written content',
    design:  'design/UI work',
  }[deliverableType] || 'freelance deliverable';

  const prompt = `You are a strict AI quality assurance agent for a freelance platform.
Milestone: "${milestoneName}"
Deliverable type: ${typeLabel}
Submitted work: "${submittedWork}"

Evaluate rigorously and objectively. Return ONLY valid JSON (no markdown):
{
  "verdict": "full" | "partial" | "unmet",
  "score": 0-100,
  "summary": "2 sentence evaluation",
  "passed": ["check1", "check2", "check3"],
  "issues": ["issue1", "issue2"],
  "feedback": "2 sentence actionable feedback for the freelancer",
  "payment_action": "released" | "held" | "refunded"
}

Scoring guide:
- 85-100 = full (payment released)
- 50-84  = partial (payment held, feedback sent)
- 0-49   = unmet (refund initiated)`;

  try {
    const text  = await callOpenRouter(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    // If the API key is missing or invalid, fail fast so the frontend can show a clear error.
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('missing openrouter_api_key') || msg.includes('invalid') || msg.includes('unauthorized') || msg.includes('authentication')) {
      throw err;
    }

    console.error('AI verification failed:', err.message);
    return {
      verdict:        'partial',
      score:          60,
      summary:        'AI verification temporarily unavailable. Manual review required.',
      passed:         ['Work submitted'],
      issues:         ['Could not complete automated verification'],
      feedback:       'Please resubmit. AI verification will be retried.',
      payment_action: 'held',
    };
  }
}

module.exports = { generateMilestones, verifyWork };