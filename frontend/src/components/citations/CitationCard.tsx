'use client'

import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp, BarChart2, CheckCheck } from 'lucide-react'
import type { Reference } from '@/types'
import ScoreBreakdown from '@/components/metrics/ScoreBreakdown'

interface CitationCardProps {
  sentenceId:     number
  reference:      Reference
  refIndex:       number
  accepted:       boolean
  ignored:        boolean
  sentenceText:   string
  animDelay:      number
  allowMultiple:  boolean
  onToggleAccept: (sentenceId: number, refIndex: number) => void
  onIgnoreAll:    (sentenceId: number) => void
  onUndo:         (sentenceId: number) => void
}

function getStrength(score: number): { label: string; cls: string } {
  if (score >= 0.85) return { label: 'Excellent',  cls: 'bg-score-excellent' }
  if (score >= 0.70) return { label: 'Strong',     cls: 'bg-score-strong'    }
  if (score >= 0.50) return { label: 'Good',       cls: 'bg-score-good'      }
  if (score >= 0.30) return { label: 'Moderate',   cls: 'bg-score-moderate'  }
  return               { label: 'Weak',       cls: 'bg-score-weak'      }
}

const VERIFY_CONFIG = {
  YES:     { label: 'Verified',      icon: '✓', color: 'var(--teal)',  bg: 'var(--teal-lt)',  border: 'var(--teal-bd)' },
  PARTIAL: { label: 'Partial Match', icon: '~', color: 'var(--amber)', bg: 'var(--amber-lt)', border: 'var(--amber-bd)' },
  NO:      { label: 'Weak Support',  icon: '✗', color: 'var(--rose)',  bg: 'var(--rose-lt)',  border: 'var(--rose-bd)' },
}

export default function CitationCard({
  sentenceId, reference, refIndex, accepted, ignored, sentenceText,
  animDelay, allowMultiple, onToggleAccept,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(false)
  if (!reference) return null

  const score    = reference.confidence_score ?? 0
  const pct      = Math.round(score * 100)
  const strength = getStrength(score)
  const verify   = VERIFY_CONFIG[reference.verification_status] ?? VERIFY_CONFIG.PARTIAL
  const scoreColor = score >= 0.85 ? 'var(--str-excel)'
    : score >= 0.70 ? 'var(--str-strong)'
    : score >= 0.50 ? 'var(--str-good)'
    : score >= 0.30 ? 'var(--str-mod)'
    : 'var(--str-weak)'

  return (
    <div
      className="card-in rounded-lg overflow-hidden shrink-0"
      style={{
        animationDelay: `${animDelay}s`,
        border: accepted ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
        background: accepted ? 'var(--teal-lt)' : ignored ? 'var(--surface-2)' : 'var(--surface)',
        opacity: ignored ? 0.45 : 1,
        boxShadow: accepted ? '0 2px 12px rgba(15,155,142,0.15)' : 'var(--shadow-card)',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Score strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${scoreColor} ${pct}%, var(--border) ${pct}%)` }} />

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={`chip ${strength.cls}`} style={{ fontSize: '0.58rem' }}>{strength.label}</span>
            <span className="chip" style={{ color: verify.color, background: verify.bg, borderColor: verify.border, fontSize: '0.58rem' }}>
              {verify.icon} {verify.label}
            </span>
            {reference.domain_tag && (
              <span className="chip" style={{ color: '#7B5CF0', background: 'rgba(123,92,240,0.08)', borderColor: 'rgba(123,92,240,0.25)', fontSize: '0.58rem' }}>
                {reference.domain_tag}
              </span>
            )}
            {accepted && (
              <span className="chip" style={{ color: 'var(--teal)', background: 'var(--teal-lt)', borderColor: 'var(--teal-bd)', fontSize: '0.58rem' }}>
                <CheckCheck size={9} /> Cited
              </span>
            )}
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '1rem', fontWeight: 700, lineHeight: 1, color: scoreColor }}>{pct}</span>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.52rem', color: 'var(--text-faint)' }}>/100</span>
          </div>
        </div>

        {/* Title */}
        <p style={{ fontFamily: 'var(--ff-display)', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: 6 }}>
          {reference.title}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-2" style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
          {reference.authors && <span>{reference.authors}</span>}
          {reference.year && (
            <span style={{ fontWeight: 600, color: (new Date().getFullYear() - (reference.year||0)) <= 5 ? 'var(--teal)' : 'var(--text-muted)' }}>
              {reference.year}
            </span>
          )}
          {reference.journal && <span style={{ fontStyle: 'italic' }}>{reference.journal}</span>}
          {reference.citation_count > 0 && (
            <span style={{ color: reference.citation_count > 500 ? 'var(--indigo)' : 'var(--text-muted)', fontWeight: reference.citation_count > 500 ? 600 : 400 }}>
              {reference.citation_count.toLocaleString()} cites
            </span>
          )}
        </div>

        {/* Abstract */}
        {reference.abstract && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-mid)', lineHeight: 1.5, marginBottom: 8, display: 'block', overflow: 'visible' }}>
            {reference.abstract}
          </p>
        )}

        {/* DOI */}
        {reference.doi && (
          <a href={`https://doi.org/${reference.doi}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 mb-2 hover:underline"
            style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--indigo)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
            onClick={e => e.stopPropagation()}>
            <ExternalLink size={9} /> doi:{reference.doi}
          </a>
        )}

        {/* Breakdown toggle */}
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 mb-2"
          style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--indigo)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}>
          <BarChart2 size={10} />
          {expanded ? 'Hide' : 'View'} score breakdown
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {expanded && <ScoreBreakdown reference={reference} sentenceText={sentenceText} />}

        {/* CTA */}
        <button
          onClick={() => onToggleAccept(sentenceId, refIndex)}
          disabled={ignored}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md mt-1"
          style={{
            fontFamily: 'var(--ff-ui)', fontSize: '0.72rem', fontWeight: 600,
            background: accepted ? 'var(--teal)' : 'transparent',
            border: accepted ? '1.5px solid var(--teal)' : '1.5px solid var(--border-dk)',
            color: accepted ? '#fff' : ignored ? 'var(--text-faint)' : 'var(--text-mid)',
            cursor: ignored ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
          }}
          onMouseEnter={e => { if (!ignored && !accepted) { e.currentTarget.style.borderColor='var(--teal)'; e.currentTarget.style.color='var(--teal)'; e.currentTarget.style.background='var(--teal-lt)' } }}
          onMouseLeave={e => { if (!ignored && !accepted) { e.currentTarget.style.borderColor='var(--border-dk)'; e.currentTarget.style.color='var(--text-mid)'; e.currentTarget.style.background='transparent' } }}
        >
          {accepted ? <><CheckCheck size={12} /> Remove citation</> : allowMultiple ? <>+ Add (multi-cite)</> : <>+ Add Citation</>}
        </button>
      </div>
    </div>
  )
}
