'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CitationStyle, DecisionMap } from '@/types'

import { useAnalyze }   from '@/hooks/useAnalyze'
import { useDecisions } from '@/hooks/useDecisions'

import TopBar         from '@/components/layout/TopBar'
import StatusBar      from '@/components/layout/StatusBar'
import EditorPanel    from '@/components/editor/EditorPanel'
import CitationsPanel from '@/components/citations/CitationsPanel'
import OutputPanel    from '@/components/output/OutputPanel'
import { apiSaveDocument } from '@/lib/api'

// ── Resize hook ───────────────────────────────────────────────────────────────
function useResizable(
  initialA: number,
  initialB: number,
  initialC: number,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [widths, setWidths] = useState<[number, number, number]>([initialA, initialB, initialC])
  const dragging = useRef<0 | 1 | null>(null)
  const startX   = useRef(0)
  const startW   = useRef<[number, number]>([0, 0])

  const scaleToWidth = useCallback((next: [number, number, number], containerWidth: number) => {
    const handleSpace = 10 // two resize handles at 5px each
    const available = Math.max(containerWidth - handleSpace, 0)
    const total = next.reduce((sum, n) => sum + n, 0)

    if (available <= 0 || total <= 0) return next

    const factor = available / total
    return next.map(n => Math.max(0, Math.round(n * factor))) as [number, number, number]
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const apply = (containerWidth: number) => {
      setWidths(prev => scaleToWidth(prev, containerWidth))
    }

    apply(el.getBoundingClientRect().width)

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        apply(entry.contentRect.width)
      }
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, scaleToWidth])

  const onMouseDown = useCallback((divider: 0 | 1) => (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = divider
    startX.current   = e.clientX
    startW.current   = divider === 0 ? [widths[0], widths[1]] : [widths[1], widths[2]]
  }, [widths])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current === null) return
      const dx   = e.clientX - startX.current
      const idx  = dragging.current
      const minW = 220

      if (idx === 0) {
        const newA = Math.max(minW, Math.min(startW.current[0] + dx, startW.current[0] + startW.current[1] - minW))
        const newB = startW.current[0] + startW.current[1] - newA
        setWidths(prev => [newA, newB, prev[2]])
      } else {
        const newB = Math.max(minW, Math.min(startW.current[0] + dx, startW.current[0] + startW.current[1] - minW))
        const newC = startW.current[0] + startW.current[1] - newB
        setWidths(prev => [prev[0], newB, newC])
      }
    }
    const onUp = () => { dragging.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  return { widths, onMouseDown }
}

export default function Home() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token,    setToken]    = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('referra_token')
    const n = localStorage.getItem('referra_name')
    if (t) setToken(t)
    if (n) setUserName(n)
  }, [])

  const handleLogout = useCallback(() => {
    setToken(null)
    setUserName(null)
    localStorage.removeItem('referra_token')
    localStorage.removeItem('referra_name')
  }, [])

  // ── Text & style ──────────────────────────────────────────────────────────
  const [text,          setText]          = useState('')
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA')

  // ── Analysis ──────────────────────────────────────────────────────────────
  const { result, loading, error, step, analyze, reset, setStep } = useAnalyze()

  const handleAnalyze = useCallback(() => {
    decisionReset()
    analyze(text, citationStyle)
  }, [text, citationStyle, analyze])

  const handleReset = useCallback(() => {
    setText('')
    reset()
    decisionReset()
  }, [reset])

  // ── Decisions ─────────────────────────────────────────────────────────────
  const {
    decisions, toggleAccept, ignoreAll, undo, acceptAll, reset: decisionReset,
    isAccepted, isIgnored, acceptedCount, pendingCount,
  } = useDecisions()

  // ── Active sentence ───────────────────────────────────────────────────────
  const [activeSentenceId, setActiveSentenceId] = useState<number | null>(null)

  // ── Save ──────────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedId,   setSavedId]   = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    if (!token || !result) return
    setSaving(true); setSaveError(null)
    try {
      const doc = await apiSaveDocument(token, {
        title:           text.slice(0, 60).trim() + (text.length > 60 ? '…' : ''),
        raw_text:        text,
        pipeline_result: result,
        decisions,
        citation_style:  citationStyle,
      })
      setSavedId(doc.id)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [token, result, text, decisions, citationStyle])

  // ── Resizable panels ──────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const { widths, onMouseDown } = useResizable(520, 360, 320, containerRef)

  // ── Derived counts ────────────────────────────────────────────────────────
  const totalClaims = result?.total_claims     ?? 0
  const totalRefs   = result?.total_refs_found ?? 0
  const pending     = result ? pendingCount(result.suggestions) : 0
  const accepted    = acceptedCount

  const statusText =
    !result         ? 'Enter your text to begin' :
    step === 'review' ? `${totalClaims} claims · ${accepted} accepted` :
    step === 'output' ? `${accepted} citation${accepted !== 1 ? 's' : ''} ready` :
    'Ready'

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <TopBar
        step={step}
        statusText={statusText}
        token={token}
        userName={userName}
        onLogout={handleLogout}
      />

      <main
        ref={containerRef}
        className="flex flex-1 w-full overflow-hidden"
        style={{ minHeight: 0, minWidth: 0, userSelect: 'none' }}
      >
        <EditorPanel
          text={text}
          onTextChange={setText}
          citationStyle={citationStyle}
          onStyleChange={setCitationStyle}
          onAnalyze={handleAnalyze}
          loading={loading}
          error={error}
          result={result}
          decisions={decisions}
          activeSentenceId={activeSentenceId}
          onClickSentence={setActiveSentenceId}
          onReset={handleReset}
          step={step}
          width={widths[0]}
        />

        {/* Resize handle 1 */}
        <div
          className="resize-handle"
          onMouseDown={onMouseDown(0)}
          title="Drag to resize panels"
        />

        <CitationsPanel
          result={result}
          decisions={decisions}
          activeSentenceId={activeSentenceId}
          onClickSentence={setActiveSentenceId}
          onToggleAccept={toggleAccept}
          onIgnoreAll={ignoreAll}
          onUndo={undo}
          onAcceptAll={() => result && acceptAll(result.suggestions)}
          isAccepted={isAccepted}
          isIgnored={isIgnored}
          loading={loading}
          width={widths[1]}
        />

        {/* Resize handle 2 */}
        <div
          className="resize-handle"
          onMouseDown={onMouseDown(1)}
          title="Drag to resize panels"
        />

        <OutputPanel
          result={result}
          decisions={decisions}
          citationStyle={citationStyle}
          token={token}
          saving={saving}
          saveError={saveError}
          savedId={savedId}
          onSave={handleSave}
          onShowOutput={() => setStep('output')}
          step={step}
          width={widths[2]}
          rawText={text}
        />
      </main>

      <StatusBar
        totalClaims={totalClaims}
        acceptedCount={accepted}
        pendingCount={pending}
        totalRefs={totalRefs}
        ready={!!result}
      />
    </div>
  )
}
