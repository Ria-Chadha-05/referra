'use client'

import type { AnalyzeResponse, CitationStyle, DecisionMap, AppStep } from '@/types'
import RawTextArea  from './RawTextArea'
import RenderedText from './RenderedText'
import EditorLegend from './EditorLegend'
import { PenLine, Highlighter } from 'lucide-react'

interface EditorPanelProps {
  text:             string
  onTextChange:     (v: string) => void
  citationStyle:    CitationStyle
  onStyleChange:    (s: CitationStyle) => void
  onAnalyze:        () => void
  loading:          boolean
  error:            string | null
  result:           AnalyzeResponse | null
  decisions:        DecisionMap
  activeSentenceId: number | null
  onClickSentence:  (id: number) => void
  onReset:          () => void
  step:             AppStep
  width:            number
}

export default function EditorPanel({
  text, onTextChange, citationStyle, onStyleChange,
  onAnalyze, loading, error, result, decisions,
  activeSentenceId, onClickSentence, onReset, step, width,
}: EditorPanelProps) {
  const showRendered = !!result && step !== 'input'

  return (
    <div
      className="panel-col"
      style={{
        width,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 46,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div className="flex items-center gap-2">
          {showRendered
            ? <Highlighter size={14} style={{ color: 'var(--indigo)' }} />
            : <PenLine size={14} style={{ color: 'var(--indigo)' }} />}
          <span style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
            {showRendered ? 'Highlighted Claims' : 'Write or Paste Text'}
          </span>
        </div>
        {result && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all"
            style={{
              fontFamily: 'var(--ff-ui)', fontSize: '0.68rem',
              color: 'var(--text-muted)', border: '1px solid var(--border)',
              background: 'var(--surface-2)', cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--indigo-bd)'
              e.currentTarget.style.color = 'var(--indigo)'
              e.currentTarget.style.background = 'var(--indigo-lt)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'var(--surface-2)'
            }}
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-20"
          style={{ background: 'rgba(255,253,251,0.92)', backdropFilter: 'blur(6px)', top: 46 }}
        >
          <div className="spinner" />
          <div className="text-center">
            <p style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-mid)' }}>
              Analyzing your text
            </p>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.60rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Detecting claims · Retrieving papers · Verifying with AI
            </p>
          </div>

          {/* Pipeline steps */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center px-8">
            {['Parse', 'Detect', 'Retrieve', 'Embed', 'Match', 'Score', 'Verify', 'Output'].map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                {i > 0 && <div style={{ width: 10, height: 1, background: 'var(--border-dk)' }} />}
                <span
                  className="shimmer rounded px-2 py-0.5"
                  style={{
                    fontFamily: 'var(--ff-mono)', fontSize: '0.55rem',
                    color: 'var(--text-muted)', animationDelay: `${i * 0.15}s`,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body — fills all remaining space */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {showRendered ? (
          <RenderedText
            sentences={result!.sentences}
            suggestions={result!.suggestions}
            decisions={decisions}
            activeSentenceId={activeSentenceId}
            onClickSentence={onClickSentence}
          />
        ) : (
          <RawTextArea
            value={text}
            onChange={onTextChange}
            citationStyle={citationStyle}
            onStyleChange={onStyleChange}
            onAnalyze={onAnalyze}
            loading={loading}
            error={error}
          />
        )}
      </div>

      {showRendered && <EditorLegend />}
    </div>
  )
}
