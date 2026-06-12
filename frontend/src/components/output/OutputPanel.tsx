'use client'

import { useState } from 'react'
import { FileText, Copy, Check, Save, Download, FileDown, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'
import type { AnalyzeResponse, DecisionMap, CitationStyle, AppStep } from '@/types'
import { getAcceptedRefs, deduplicateRefs, formatRef, formatBibTeX } from '@/lib/formatters'
import { downloadAsWord } from '@/lib/wordExport'
import { useClipboard } from '@/hooks/useClipboard'
import CitedText     from './CitedText'
import ReferenceList from './ReferenceList'

interface OutputPanelProps {
  result:        AnalyzeResponse | null
  decisions:     DecisionMap
  citationStyle: CitationStyle
  token:         string | null
  saving:        boolean
  saveError:     string | null
  savedId:       string | null
  onSave:        () => void
  onShowOutput:  () => void
  step:          AppStep
  width:         number
  rawText?:      string
}

function getStrengthLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: 'var(--str-excel)' }
  if (score >= 70) return { label: 'Strong',    color: 'var(--str-strong)' }
  if (score >= 50) return { label: 'Good',      color: 'var(--str-good)' }
  if (score >= 30) return { label: 'Moderate',  color: 'var(--str-mod)' }
  return               { label: 'Weak',      color: 'var(--str-weak)' }
}

