'use client'

import { ExternalLink } from 'lucide-react'
import type { AnalyzeResponse, DecisionMap, CitationStyle } from '@/types'
import { getAcceptedRefs, deduplicateRefs, formatRef } from '@/lib/formatters'

interface ReferenceListProps {
  result:        AnalyzeResponse
  decisions:     DecisionMap
  citationStyle: CitationStyle
}

function scoreColor(score: number) {
  if (score >= 0.85) return 'var(--str-excel)'
  if (score >= 0.70) return 'var(--str-strong)'
  if (score >= 0.50) return 'var(--str-good)'
  if (score >= 0.30) return 'var(--str-mod)'
  return 'var(--str-weak)'
}

const VERIFY_COLORS: Record<string, string> = {
  YES:     'var(--teal)',
  PARTIAL: 'var(--amber)',
  NO:      'var(--rose)',
}

export default function ReferenceList({ result, decisions, citationStyle }: ReferenceListProps) {
  const raw      = getAcceptedRefs(result.sentences, result.suggestions, decisions)
  const accepted = deduplicateRefs(raw)
  if (accepted.length === 0) return null

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: '0.58rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          paddingBottom: 8,
          marginBottom: 10,
          borderBottom: '1px solid var(--border)',
        }}
      >
        References
      </div>

      <div className="flex flex-col gap-3">
        {accepted.map(({ ref, num }) => {
          const pct   = Math.round((ref.confidence_score ?? 0) * 100)
          const color = scoreColor(ref.confidence_score ?? 0)
          const vColor = VERIFY_COLORS[ref.verification_status] ?? 'var(--text-muted)'

          return (
            <div
              key={`${ref.ref_id}-${num}`}
              className="rounded-lg px-3 py-2.5"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${color}`,
                borderRadius: 8,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '0.60rem',
                    fontWeight: 700,
                    color: 'var(--indigo)',
                  }}
                >
                  [{num}]
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '0.56rem',
                      fontWeight: 700,
                      color,
                    }}
                  >
                    {pct}%
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '0.54rem',
                      color: vColor,
                    }}
                  >
                    {ref.verification_status}
                  </span>
                </div>
              </div>

              <p
                style={{
                  fontFamily: 'var(--ff-ui)',
                  fontSize: '0.76rem',
                  lineHeight: 1.5,
                  color: 'var(--text-mid)',
                }}
              >
                {formatRef(ref, num, citationStyle)}
              </p>

              {ref.doi && (
                <a
                  href={`https://doi.org/${ref.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1 hover:underline"
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '0.56rem',
                    color: 'var(--indigo)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                >
                  <ExternalLink size={8} />
                  doi:{ref.doi}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
