'use client'

import type { Sentence, DecisionMap, Suggestion } from '@/types'
import { buildRefNumberMap } from '@/lib/formatters'

interface CitedTextProps {
  sentences:   Sentence[]
  suggestions: Suggestion[]
  decisions:   DecisionMap
}

export default function CitedText({ sentences, suggestions, decisions }: CitedTextProps) {
  const refNums = buildRefNumberMap(sentences, suggestions, decisions)
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--ff-ui)',   // ← was ff-display (Playfair), now clean sans-serif
        fontSize: '0.88rem',
        lineHeight: 1.85,
        color: 'var(--text)',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {sentences.map((s, i) => {
        const nums = refNums[s.id] ?? []
        return (
          <span key={s.id}>
            {s.text}
            {nums.map(n => (
              <sup
                key={n}
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '0.58rem',
                  marginLeft: 1,
                  color: 'var(--indigo)',
                  fontWeight: 700,
                  lineHeight: 0,   // prevents sup from expanding line height
                }}
              >
                [{n}]
              </sup>
            ))}
            {i < sentences.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}
