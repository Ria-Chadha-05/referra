'use client'

import type { Reference } from '@/types'

interface ScoreBreakdownProps {
  reference:    Reference
  sentenceText: string
}

/** Derive approximate per-dimension scores from available data */
function deriveScores(ref: Reference, sentenceText: string) {
  const currentYear = new Date().getFullYear()

  // 1. Semantic similarity — directly from backend
  const semantic = ref.semantic_score ?? 0

  // 2. Citation influence — log-normalize citation count
  const citMax = 50000
  const citScore = ref.citation_count > 0
    ? Math.min(Math.log10(ref.citation_count + 1) / Math.log10(citMax + 1), 1)
    : 0

  // 3. Recency — decay over 30 years
  const recency = ref.year
    ? Math.max(0, 1 - (currentYear - ref.year) / 30)
    : 0.4

  // 4. Keyword overlap — count shared tokens between sentence and title+abstract
  const sentTokens = new Set(
    sentenceText.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 3)
  )
  const paperText = ((ref.title ?? '') + ' ' + (ref.abstract ?? '')).toLowerCase()
  const paperTokens = paperText.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 3)
  const matches = paperTokens.filter(t => sentTokens.has(t)).length
  const overlap = sentTokens.size > 0 ? Math.min(matches / (sentTokens.size * 1.5), 1) : 0

  // 5. LLM verification boost
  const verBoost = ref.verification_status === 'YES' ? 1
    : ref.verification_status === 'PARTIAL' ? 0.5
    : 0.05

  // Weighted composite (matches backend formula)
  const composite = 0.40 * semantic + 0.20 * citScore + 0.15 * recency + 0.15 * overlap + 0.10 * verBoost

  return { semantic, citScore, recency, overlap, verBoost, composite }
}

const DIMENSIONS = [
  { key: 'semantic',  label: 'Semantic Match',    weight: 40, description: 'Embedding cosine similarity between claim and abstract' },
  { key: 'citScore',  label: 'Citation Impact',   weight: 20, description: 'Log-normalized h-index influence of the paper' },
  { key: 'recency',   label: 'Recency',           weight: 15, description: 'Recency decay — how recent the publication is' },
  { key: 'overlap',   label: 'Keyword Overlap',   weight: 15, description: 'Token overlap between claim and title/abstract' },
  { key: 'verBoost',  label: 'AI Verification',   weight: 10, description: 'LLM YES/PARTIAL/NO stance on this paper–claim pair' },
] as const

function scoreColor(v: number): string {
  if (v >= 0.85) return 'var(--str-excel)'
  if (v >= 0.70) return 'var(--str-strong)'
  if (v >= 0.50) return 'var(--str-good)'
  if (v >= 0.30) return 'var(--str-mod)'
  return 'var(--str-weak)'
}

export default function ScoreBreakdown({ reference, sentenceText }: ScoreBreakdownProps) {
  const scores = deriveScores(reference, sentenceText)

  return (
    <div
      className="mt-2 p-3 rounded-md"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-between mb-2.5"
        style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}
      >
        <span>Score breakdown</span>
        <span style={{ color: scoreColor(scores.composite), fontWeight: 600 }}>
          {Math.round(scores.composite * 100)}% overall
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {DIMENSIONS.map(dim => {
          const val = scores[dim.key]
          const pct = Math.round(val * 100)
          const color = scoreColor(val)

          return (
            <div key={dim.key} title={dim.description}>
              <div
                className="flex items-center justify-between mb-0.5"
                style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.56rem' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  {dim.label}
                  <span style={{ color: 'var(--text-faint)', marginLeft: 4 }}>×{dim.weight}%</span>
                </span>
                <span style={{ color, fontWeight: 600 }}>{pct}%</span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: color,
                    borderRadius: 2,
                    animationDelay: '0.1s',
                    animationDuration: '0.5s',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
