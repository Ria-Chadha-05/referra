'use client'

import Link from 'next/link'
import { LayoutDashboard, LogOut, LogIn, BookOpen, ChevronRight, Zap } from 'lucide-react'
import type { AppStep } from '@/types'

interface TopBarProps {
  step:       AppStep
  statusText: string
  token:      string | null
  userName?:  string | null
  onLogout:   () => void
}

const STEPS: { key: AppStep; label: string; num: string }[] = [
  { key: 'input',  label: 'Write',   num: '01' },
  { key: 'review', label: 'Review',  num: '02' },
  { key: 'output', label: 'Export',  num: '03' },
]

export default function TopBar({ step, token, userName, onLogout }: TopBarProps) {
  const stepIndex = STEPS.findIndex(s => s.key === step)

  return (
    <header
      className="flex items-center justify-between px-5 shrink-0 select-none"
      style={{
        background: 'var(--navy)',
        height: 52,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 2px 12px rgba(12,27,58,0.35)',
      }}
    >
      {/* ── Brand ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, var(--indigo) 0%, #6B5FE8 100%)',
              boxShadow: '0 2px 8px rgba(75,95,216,0.45)',
            }}
          >
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            className="font-display font-bold text-white"
            style={{ fontSize: '1.15rem', letterSpacing: '-0.02em' }}
          >
            Re<em className="not-italic" style={{ color: '#7B8FFF' }}>ferra</em>
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

        {/* Step breadcrumb */}
        <nav className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const done    = i < stepIndex
            const active  = s.key === step
            const pending = i > stepIndex
            return (
              <div key={s.key} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight
                    size={12}
                    style={{ color: done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)' }}
                  />
                )}
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded"
                  style={{
                    background: active ? 'rgba(75,95,216,0.28)' : 'transparent',
                    border: active ? '1px solid rgba(75,95,216,0.5)' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '0.58rem',
                      letterSpacing: '0.08em',
                      color: done ? '#7B8FFF' : active ? '#A5B0FF' : 'rgba(255,255,255,0.30)',
                      fontWeight: 500,
                    }}
                  >
                    {s.num}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--ff-ui)',
                      fontSize: '0.72rem',
                      fontWeight: active ? 600 : 400,
                      color: done ? 'rgba(255,255,255,0.70)' : active ? '#fff' : 'rgba(255,255,255,0.30)',
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      {/* ── Right side ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all"
          style={{
            fontFamily: 'var(--ff-ui)',
            fontSize: '0.72rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
          }}
        >
          <LayoutDashboard size={13} />
          Dashboard
        </Link>

        {token ? (
          <div className="flex items-center gap-2">
            {userName && (
              <span
                style={{
                  fontFamily: 'var(--ff-ui)',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                {userName.split(' ')[0]}
              </span>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all"
              style={{
                fontFamily: 'var(--ff-ui)',
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.50)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(200,57,57,0.15)'
                e.currentTarget.style.color = '#FF8080'
                e.currentTarget.style.borderColor = 'rgba(200,57,57,0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.50)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all"
            style={{
              fontFamily: 'var(--ff-ui)',
              fontSize: '0.72rem',
              fontWeight: 500,
              background: 'var(--indigo)',
              color: '#fff',
              border: '1px solid transparent',
              boxShadow: '0 2px 8px rgba(75,95,216,0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--indigo-dk)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--indigo)'
            }}
          >
            <LogIn size={12} />
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
