'use client'

import { useState, useCallback } from 'react'
import { apiAnalyze } from '@/lib/api'
import type { AnalyzeResponse, CitationStyle, AppStep } from '@/types'

interface UseAnalyzeReturn {
  result:    AnalyzeResponse | null
  loading:   boolean
  error:     string | null
  step:      AppStep
  analyze:   (text: string, style: CitationStyle) => Promise<void>
  reset:     () => void
  setStep:   (step: AppStep) => void
}

export function useAnalyze(): UseAnalyzeReturn {
  const [result,  setResult]  = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [step,    setStep]    = useState<AppStep>('input')

  const analyze = useCallback(async (text: string, style: CitationStyle) => {
    if (!text.trim()) {
      setError('Please enter some text before analyzing.')
      return
    }
    if (text.trim().length < 20) {
      setError('Text is too short. Please enter at least one full sentence.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await apiAnalyze(text, style)
      setResult(data)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setStep('input')
  }, [])

  return { result, loading, error, step, analyze, reset, setStep }
}
