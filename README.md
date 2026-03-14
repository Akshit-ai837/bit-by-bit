# TrustChain AI — Backend

Node.js + Express + MongoDB backend for the TrustChain AI autonomous freelance platform.

---

## Folder Structure

```
trustchain-backend/
├── server.js                  ← Entry point
├── package.json
├── .env.example               ← Copy to .env and fill values
│
├── models/
│   ├── User.js                ← User schema (client & freelancer)
│   ├── Project.js             ← Project + milestones schema
│   └── PFITransaction.js      ← PFI score history
│
├── routes/
│   ├── auth.js                ← Register, login, /me
│   ├── projects.js            ← CRUD for projects
│   ├── milestones.js          ← Submit work, AI verify
│   ├── escrow.js              ← Escrow status & summary
│   └── pfi.js                 ← PFI score, leaderboard, history
│
├── middleware/
│   └── auth.js                ← JWT protect + role guard
│
└── services/
    ├── aiService.js           ← Claude API (NLP + AQA)
    ├── escrowService.js       ← Fund release & refund logic
    └── pfiService.js          ← PFI score calculation
```

---

## Setup

### 1. Install dependencies
```bash
cd trustchain-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — a long random string
- `ANTHROPIC_API_KEY` — your Claude API key

### 3. Start MongoDB
Make sure MongoDB is running locally:
```bash
mongod
```
Or use MongoDB Atlas (cloud) — paste the connection string in `.env`.

### 4. Run the server
```bash
# Development (auto-restart on change)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | Browse open projects |
| GET | /api/projects/mine | My projects |
| GET | /api/projects/:id | Single project |
| POST | /api/projects | Create project (client) |
| POST | /api/projects/:id/assign | Assign freelancer |
| DELETE | /api/projects/:id | Cancel project |

### Milestones
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/milestones/:projectId/:milestoneId/submit | Submit work + AI verify |
| GET | /api/milestones/:projectId/:milestoneId | Get milestone details |

### Escrow
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/escrow/summary | All escrow totals |
| GET | /api/escrow/:projectId | Project escrow breakdown |

### PFI
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pfi/me | My PFI score |
| GET | /api/pfi/leaderboard | Top freelancers |
| GET | /api/pfi/history/:userId | PFI score history |
| GET | /api/pfi/:userId | Any freelancer's PFI |

---

## Example API Calls

### Register
```json
POST /api/auth/register
{
  "firstName": "Arjun",
  "lastName": "Sharma",
  "email": "arjun@example.com",
  "password": "password123",
  "role": "freelancer",
  "skill": "Web Development"
}
```

### Create Project
```json
POST /api/projects
Authorization: Bearer <token>
{
  "title": "E-commerce Website",
  "description": "Build a full e-commerce site with cart and payment",
  "budget": 50000,
  "timeline": "30 days",
  "category": "Web Development"
}
```

### Submit Milestone Work
```json
POST /api/milestones/:projectId/:milestoneId/submit
Authorization: Bearer <token>
{
  "submittedWork": "Built login API with JWT auth. POST /login and POST /register endpoints working. Unit tests pass with 95% coverage.",
  "deliverableType": "code",
  "submittedLink": "https://github.com/your-repo"
}
```

---

## How it works

1. Client registers → posts project → AI generates milestones → funds locked in escrow
2. Freelancer registers → gets assigned → submits work
3. AI (Claude) evaluates work → verdict: full / partial / unmet
4. Escrow releases or refunds automatically
5. PFI score updates based on outcome

---

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Validation**: express-validator# TrustChain-AI
