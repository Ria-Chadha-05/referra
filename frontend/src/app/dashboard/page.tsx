'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText, Trash2, Download, ArrowLeft, LogIn, Zap,
  BookOpen, Clock, CheckCircle2, PlusCircle, User, LogOut, Eye,
} from 'lucide-react'
import {
  apiLogin, apiRegister, apiListDocuments, apiDeleteDocument, apiExportDocument,
} from '@/lib/api'
import type { DocumentListItem } from '@/types'

type AuthMode = 'login' | 'register'

export default function DashboardPage() {
  const router = useRouter()

  /* ── Auth ─────────────────────────────────────────────────────────────── */
  const [token,    setToken]    = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [authErr,  setAuthErr]  = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('referra_token')
    const n = localStorage.getItem('referra_name')
    if (t) setToken(t)
    if (n) setUserName(n)
  }, [])

  const handleAuth = useCallback(async () => {
    setAuthErr(null); setAuthBusy(true)
    try {
      const resp = authMode === 'login'
        ? await apiLogin(email, password)
        : await apiRegister(email, password, name || undefined)
      setToken(resp.access_token)
      localStorage.setItem('referra_token', resp.access_token)
      if (resp.user.full_name) {
        localStorage.setItem('referra_name', resp.user.full_name)
        setUserName(resp.user.full_name)
      }
    } catch (e) {
      setAuthErr(e instanceof Error ? e.message : 'Authentication failed')
    } finally { setAuthBusy(false) }
  }, [authMode, email, password, name])

  const handleLogout = useCallback(() => {
    setToken(null); setUserName(null)
    localStorage.removeItem('referra_token')
    localStorage.removeItem('referra_name')
  }, [])

  /* ── Documents ────────────────────────────────────────────────────────── */
  const [docs,    setDocs]    = useState<DocumentListItem[]>([])
  const [docsErr, setDocsErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadDocs = useCallback(async (tok: string) => {
    setLoading(true); setDocsErr(null)
    try { setDocs(await apiListDocuments(tok)) }
    catch (e) { setDocsErr(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (token) loadDocs(token) }, [token, loadDocs])

  const handleDelete = useCallback(async (id: string) => {
    if (!token) return
    if (!confirm('Delete this document? This cannot be undone.')) return
    try { await apiDeleteDocument(token, id); setDocs(prev => prev.filter(d => d.id !== id)) }
    catch (e) { alert(e instanceof Error ? e.message : 'Delete failed') }
  }, [token])

  const handleExport = useCallback(async (id: string, fmt: 'bibtex' | 'ris') => {
    if (!token) return
    try {
      const content = await apiExportDocument(token, id, fmt)
      const blob = new Blob([content], { type: 'text/plain' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `referra.${fmt === 'bibtex' ? 'bib' : 'ris'}`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert(e instanceof Error ? e.message : 'Export failed') }
  }, [token])

  /* ── Stats ────────────────────────────────────────────────────────────── */
  const totalCited    = docs.reduce((s, d) => s + d.accepted_count, 0)
  const totalSentences= docs.reduce((s, d) => s + d.sentence_count, 0)

  /* ═══════════════════════════════════════════════════════════════════════
     NOT LOGGED IN — Auth Screen
  ═══════════════════════════════════════════════════════════════════════ */
  if (!token) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: 'var(--bg)' }}
      >
        {/* Back link */}
        <Link
          href="/"
          className="flex items-center gap-1.5 mb-10 transition-colors"
          style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--indigo)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <ArrowLeft size={12} /> Back to editor
        </Link>

        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            maxWidth: 400,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--indigo) 0%, #6B5FE8 100%)', boxShadow: '0 4px 14px rgba(75,95,216,0.5)' }}>
                <Zap size={18} color="#fff" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-white" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                Re<em className="not-italic" style={{ color: '#7B8FFF' }}>ferra</em>
              </span>
            </div>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              AI Citation Assistant
            </p>
          </div>

          <div className="p-8">
            {/* Tab switcher */}
            <div className="flex rounded-lg p-1 mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {(['login', 'register'] as AuthMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setAuthMode(m); setAuthErr(null) }}
                  className="flex-1 py-2 rounded-md transition-all"
                  style={{
                    fontFamily: 'var(--ff-ui)', fontSize: '0.72rem', fontWeight: 600,
                    background: authMode === m ? 'var(--surface)' : 'transparent',
                    color: authMode === m ? 'var(--text)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                    boxShadow: authMode === m ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3">
              {authMode === 'register' && (
                <Field
                  type="text" placeholder="Full name (optional)"
                  value={name} onChange={setName}
                />
              )}
              <Field
                type="email" placeholder="Email address"
                value={email} onChange={setEmail}
                onEnter={handleAuth}
              />
              <Field
                type="password" placeholder="Password (min 8 characters)"
                value={password} onChange={setPassword}
                onEnter={handleAuth}
              />
            </div>

            {authErr && (
              <div className="mt-3 px-3 py-2 rounded-md" style={{ background: 'var(--rose-lt)', border: '1px solid var(--rose-bd)' }}>
                <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--rose)' }}>{authErr}</p>
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={authBusy || !email || !password}
              className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all"
              style={{
                fontFamily: 'var(--ff-ui)', fontSize: '0.75rem', fontWeight: 600,
                background: authBusy || !email || !password ? 'var(--surface-3)' : 'var(--indigo)',
                color: authBusy || !email || !password ? 'var(--text-faint)' : '#fff',
                border: 'none', cursor: authBusy || !email || !password ? 'not-allowed' : 'pointer',
                boxShadow: authBusy || !email || !password ? 'none' : '0 2px 10px rgba(75,95,216,0.35)',
              }}
              onMouseEnter={e => { if (!authBusy && email && password) e.currentTarget.style.background = 'var(--indigo-dk)' }}
              onMouseLeave={e => { if (!authBusy && email && password) e.currentTarget.style.background = 'var(--indigo)' }}
            >
              <LogIn size={14} />
              {authBusy ? 'Please wait…' : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LOGGED IN — Dashboard
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Top nav */}
      <header
        className="flex items-center justify-between px-8 shrink-0"
        style={{ height: 52, background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(12,27,58,0.35)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-md" style={{ width: 26, height: 26, background: 'linear-gradient(135deg, var(--indigo) 0%, #6B5FE8 100%)', boxShadow: '0 2px 8px rgba(75,95,216,0.45)' }}>
            <Zap size={13} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-white" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            Re<em className="not-italic" style={{ color: '#7B8FFF' }}>ferra</em>
          </span>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'rgba(255,255,255,0.30)', marginLeft: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          {userName && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <User size={11} style={{ color: 'rgba(255,255,255,0.45)' }} />
              <span style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>{userName}</span>
            </div>
          )}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all"
            style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.70rem', fontWeight: 500, color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.10)' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.65)' }}
          >
            <ArrowLeft size={12} /> Editor
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all"
            style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.70rem', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)', background: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(200,57,57,0.15)'; e.currentTarget.style.color='#FF8080'; e.currentTarget.style.borderColor='rgba(200,57,57,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page heading + new doc */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              My Documents
            </h1>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.60rem', color: 'var(--text-muted)', marginTop: 3 }}>
              {docs.length} document{docs.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all"
            style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.72rem', fontWeight: 600, background: 'var(--indigo)', color: '#fff', border: 'none', boxShadow: '0 2px 10px rgba(75,95,216,0.3)', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--indigo-dk)' }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--indigo)' }}
          >
            <PlusCircle size={14} /> New Document
          </Link>
        </div>

        {/* Stats strip */}
        {docs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard icon={<FileText size={16} style={{ color: 'var(--indigo)' }} />}
              label="Documents" value={String(docs.length)} color="var(--indigo)" />
            <StatCard icon={<BookOpen size={16} style={{ color: 'var(--teal)' }} />}
              label="Citations added" value={String(totalCited)} color="var(--teal)" />
            <StatCard icon={<CheckCircle2 size={16} style={{ color: 'var(--str-excel)' }} />}
              label="Sentences analysed" value={String(totalSentences)} color="var(--str-excel)" />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        )}

        {/* Error */}
        {docsErr && !loading && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--rose-lt)', border: '1px solid var(--rose-bd)' }}>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--rose)' }}>{docsErr}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !docsErr && docs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 rounded-2xl"
            style={{ border: '2px dashed var(--border)', background: 'var(--surface)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} style={{ color: 'var(--indigo)' }} />
            </div>
            <div className="text-center">
              <p style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-mid)' }}>No saved documents yet</p>
              <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.60rem', color: 'var(--text-muted)', marginTop: 4 }}>Analyze your first text and save from the output panel</p>
            </div>
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.72rem', fontWeight: 600, background: 'var(--indigo)', color: '#fff', textDecoration: 'none' }}>
              <Zap size={13} /> Start Writing
            </Link>
          </div>
        )}

        {/* Document list */}
        {!loading && docs.length > 0 && (
          <div className="flex flex-col gap-2">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--indigo-bd)'; e.currentTarget.style.boxShadow='var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='var(--shadow-sm)' }}
                onClick={() => router.push(`/?doc=${doc.id}`)}
              >
                {/* Icon */}
                <div className="rounded-lg flex items-center justify-center shrink-0"
                  style={{ width: 38, height: 38, background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bd)' }}>
                  <FileText size={16} style={{ color: 'var(--indigo)' }} />
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="chip" style={{ color: 'var(--indigo)', background: 'var(--indigo-lt)', borderColor: 'var(--indigo-bd)', fontSize: '0.52rem' }}>{doc.citation_style}</span>
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                      {doc.sentence_count} sentences · {doc.accepted_count} cited
                    </span>
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-faint)' }}>
                      <Clock size={9} style={{ display: 'inline', marginRight: 2 }} />
                      {new Date(doc.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <ActionBtn title="Open document" icon={<Eye size={13} />} onClick={() => router.push(`/?doc=${doc.id}`)} />
                  <ActionBtn title="Export BibTeX" icon={<Download size={13} />} onClick={() => handleExport(doc.id, 'bibtex')} />
                  <ActionBtn title="Delete" icon={<Trash2 size={13} />} onClick={() => handleDelete(doc.id)} danger />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Field({ type, placeholder, value, onChange, onEnter }: {
  type: string; placeholder: string; value: string
  onChange: (v: string) => void; onEnter?: () => void
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
      className="w-full px-3 py-2.5 rounded-lg"
      style={{
        fontFamily: 'var(--ff-ui)', fontSize: '0.78rem',
        color: 'var(--text)', background: 'var(--surface-2)',
        border: '1px solid var(--border)', outline: 'none',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.target.style.borderColor='var(--indigo-bd)' }}
      onBlur={e => { e.target.style.borderColor='var(--border)' }}
    />
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}

function ActionBtn({ icon, title, onClick, danger = false }: {
  icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-lg transition-all"
      style={{ width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = danger ? 'var(--rose-bd)' : 'var(--indigo-bd)'
        e.currentTarget.style.color = danger ? 'var(--rose)' : 'var(--indigo)'
        e.currentTarget.style.background = danger ? 'var(--rose-lt)' : 'var(--indigo-lt)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor='var(--border)'
        e.currentTarget.style.color='var(--text-muted)'
        e.currentTarget.style.background='var(--surface-2)'
      }}
    >
      {icon}
    </button>
  )
}
