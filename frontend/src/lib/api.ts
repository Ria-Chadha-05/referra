import type {
  AnalyzeResponse,
  TokenResponse,
  DocumentListItem,
  DocumentDetail,
  DecisionMap,
  CitationStyle,
} from '@/types'

// In production NEXT_PUBLIC_API_URL is your Railway backend URL.
// In local dev it falls back to localhost:8000.
// On Vercel, next.config.js rewrites /api/backend/* → backend, so we use
// that prefix when the env var is NOT set (i.e. when using rewrites).
const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body?.detail ?? JSON.stringify(body)
    } catch {
      message = await res.text()
    }
    throw new Error(message)
  }
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}

// When NEXT_PUBLIC_API_URL is set (deployed), call it directly.
// When it's empty (Vercel using rewrites), use the /api/backend/ prefix.
function url(path: string): string {
  if (BASE) return `${BASE}${path}`
  return `/api/backend${path}`
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiRegister(
  email: string,
  password: string,
  full_name?: string
): Promise<TokenResponse> {
  const res = await fetch(url('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name }),
  })
  return handleResponse<TokenResponse>(res)
}

export async function apiLogin(
  email: string,
  password: string
): Promise<TokenResponse> {
  const res = await fetch(url('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse<TokenResponse>(res)
}

export async function apiGetMe(token: string) {
  const res = await fetch(url('/auth/me'), {
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
  })
  return handleResponse(res)
}

// ── Analyze ───────────────────────────────────────────────────────────────────

export async function apiAnalyze(
  text: string,
  citation_style: CitationStyle = 'APA'
): Promise<AnalyzeResponse> {
  const res = await fetch(url('/analyze/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, citation_style }),
  })
  return handleResponse<AnalyzeResponse>(res)
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function apiListDocuments(
  token: string,
  skip = 0,
  limit = 20
): Promise<DocumentListItem[]> {
  const res = await fetch(url(`/documents/?skip=${skip}&limit=${limit}`), {
    headers: authHeader(token),
  })
  return handleResponse<DocumentListItem[]>(res)
}

export async function apiSaveDocument(
  token: string,
  payload: {
    title: string
    raw_text: string
    pipeline_result: AnalyzeResponse
    decisions: DecisionMap
    citation_style: CitationStyle
  }
): Promise<DocumentDetail> {
  const res = await fetch(url('/documents/'), {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<DocumentDetail>(res)
}

export async function apiGetDocument(
  token: string,
  id: string
): Promise<DocumentDetail> {
  const res = await fetch(url(`/documents/${id}`), {
    headers: authHeader(token),
  })
  return handleResponse<DocumentDetail>(res)
}

export async function apiUpdateDocument(
  token: string,
  id: string,
  payload: Partial<{
    title: string
    decisions: DecisionMap
    citation_style: CitationStyle
  }>
): Promise<DocumentDetail> {
  const res = await fetch(url(`/documents/${id}`), {
    method: 'PUT',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<DocumentDetail>(res)
}

export async function apiDeleteDocument(
  token: string,
  id: string
): Promise<void> {
  const res = await fetch(url(`/documents/${id}`), {
    method: 'DELETE',
    headers: authHeader(token),
  })
  return handleResponse<void>(res)
}

export async function apiExportDocument(
  token: string,
  id: string,
  format: 'bibtex' | 'ris'
): Promise<string> {
  const res = await fetch(url(`/documents/${id}/export?format=${format}`), {
    headers: authHeader(token),
  })
  if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`)
  return res.text()
}
