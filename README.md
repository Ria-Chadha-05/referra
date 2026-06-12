# Referra — AI Citation Assistant

AI-powered academic citation recommendation and verification. A 9-step RAG pipeline: **parse → detect → retrieve → embed → match → score → verify → format → respond**.

---

## Architecture

```
referra/
├── frontend/    Next.js 14 (App Router) — Vercel
└── backend/     FastAPI + PostgreSQL — Railway / Render
```

---

## Local Development

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, GROQ_API_KEY, SECRET_KEY

# Start dev server
uvicorn main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install

# Optional: copy env file
cp .env.example .env.local
# NEXT_PUBLIC_API_URL= (leave empty to use built-in rewrites to localhost:8000)

npm run dev
# App at http://localhost:3000
```

---

## Production Deployment

### Backend → Railway (recommended)

1. Push to GitHub
2. New project on [railway.app](https://railway.app) → Deploy from GitHub
3. Add a **PostgreSQL** service
4. Set environment variables from `.env.example`
5. Railway auto-detects `Procfile` → deploys `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Copy the Railway URL (e.g. `https://referra-api.up.railway.app`)

### Frontend → Vercel

1. Import the `frontend/` folder on [vercel.com](https://vercel.com)
2. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-railway-backend-url.up.railway.app`
3. Deploy — Vercel handles the rest

---

## Environment Variables Reference

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing key (min 32 chars) |
| `GROQ_API_KEY` | ✅ | For LLaMA3-70b verification step |
| `SEMANTIC_SCHOLAR_API_KEY` | ✗ | Optional — increases rate limits |
| `CORS_ORIGINS` | ✅ | JSON array of allowed frontend origins |
| `EMBEDDING_MODEL` | ✗ | Default: `all-MiniLM-L6-v2` |
| `LLM_MODEL` | ✗ | Default: `llama3-70b-8192` |

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✗ in dev | Backend URL in production |

---

## Tech Stack

**Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, docx  
**Backend:** FastAPI, SQLAlchemy, PostgreSQL, Sentence Transformers, spaCy, Groq (LLaMA3), Semantic Scholar API  
**Deploy:** Vercel (frontend) + Railway/Render (backend)
