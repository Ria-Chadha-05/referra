'use client'

import { useEffect, useRef } from 'react'
import { Layers, CheckSquare, CheckSquare2, XSquare, SkipForward } from 'lucide-react'
import type { AnalyzeResponse, DecisionMap } from '@/types'
import CitationCard from './CitationCard'

interface CitationsPanelProps {
  result:           AnalyzeResponse | null
  decisions:        DecisionMap
  activeSentenceId: number | null
  onClickSentence:  (id: number) => void
  onToggleAccept:   (sentenceId: number, refIndex: number) => void
  onIgnoreAll:      (sentenceId: number) => void
  onUndo:           (sentenceId: number) => void
  onAcceptAll:      () => void
  isAccepted:       (sentenceId: number, refIndex: number) => boolean
  isIgnored:        (sentenceId: number) => boolean
  loading:          boolean
  width:            number
}

const PIPELINE_STEPS = ['Parse', 'Detect', 'Retrieve', 'Embed', 'Match', 'Score', 'Verify']

export default function CitationsPanel({
  result, decisions, activeSentenceId, onClickSentence, onToggleAccept,
  onIgnoreAll, onUndo, onAcceptAll, isAccepted, isIgnored, loading, width,
}: CitationsPanelProps) {
  const listRef  = useRef<HTMLDivElement>(null)
  const hasSuggs = result && result.suggestions.length > 0

  useEffect(() => {
    if (activeSentenceId === null || !listRef.current) return
    const el = listRef.current.querySelector(`[data-sid="${activeSentenceId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeSentenceId])

  const pendingCount = result
    ? result.suggestions.filter(s => !decisions[String(s.sentence_id)]).length
    : 0

  return (
    <div
      className="panel-col"
      style={{
        width,
        flexShrink: 0,
        background: 'var(--panel-head)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 shrink-0"
        style={{
          minHeight: 46,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '10px 16px',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} style={{ color: 'var(--indigo)' }} />
            <span style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
              References
            </span>
            {hasSuggs && (
              <span className="chip" style={{ color: 'var(--indigo)', background: 'var(--indigo-lt)', borderColor: 'var(--indigo-bd)', fontSize: '0.55rem' }}>
                {result!.suggestions.length} claim{result!.suggestions.length !== 1 ? 's' : ''} · {result!.suggestions.reduce((t, s) => t + s.refs.length, 0)} papers
              </span>
            )}
          </div>
          {hasSuggs && pendingCount > 0 && (
            <button
              onClick={onAcceptAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md transition-all"
              style={{
                fontFamily: 'var(--ff-ui)', fontSize: '0.68rem', fontWeight: 500,
                color: 'var(--teal)', border: '1px solid var(--teal-bd)',
                background: 'var(--teal-lt)', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--teal)'; e.currentTarget.style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--teal-lt)'; e.currentTarget.style.color='var(--teal)' }}
            >
              <CheckSquare size={11} /> Accept All
            </button>
          )}
        </div>

        {/* Pipeline indicator while loading */}
        {loading && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                {i > 0 && <div style={{ width: 8, height: 1, background: 'var(--border-dk)' }} />}
                <span
                  className="shimmer rounded"
                  style={{
                    fontFamily: 'var(--ff-mono)', fontSize: '0.52rem',
                    color: 'var(--text-muted)', padding: '1px 4px',
                    animationDelay: `${i * 0.12}s`,
                  }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-fill gap-4">
          <div className="spinner" />
          <div className="text-center">
            <p style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-mid)' }}>
              Analyzing your text…
            </p>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.60rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Detecting claims · Retrieving papers · Verifying
            </p>
          </div>
        </div>
      ) : !hasSuggs ? (
        <div className="flex-fill gap-3 p-6 text-center">
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={20} style={{ color: 'var(--indigo)' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-mid)' }}>
              No results yet
            </p>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.60rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 180 }}>
              Paste academic text and click Analyze to get citation suggestions
            </p>
          </div>
        </div>
      ) : (
        <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 p-3 flex flex-col gap-3">
          {result!.suggestions.map(suggestion => {
            const sentence      = result!.sentences.find(s => s.id === suggestion.sentence_id)
            const sentenceText  = sentence?.text ?? ''
            const decided       = !!decisions[String(suggestion.sentence_id)]
            const sentIgnored   = isIgnored(suggestion.sentence_id)
            const acceptedCount = decisions[String(suggestion.sentence_id)]?.acceptedIndices?.length ?? 0
            const wantsMultiple = (suggestion.citation_count ?? 1) >= 2
            const isActive      = activeSentenceId === suggestion.sentence_id

            return (
              <div
                key={suggestion.sentence_id}
                data-sid={suggestion.sentence_id}
                className="rounded-xl overflow-hidden shrink-0"
                style={{
                  border: isActive ? '1.5px solid var(--indigo-bd)' : '1.5px solid var(--border)',
                  background: isActive ? 'rgba(172,59,97,0.02)' : 'var(--surface)',
                  boxShadow: isActive ? '0 0 0 3px var(--indigo-lt)' : 'none',
                  transition: 'all 0.18s',
                }}
              >
                {/* Claim header */}
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                  style={{ borderBottom: '1px solid var(--border-lt)', background: isActive ? 'var(--indigo-lt)' : 'var(--surface-2)' }}
                  onClick={() => onClickSentence(suggestion.sentence_id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.06em' }}>
                      CLAIM {suggestion.sentence_id + 1}
                    </span>
                    {wantsMultiple && (
                      <span className="chip" style={{ color: 'var(--amber)', background: 'var(--amber-lt)', borderColor: 'var(--amber-bd)', fontSize: '0.52rem' }}>
                        multi-cite
                      </span>
                    )}
                    {acceptedCount > 0 && (
                      <span className="chip" style={{ color: 'var(--teal)', background: 'var(--teal-lt)', borderColor: 'var(--teal-bd)', fontSize: '0.52rem' }}>
                        {acceptedCount} cited
                      </span>
                    )}
                    {sentIgnored && (
                      <span className="chip" style={{ color: 'var(--text-muted)', background: 'var(--surface-3)', borderColor: 'var(--border-dk)', fontSize: '0.52rem' }}>
                        skipped
                      </span>
                    )}
                  </div>
                  {decided && (
                    <button
                      onClick={e => { e.stopPropagation(); onUndo(suggestion.sentence_id) }}
                      style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.55rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--indigo)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      ↩ undo
                    </button>
                  )}
                </div>

                {/* Per-claim action bar */}
                {!decided && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ borderBottom: '1px solid var(--border-lt)', background: 'var(--surface-2)' }}>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        suggestion.refs.forEach((_, ri) => {
                          if (!isAccepted(suggestion.sentence_id, ri)) onToggleAccept(suggestion.sentence_id, ri)
                        })
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded transition-all"
                      style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.55rem', fontWeight: 500, color: 'var(--teal)', border: '1px solid var(--teal-bd)', background: 'var(--teal-lt)', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background='var(--teal)'; e.currentTarget.style.color='#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background='var(--teal-lt)'; e.currentTarget.style.color='var(--teal)' }}
                    >
                      <CheckSquare2 size={9} /> Accept All Papers
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onIgnoreAll(suggestion.sentence_id) }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded transition-all"
                      style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.55rem', fontWeight: 500, color: 'var(--rose)', border: '1px solid var(--rose-bd)', background: 'var(--rose-lt)', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background='var(--rose)'; e.currentTarget.style.color='#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background='var(--rose-lt)'; e.currentTarget.style.color='var(--rose)' }}
                    >
                      <XSquare size={9} /> Reject All
                    </button>
                  </div>
                )}

                {/* Sentence preview */}
                <p
                  className="px-3 py-1.5"
                  style={{
                    fontFamily: 'var(--ff-display)', fontSize: '0.72rem', fontStyle: 'italic',
                    color: 'var(--text-muted)', borderBottom: '1px solid var(--border-lt)',
                    lineHeight: 1.4, display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}
                >
                  &ldquo;{sentenceText}&rdquo;
                </p>

                {/* Ref cards */}
                <div className="p-2.5 flex flex-col gap-2">
                  {suggestion.refs.map((ref, ri) =>
                    ref ? (
                      <CitationCard
                        key={ref.ref_id ?? `${suggestion.sentence_id}-${ri}`}
                        sentenceId={suggestion.sentence_id}
                        reference={ref}
                        refIndex={ri}
                        accepted={isAccepted(suggestion.sentence_id, ri)}
                        ignored={sentIgnored}
                        sentenceText={sentenceText}
                        animDelay={ri * 0.06}
                        allowMultiple={wantsMultiple}
                        onToggleAccept={onToggleAccept}
                        onIgnoreAll={onIgnoreAll}
                        onUndo={onUndo}
                      />
                    ) : null
                  )}

                  {!decided && (
                    <button
                      onClick={() => onIgnoreAll(suggestion.sentence_id)}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md transition-all"
                      style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', border: '1px dashed var(--border-dk)', background: 'transparent', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--rose)'; e.currentTarget.style.color='var(--rose)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-dk)'; e.currentTarget.style.color='var(--text-muted)' }}
                    >
                      <SkipForward size={10} /> Skip — no citation needed
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
