# AI Workshop Template

A minimal full-stack starter built with React (Vite), Node.js (Express), and Sequelize ORM. Locally it runs SQLite with zero setup — no database to install. On Render it automatically switches to a provisioned Postgres instance. The whole stack deploys for free on Render's free tier using a single Blueprint file.

## Stack

- **Frontend:** React 18 + Vite 5 (JavaScript)
- **Backend:** Node.js + Express, ES modules
- **Database:** Sequelize ORM — SQLite in local dev, PostgreSQL on Render (dialect chosen automatically from `DATABASE_URL`)
- **Deploy:** Render free tier (free web service + free Postgres), provisioned via `render.yaml`

## Project structure

```
.
├── backend/
│   ├── package.json
│   ├── server.js
│   └── db.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
├── Dockerfile
├── render.yaml
├── .env.example
├── .gitignore
├── .dockerignore
└── README.md
```

## Local development

No database to install — SQLite is built in and created automatically on first run.

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

Open [http://localhost:5173](http://localhost:5173). The frontend dev server proxies `/api` requests to the backend on port 3001.

## Deploy to Render

1. Push this repo to GitHub.
2. In the Render dashboard, go to **New → Blueprint** and connect your repository.
3. Render reads `render.yaml`, provisions a free Postgres database and a Docker-based web service, and wires `DATABASE_URL` automatically — no copy/pasting connection strings.

**Free-tier notes:**
- The web service sleeps after inactivity; the first request after sleep takes ~30 seconds.
- Render's free Postgres databases expire after 30 days and must be recreated.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hello` | Returns a greeting message |
| GET | `/api/health` | Checks database connectivity, returns `{ status, db }` |
| GET | `*` | Serves the React frontend (production only) |
