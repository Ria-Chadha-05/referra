'use client'

import { useState, useCallback } from 'react'

interface UseClipboardReturn {
  copied:    boolean
  copyText:  (text: string) => Promise<void>
  copyError: string | null
}

export function useClipboard(resetAfterMs = 2000): UseClipboardReturn {
  const [copied,    setCopied]    = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const copyText = useCallback(
    async (text: string) => {
      setCopyError(null)
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), resetAfterMs)
      } catch {
        // Fallback for older browsers / insecure contexts
        try {
          const el = document.createElement('textarea')
          el.value = text
          el.style.position = 'fixed'
          el.style.opacity  = '0'
          document.body.appendChild(el)
          el.focus()
          el.select()
          document.execCommand('copy')
          document.body.removeChild(el)
          setCopied(true)
          setTimeout(() => setCopied(false), resetAfterMs)
        } catch {
          setCopyError('Copy failed. Please select and copy manually.')
        }
      }
    },
    [resetAfterMs]
  )

  return { copied, copyText, copyError }
}
