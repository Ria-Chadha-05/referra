<div align="center">

# 📚 Referra
### AI-Powered Academic Citation Assistant

**Paste your draft, get verified, real citations — automatically matched, scored, and formatted.**

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA3_70B-orange?style=flat-square)](https://groq.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![Hugging Face](https://img.shields.io/badge/Backend-Hugging_Face-FFD21E?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)]()

[Overview](#-overview) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Architecture](#-project-structure) · [How It Works](#-how-the-ai-pipeline-works) · [Setup](#️-installation--setup) · [Usage](#️-usage) · [API Reference](#-api-reference) · [Roadmap](#-future-improvements)

**🔗 Live App:** [referra-smartcite.vercel.app](https://referra-smartcite.vercel.app/)

</div>

---

## 🚀 Overview

Finding the *right* academic sources for a claim is one of the most time-consuming parts of writing a paper. Writers either spend hours digging through Google Scholar and Semantic Scholar, or — worse — cite sources that don't actually support what they wrote.

**Referra automates this entire workflow.**

Paste a paragraph of academic writing, and Referra:
1. Breaks it into sentences and detects which ones make **factual claims that need citations**
2. Retrieves real candidate papers from **Semantic Scholar**
3. Uses **sentence embeddings** to semantically rank papers against your claim
4. Scores and **verifies** each paper using **LLaMA 3 70B (via Groq)** to confirm it actually supports the claim
5. Returns the **top verified references**, ready to insert in **APA / MLA / Chicago** format
6. Lets you **export the finished, cited document as a `.docx` file**

**Real-world relevance:** Students, researchers, and academic writers can go from a raw draft to a properly-cited, source-backed document in minutes — without ever leaving the editor.

---
## 🚀 Demo

<div align="center">

<a href="https://youtu.be/TpsHjV7ecy0?si=dBvU1GmBQktuRG33">
  <img src="https://img.youtube.com/vi/TpsHjV7ecy0/maxresdefault.jpg" width="800" alt="Referra Demo Video">
</a>

</div>

---

## ✨ Features

### 🤖 9-Step AI Citation Pipeline
A fully automated **RAG (Retrieval-Augmented Generation)** pipeline:

```
parse → detect → retrieve → embed → match → score → verify → format → respond
```

- Sentence-level parsing of pasted text
- LLM-based **claim detection** — identifies which sentences actually need a citation (and how many)
- Live retrieval of real papers from the **Semantic Scholar API**
- **Sentence-transformer embeddings** (`all-MiniLM-L6-v2`) for semantic similarity ranking
- Multi-factor **relevance scoring**
- **LLM verification step** (LLaMA 3 70B via Groq) — confirms the paper genuinely supports the claim before it's suggested
- **Global deduplication** — no paper is suggested twice across different claims
- Returns confidence scores, semantic scores, and verification status per reference

### ✍️ Interactive Editor
- Paste or type raw academic text directly into the editor
- Inline **highlighting** of detected claims, color-coded by citation need
- Side-by-side **citation panel** showing ranked, verified reference suggestions per sentence
- Accept, reject, or swap suggested references per claim
- Support for sentences needing **multiple citations**

### 📑 Citation Output & Export
- Auto-formats references in **APA, MLA, or Chicago** style
- Renders a clean **cited version** of your text with inline citation markers
- Generates a full **reference list** from accepted citations
- **One-click export to `.docx`** (Word document) with formatted text + bibliography

### 🔐 Authentication & Document Management
- JWT-based **user authentication** (register / login / profile)
- Save analyzed documents and citation decisions to your account
- Revisit and re-export previously analyzed documents
- Guest mode supported — analyze text without an account

### 📊 Score Breakdown & Transparency
- Every suggested reference shows its **semantic similarity score**, **confidence score**, and **verification status**
- Citation counts (per paper) and metadata (authors, year, journal, DOI) displayed for every suggestion
- No "black box" suggestions — every recommendation is explainable

---

## 🧠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, `docx` (export) |
| **Backend** | Python, FastAPI, Uvicorn |
| **Database** | PostgreSQL, SQLAlchemy ORM, Alembic migrations |
| **Auth** | JWT (python-jose), Passlib (bcrypt) |
| **AI / NLP** | Groq SDK (LLaMA 3 70B), Sentence Transformers (`all-MiniLM-L6-v2`), spaCy, scikit-learn |
| **External Data** | Semantic Scholar API |
| **Deployment** | Frontend → Vercel · Backend → Hugging Face Spaces (Docker) |
| **Dev Tools** | Alembic, ESLint, Git, Docker |

---

## 📂 Project Structure

```
referra/
│
├── frontend/                         # Next.js 14 app (Vercel)
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Landing / entry page
│       │   ├── layout.tsx
│       │   └── dashboard/
│       │       └── page.tsx          # Main editor + citation workspace
│       ├── components/
│       │   ├── editor/
│       │   │   ├── EditorPanel.tsx   # Main text editor
│       │   │   ├── RawTextArea.tsx
│       │   │   ├── RenderedText.tsx  # Highlighted claim view
│       │   │   └── EditorLegend.tsx
│       │   ├── citations/
│       │   │   ├── CitationsPanel.tsx
│       │   │   ├── CitationCard.tsx
│       │   │   └── EmptyState.tsx
│       │   ├── output/
│       │   │   ├── OutputPanel.tsx
│       │   │   ├── CitedText.tsx
│       │   │   └── ReferenceList.tsx
│       │   ├── metrics/
│       │   │   └── ScoreBreakdown.tsx
│       │   └── layout/
│       │       ├── TopBar.tsx
│       │       └── StatusBar.tsx
│       ├── hooks/
│       │   ├── useAnalyze.ts         # Calls /analyze endpoint
│       │   ├── useDecisions.ts       # Manages accept/reject state
│       │   └── useClipboard.ts
│       ├── lib/
│       │   ├── api.ts                # API client
│       │   ├── formatters.ts         # Citation style formatting
│       │   └── wordExport.ts         # .docx generation
│       └── types/index.ts
│
├── backend/                           # FastAPI app (Hugging Face Spaces)
│   ├── main.py                        # App entrypoint, CORS, middleware
│   ├── config.py                      # Settings / env management
│   ├── Dockerfile
│   ├── Procfile
│   │
│   ├── api/
│   │   ├── deps.py                    # Auth dependencies
│   │   ├── middleware/auth.py         # JWT + password hashing
│   │   └── routes/
│   │       ├── auth.py                # /auth — register, login, me
│   │       ├── analyze.py             # /analyze — runs the AI pipeline
│   │       └── documents.py           # /documents — save/load analyses
│   │
│   ├── ai/                            # 9-step RAG pipeline
│   │   ├── pipeline.py                # Orchestrator
│   │   ├── sentence_parser.py         # Step 1: parse
│   │   ├── claim_detector.py          # Step 2: detect
│   │   ├── paper_retriever.py         # Step 3: retrieve (Semantic Scholar)
│   │   ├── embedder.py                # Step 4: embed
│   │   ├── semantic_matcher.py        # Step 5: match
│   │   ├── scorer.py                  # Step 6: score
│   │   └── verifier.py                # Step 7: verify (Groq LLaMA 3 70B)
│   │
│   ├── services/
│   │   ├── document_service.py        # Document persistence
│   │   ├── export_service.py          # BibTeX / RIS / docx export
│   │   ├── auth_service.py
│   │   └── cache_service.py
│   │
│   ├── schemas/                       # Pydantic request/response models
│   │   ├── analyze.py
│   │   ├── auth.py
│   │   └── document.py
│   │
│   └── db/
│       ├── database.py                # SQLAlchemy engine/session
│       └── models/                    # ORM models (User, Document)
│
└── README.md
```

---

## 🤖 How the AI Pipeline Works

Every call to `/analyze` runs the full pipeline below:

```
1. User pastes text into the editor
        ↓
2. [Parse] Text is split into individual sentences
        ↓
3. [Detect] Each sentence is classified — does it make a claim that
   needs a citation? If so, how many citations (1 or 2+)?
        ↓
4. [Retrieve] For each claim sentence, real candidate papers are
   fetched live from the Semantic Scholar API
        ↓
5. [Embed] The claim sentence and each paper's abstract are
   embedded using a sentence-transformer model (all-MiniLM-L6-v2)
        ↓
6. [Match] Papers are ranked by semantic similarity to the claim
        ↓
7. [Score] Multi-factor relevance scores are computed (semantic
   similarity, citation count, recency, etc.)
        ↓
8. [Verify] Top candidates are sent to LLaMA 3 70B (via Groq) to
   confirm the paper *actually supports* the specific claim
        ↓
9. [Respond] Top verified refs (deduplicated globally across all
   claims) are returned with full metadata + confidence scores
```

### Pipeline Guarantees

| Behaviour | Rule |
|---|---|
| **No citation needed** | Sentences with `citation_count = 0` are skipped entirely — no API calls wasted |
| **Single citation** | Returns up to `TOP_REFS_TO_RETURN` (default 3) verified suggestions |
| **Multiple citations** | Returns up to `TOP_REFS_TO_RETURN + 1` suggestions so the user can pick more than one |
| **Global deduplication** | A paper (matched by DOI or normalized title) is never suggested for more than one claim |
| **Verification gate** | A paper is only surfaced if the LLM confirms it supports the claim text |
| **Transparency** | Every suggestion carries semantic score, confidence score, and verification status |

---

## ⚙️ Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Python](https://www.python.org/) 3.12+
- [PostgreSQL](https://www.postgresql.org/) (local or hosted, e.g. Supabase/Railway/Neon)
- A [Groq API key](https://console.groq.com/) (for the verification step)
- A [Semantic Scholar API key](https://www.semanticscholar.org/product/api) *(optional — increases rate limits)*

---

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/referra.git
cd referra
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Configure `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://referra:referra_secret@localhost:5432/referra

# Auth
SECRET_KEY=your-secret-key-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI Pipeline
GROQ_API_KEY=your_groq_api_key
SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_key   # optional
EMBEDDING_MODEL=all-MiniLM-L6-v2
LLM_MODEL=llama3-70b-8192
MAX_PAPERS_PER_CLAIM=10
TOP_REFS_TO_RETURN=3

# CORS — JSON array or comma-separated list of allowed frontend origins
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

Run the backend:

```bash
uvicorn main:app --reload --port 8000
# Interactive API docs at http://localhost:8000/docs
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Optional: create env file
cp .env.example .env.local
```

Configure `frontend/.env.local`:

```env
# Leave empty in dev to use built-in rewrites to localhost:8000
NEXT_PUBLIC_API_URL=
```

Run the frontend:

```bash
npm run dev
# App at http://localhost:3000
```

---

## 🚢 Production Deployment

### Backend → Hugging Face Spaces (Docker)

1. Push the `backend/` folder to a new Space configured with the **Docker SDK** (see `Dockerfile`)
2. Add all environment variables from the table above as **Space secrets**
3. The Space builds the Docker image and exposes the FastAPI app — interactive docs at `/docs`
4. Note your Space URL (e.g. `https://yourusername-referra-api.hf.space`)

> The backend also includes a `Procfile` and `runtime.txt`, so it can alternatively be deployed to Railway or Render with minimal changes.

### Frontend → Vercel

1. Import the `frontend/` folder as a project on [vercel.com](https://vercel.com)
2. Set the environment variable:
   - `NEXT_PUBLIC_API_URL` = your Hugging Face Space backend URL
3. Deploy — Vercel handles builds and previews automatically

> CORS is configured in `main.py` to automatically allow any `*.vercel.app` origin in addition to the explicit `CORS_ORIGINS` list.

---

## 🖥️ Usage

### Analyzing a Document

1. Open the [live app](https://referra-smartcite.vercel.app/) (or your local instance at `localhost:3000`)
2. Paste your academic draft into the **editor panel**
3. Click **Analyze** — the pipeline detects claims and highlights them inline
4. Review suggested references in the **citations panel**, each with semantic + confidence scores
5. **Accept**, reject, or swap suggestions per claim
6. Choose your citation style (**APA / MLA / Chicago**)
7. Click **Export** to download a fully cited `.docx` document with bibliography

### Account & Saved Documents

- Register / log in to save analyzed documents to your account
- Revisit a saved document to review or re-export your citation decisions
- Guest users can analyze and export without an account, but documents won't be saved

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Login and receive a JWT access token |
| `GET` | `/auth/me` | Get the current user's profile |
| `PUT` | `/auth/me` | Update the current user's profile |
| `POST` | `/analyze/` | Run the full 9-step citation analysis pipeline on submitted text |
| `GET` | `/documents` | List all saved documents for the authenticated user |
| `POST` | `/documents` | Save an analyzed document and citation decisions |
| `GET` | `/documents/{id}` | Retrieve a specific saved document |
| `GET` | `/documents/{id}/export` | Export accepted citations as BibTeX, RIS, or DOCX |
| `GET` | `/health` | API health check endpoint |

> Full interactive documentation (Swagger UI) is available at `/docs` on the backend deployment.

---

## 🔥 Key Highlights

- **9-step RAG pipeline** — parse, detect, retrieve, embed, match, score, verify, format, respond
- **Real papers, real verification** — every suggestion comes from Semantic Scholar and is LLM-verified against the claim, not hallucinated
- **Explainable suggestions** — semantic score, confidence score, and verification status shown for every reference
- **Global deduplication** — no repeated citations across a document
- **Multi-style export** — APA, MLA, Chicago, with one-click `.docx` download
- **Full auth + document history** — save and revisit analyses
- **Decoupled, production-ready architecture** — Next.js frontend on Vercel, FastAPI backend containerized on Hugging Face Spaces

---

## 🧪 Future Improvements

- Support for additional citation styles (Harvard, IEEE, Vancouver)
- Batch analysis for long documents / multi-page papers
- Browser extension for in-place citation suggestions (Google Docs, Overleaf)
- Citation graph visualization (how sources relate to each other)
- PDF upload + direct text extraction
- Collaborative document editing
- Caching layer for repeated Semantic Scholar queries to reduce latency
- User-configurable scoring weights (recency vs. relevance vs. citation count)

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please ensure your code follows the existing structure and doesn't break existing routes, schemas, or pipeline steps.

---

## 📄 Author

Ria Chadha

---

<div align="center">

⭐ **If this project helped you, please give it a star!** ⭐

</div>
