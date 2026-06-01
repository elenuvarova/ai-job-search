# Benelux AI Job Scout

A personal, **$0-to-run** job-search intelligence tool for ML Engineer / Data Scientist / AI Engineer roles across **Belgium, Netherlands, and Luxembourg** — plus **remote & contract** roles across the wider **EU and UK**. It collects vacancies from free sources, normalizes messy multilingual job data, flags **language blockers** (Dutch / French / German / Luxembourgish), scores each role against your CV, and helps you track and tailor applications.

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the design rationale and a "built vs planned" reconciliation.

## What it does

- **Collects** ML/Data/AI jobs daily from **14 free sources** into Postgres (see below). Benelux is covered fully; other EU countries + the UK are filtered to **remote or contract** roles.
- **Classifies** each posting with rule-based NLP: role family, seniority, employment type, remote type, and a **language-requirement blocker** (is the local language a hard requirement or a nice-to-have?).
- **Scores** each job against your uploaded CV (term-overlap match %, shown as a badge in the feed) and lets you **sort the feed by best match** ("Strong only" toggles to high-confidence matches).
- **Per-job skill gap**: on each job, shows which gazetteer skills your CV covers vs. the gaps.
- **RAG assistant**: upload a CV (PDF/DOCX) → tailor it to a job, draft a cover letter, get gap analysis, interview prep, and an LLM **company interview brief** (Gemini, with a Groq fallback).
- **Tracks** applications (status, notes, follow-up) with an **application funnel** (applied → interview → offer), plus a market-wide **Skill Gap Radar**.

## Stack

- **Frontend:** React 18 + Vite 5 (JavaScript), React Router
- **Backend:** Node.js + Express, ES modules, Sequelize ORM
- **Database:** **Neon** Postgres in production, SQLite in local dev (dialect chosen automatically from `DATABASE_URL`)
- **Scheduled collector:** **GitHub Actions** cron (public repo → free unlimited minutes) running `backend/scripts/collect.js`
- **AI:** Gemini 2.5 Flash (primary) + Groq Llama 3.3 70B (fallback); embeddings via Gemini `gemini-embedding-001`
- **Web service:** Render free web service (serves the API + built React app)

## Job sources

All zero-cost (free key or zero-auth):

| Source | Auth | Notes |
|---|---|---|
| Adzuna | free key | Native BE/NL/LU + salary; UK/EU filtered to remote & contract |
| **EURES** | zero-auth | EU portal — **native Luxembourg** + large BE/NL volume |
| Arbeitnow · Remotive · RemoteOK · Jobicy | zero-auth | EU / remote feeds |
| The Muse | free key | Curated employers |
| Greenhouse · Lever · Recruitee · SmartRecruiters · Ashby · Workable | zero-auth | Curated Benelux + EU/UK AI company boards |
| HN "Who's Hiring" | zero-auth | Monthly Hacker News thread |

## Local development

No database to install — SQLite is created automatically on first run.

**Terminal 1 — backend:**

```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to the backend on port 3001.

**Run the collector manually** (writes jobs into your local DB):

```bash
cd backend
node scripts/collect.js     # then: node scripts/classify.js
```

### Environment variables

Copy `.env.example` and fill in (all free to obtain):

| Var | Used for |
|---|---|
| `DATABASE_URL` | Neon connection string (omit locally → SQLite) |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Adzuna source |
| `GEMINI_API_KEY` | classification tail, CV embeddings, RAG |
| `GROQ_API_KEY` | LLM fallback |

Secrets live in `.env` (gitignored) locally and in **GitHub Secrets** for the cron — never in the repo.

## Deploy

- **Web service:** Render free web service via `render.yaml` (Docker). Set `DATABASE_URL` (Neon) as an env var in the dashboard.
- **Database:** create a free Neon project, paste its connection string into Render env + GitHub Secrets. Neon's free tier never expires (unlike Render's free Postgres, which is why the DB lives on Neon).
- **Collector:** `.github/workflows/collect.yml` runs daily on GitHub Actions and writes to Neon.

**Free-tier note:** the Render web service sleeps after ~15 min idle (~60 s cold start) — fine for a personal tool, since the heavy collection runs in Actions, not the web service.

## API (high level)

| Group | Path | Purpose |
|---|---|---|
| Jobs | `GET /api/jobs`, `GET /api/jobs/:id` | filterable feed + detail |
| Collection | `POST /api/collect/run` | manual collector trigger |
| CV | `POST /api/cv/upload`, `GET /api/cv/scores` | CV upload + per-job match scores |
| RAG | `POST /api/rag/*` | tailor CV / cover letter / gap / interview prep |
| Applications | `/api/applications` | tracker CRUD |
| Analytics | `/api/analytics/*` | skill-gap radar |
| Health | `GET /api/health` | DB connectivity (`{ status, db }`) |
