'use client'

import { useState, useCallback, useMemo } from 'react'
import type { DecisionMap, Suggestion } from '@/types'

interface UseDecisionsReturn {
  decisions:      DecisionMap
  toggleAccept:   (sentenceId: number, refIndex: number) => void
  ignoreAll:      (sentenceId: number) => void
  undo:           (sentenceId: number) => void
  acceptAll:      (suggestions: Suggestion[]) => void
  reset:          () => void
  isAccepted:     (sentenceId: number, refIndex: number) => boolean
  isIgnored:      (sentenceId: number) => boolean
  acceptedCount:  number
  pendingCount:   (suggestions: Suggestion[]) => number
}

export function useDecisions(initialDecisions?: DecisionMap): UseDecisionsReturn {
  const [decisions, setDecisions] = useState<DecisionMap>(initialDecisions ?? {})

  // Toggle a single ref on/off — allows multiple accepted per sentence
  const toggleAccept = useCallback((sentenceId: number, refIndex: number) => {
    setDecisions(prev => {
      const key     = String(sentenceId)
      const current = prev[key] ?? { acceptedIndices: [], ignored: false }
      const already = current.acceptedIndices.includes(refIndex)
      return {
        ...prev,
        [key]: {
          acceptedIndices: already
            ? current.acceptedIndices.filter(i => i !== refIndex)
            : [...current.acceptedIndices, refIndex],
          ignored: false,
        },
      }
    })
  }, [])

  // Mark all refs for a sentence as ignored
  const ignoreAll = useCallback((sentenceId: number) => {
    setDecisions(prev => ({
      ...prev,
      [String(sentenceId)]: { acceptedIndices: [], ignored: true },
    }))
  }, [])

  // Remove any decision for this sentence
  const undo = useCallback((sentenceId: number) => {
    setDecisions(prev => {
      const next = { ...prev }
      delete next[String(sentenceId)]
      return next
    })
  }, [])

  // Accept the top ref for every suggestion that hasn't been decided yet
  const acceptAll = useCallback((suggestions: Suggestion[]) => {
    setDecisions(prev => {
      const next = { ...prev }
      for (const s of suggestions) {
        const key = String(s.sentence_id)
        if (!next[key] && s.refs.length > 0) {
          // For citation_count=2 suggestions accept top 2, else just top 1
          const count   = Math.min(s.citation_count ?? 1, s.refs.length)
          const indices = Array.from({ length: count }, (_, i) => i)
          next[key]     = { acceptedIndices: indices, ignored: false }
        }
      }
      return next
    })
  }, [])

  const reset = useCallback(() => setDecisions({}), [])

  const isAccepted = useCallback(
    (sentenceId: number, refIndex: number) =>
      decisions[String(sentenceId)]?.acceptedIndices?.includes(refIndex) ?? false,
    [decisions]
  )

  const isIgnored = useCallback(
    (sentenceId: number) =>
      decisions[String(sentenceId)]?.ignored === true,
    [decisions]
  )

  // Count sentences that have at least one accepted ref
  const acceptedCount = useMemo(
    () => Object.values(decisions).filter(d => d.acceptedIndices.length > 0).length,
    [decisions]
  )

  const pendingCount = useCallback(
    (suggestions: Suggestion[]) =>
      suggestions.filter(s => !decisions[String(s.sentence_id)]).length,
    [decisions]
  )

  return {
    decisions,
    toggleAccept,
    ignoreAll,
    undo,
    acceptAll,
    reset,
    isAccepted,
    isIgnored,
    acceptedCount,
    pendingCount,
  }
}
