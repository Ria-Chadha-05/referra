from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from db.database import Base, engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created.")
    logger.info(f"CORS origins: {settings.CORS_ORIGINS}")
    yield


# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Referra API",
    description=(
        "AI-powered citation recommendation and verification. "
        "9-step RAG pipeline: parse → detect → retrieve → embed → "
        "match → score → verify → format → respond."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
_origins = settings.CORS_ORIGINS
if "*" not in _origins:
    _origins = list(set(_origins + ["http://localhost:3000", "http://localhost:3001"]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",   # allow any Vercel preview URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"],
)

# ── Timing middleware ─────────────────────────────────────────────────────────
from fastapi import Request
import time

@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Process-Time"] = f"{elapsed}ms"
    return response


# ── Routes ───────────────────────────────────────────────────────────────────
from api.routes import auth, analyze, documents  # noqa: E402

app.include_router(auth.router,      prefix="/auth",      tags=["Auth"])
app.include_router(analyze.router,   prefix="/analyze",   tags=["Analysis"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "version": "2.0.0"}