export default function OutputPanel({
  result, decisions, citationStyle, token, saving, saveError, savedId,
  onSave, width, rawText = 'Referra Export',
}: OutputPanelProps) {
  const { copied, copyText } = useClipboard()
  const [showMetrics, setShowMetrics] = useState(false)

  const raw      = result ? getAcceptedRefs(result.sentences, result.suggestions, decisions) : []
  const accepted = deduplicateRefs(raw)

  // ── Aggregate metrics ────────────────────────────────────────────────────
  const avgConfidence = accepted.length
    ? Math.round(accepted.reduce((s, { ref }) => s + (ref.confidence_score ?? 0), 0) / accepted.length * 100)
    : 0
  const verifiedCount = accepted.filter(({ ref }) => ref.verification_status === 'YES').length
  const totalCites    = accepted.reduce((s, { ref }) => s + ref.citation_count, 0)
  const avgYear       = accepted.length
    ? Math.round(accepted.reduce((s, { ref }) => s + (ref.year ?? 2020), 0) / accepted.length)
    : null

  const buildCopyText = () => {
    if (!result) return ''
    const numMap: Record<number, number[]> = {}
    let n = 1
    for (const s of result.sentences) {
      const dec = decisions[String(s.id)]
      if (!dec || dec.acceptedIndices.length === 0) continue
      numMap[s.id] = dec.acceptedIndices.sort((a, b) => a - b).map(() => n++)
    }
    let out = ''
    for (const s of result.sentences) {
      out += s.text
      const nums = numMap[s.id]
      if (nums?.length) out += ' ' + nums.map(n => `[${n}]`).join('')
      out += ' '
    }
    out += '\n\nREFERENCES\n\n'
    for (const { ref, num } of accepted) {
      out += formatRef(ref, num, citationStyle) + '\n\n'
    }
    return out.trim()
  }

  const downloadBibTeX = () => {
    if (!accepted.length) return
    const content = accepted.map(({ ref }) => formatBibTeX(ref)).join('\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'referra_citations.bib'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleWordDownload = async () => {
    if (!result) return
    const title = rawText.slice(0, 60).trim() + (rawText.length > 60 ? '…' : '')
    await downloadAsWord(result, decisions, citationStyle, title)
  }

  const hasOutput = result && accepted.length > 0

  return (
    <div
      className="panel-col"
      style={{
        width,
        flexShrink: 0,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 46, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: 'var(--indigo)' }} />
          <span style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
            Output
          </span>
          {accepted.length > 0 && (
            <span className="chip" style={{ color: 'var(--teal)', background: 'var(--teal-lt)', borderColor: 'var(--teal-bd)', fontSize: '0.55rem' }}>
              {accepted.length} ref{accepted.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hasOutput && (
          <div className="flex items-center gap-1.5">
            <IconBtn title="Copy output" onClick={() => copyText(buildCopyText())}>
              {copied ? <Check size={12} style={{ color: 'var(--teal)' }} /> : <Copy size={12} />}
            </IconBtn>
            <IconBtn title="Download BibTeX" onClick={downloadBibTeX}>
              <Download size={12} />
            </IconBtn>
            <IconBtn title="Download Word doc (.docx)" onClick={handleWordDownload}>
              <FileDown size={12} />
            </IconBtn>
            {token && (
              <IconBtn title={savedId ? 'Saved!' : 'Save to dashboard'} onClick={onSave} active={!!savedId}>
                <Save size={12} />
              </IconBtn>
            )}
          </div>
        )}
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-4">
        {!hasOutput ? (
          <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={22} style={{ color: 'var(--indigo)' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-mid)' }}>
                Your cited output appears here
              </p>
              <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.60rem', color: 'var(--text-muted)', marginTop: 6, maxWidth: 190 }}>
                Accept references in the middle panel to build your annotated document
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Aggregate metrics summary */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0 }}>
              <button
                className="w-full flex items-center justify-between px-4 py-2.5"
                onClick={() => setShowMetrics(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <div className="flex items-center gap-2">
                  <BarChart2 size={13} style={{ color: 'var(--indigo)' }} />
                  <span style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>
                    Citation Quality Summary
                  </span>
                </div>
                {showMetrics
                  ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} />
                  : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
              </button>

              {showMetrics && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-2 fade-up">
                  <MetricTile label="Avg. Confidence" value={`${avgConfidence}%`} color={getStrengthLabel(avgConfidence).color} sub={getStrengthLabel(avgConfidence).label} />
                  <MetricTile label="Verified Papers" value={`${verifiedCount}/${accepted.length}`} color="var(--teal)" sub="by LLaMA3-70b" />
                  <MetricTile label="Total Citations" value={totalCites.toLocaleString()} color="var(--indigo)" sub="combined impact" />
                  {avgYear && <MetricTile label="Avg. Year" value={String(avgYear)} color="var(--text-mid)" sub="publication date" />}

                  {/* Per-reference breakdown */}
                  <div className="col-span-2 mt-1">
                    <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Per-reference scores
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {accepted.map(({ ref, num }) => {
                        const pct = Math.round((ref.confidence_score ?? 0) * 100)
                        const strength = getStrengthLabel(pct)
                        return (
                          <div key={ref.ref_id ?? num} className="flex items-center gap-2">
                            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', width: 18, flexShrink: 0 }}>[{num}]</span>
                            <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: strength.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', fontWeight: 600, color: strength.color, width: 28, flexShrink: 0 }}>{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <CitedText sentences={result.sentences} suggestions={result.suggestions} decisions={decisions} />
            <ReferenceList result={result} decisions={decisions} citationStyle={citationStyle} />

            {saveError && (
              <p className="rounded-md px-3 py-2 shrink-0" style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--rose)', border: '1px solid var(--rose-bd)', background: 'var(--rose-lt)' }}>
                {saveError}
              </p>
            )}
            {savedId && (
              <p className="rounded-md px-3 py-2 shrink-0" style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--teal)', border: '1px solid var(--teal-bd)', background: 'var(--teal-lt)' }}>
                ✓ Saved to your dashboard
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => copyText(buildCopyText())}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all"
                style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.72rem', fontWeight: 600, background: 'var(--indigo)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(172,59,97,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--indigo-dk)' }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--indigo)' }}
              >
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Full Output</>}
              </button>

              <button
                onClick={handleWordDownload}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all"
                style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.72rem', fontWeight: 600, background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--navy)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--navy)'; e.currentTarget.style.color='#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--navy)' }}
              >
                <FileDown size={13} /> Download Word Doc
              </button>
            </div>

            {!token && (
              <p className="text-center shrink-0" style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.60rem', color: 'var(--text-muted)' }}>
                <a href="/dashboard" style={{ color: 'var(--indigo)' }}>Sign in</a> to save this document to your dashboard
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function IconBtn({ children, title, onClick, active = false }: {
  children: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-tooltip={title}
      className="flex items-center justify-center rounded-md transition-all"
      style={{
        width: 28, height: 28,
        border: `1px solid ${active ? 'var(--teal-bd)' : 'var(--border)'}`,
        background: active ? 'var(--teal-lt)' : 'var(--surface-2)',
        color: active ? 'var(--teal)' : 'var(--text-muted)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.borderColor='var(--indigo-bd)'
          e.currentTarget.style.color='var(--indigo)'
          e.currentTarget.style.background='var(--indigo-lt)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.borderColor='var(--border)'
          e.currentTarget.style.color='var(--text-muted)'
          e.currentTarget.style.background='var(--surface-2)'
        }
      }}
    >
      {children}
    </button>
  )
}

function MetricTile({ label, value, color, sub }: {
  label: string; value: string; color: string; sub?: string
}) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.56rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '1.1rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.54rem', color: 'var(--text-faint)', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}
