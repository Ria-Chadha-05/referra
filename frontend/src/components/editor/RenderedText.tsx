'use client'

import type { Sentence, DecisionMap, Suggestion } from '@/types'
import { buildRefNumberMap } from '@/lib/formatters'

interface RenderedTextProps {
  sentences:        Sentence[]
  suggestions:      Suggestion[]
  decisions:        DecisionMap
  activeSentenceId: number | null
  onClickSentence:  (id: number) => void
}

export default function RenderedText({
  sentences, suggestions, decisions, activeSentenceId, onClickSentence,
}: RenderedTextProps) {
  const refNums = buildRefNumberMap(sentences, suggestions, decisions)

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: 'var(--surface)', color: 'var(--text)' }}
    >
      <p style={{ fontFamily: 'var(--ff-ui)', fontSize: '0.94rem', lineHeight: 1.85 }}>
        {sentences.map((s, i) => {
          const dec        = decisions[String(s.id)]
          const nums       = refNums[s.id] ?? []
          const isAccepted = nums.length > 0
          const isIgnored  = dec?.ignored === true
          const isActive   = activeSentenceId === s.id

          if (!s.is_claim) {
            return <span key={s.id}>{s.text}{i < sentences.length - 1 ? ' ' : ''}</span>
          }

          const cls = isAccepted
            ? 's-accepted'
            : isIgnored
              ? 's-ignored'
              : `s-claim${isActive ? ' active' : ''}`

          return (
            <span key={s.id}>
              <span
                className={cls}
                onClick={() => onClickSentence(s.id)}
                title={
                  isAccepted ? `Cited as [${nums.join('], [')}]` :
                  isIgnored  ? 'No citation — skipped' :
                  'Click to review references'
                }
              >
                {s.text}
                {isAccepted && nums.map(n => (
                  <sup
                    key={n}
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '0.62rem',
                      marginLeft: 1,
                      color: 'var(--indigo)',
                      fontWeight: 600,
                    }}
                  >
                    [{n}]
                  </sup>
                ))}
              </span>
              {i < sentences.length - 1 ? ' ' : ''}
            </span>
          )
        })}
      </p>
    </div>
  )
}
