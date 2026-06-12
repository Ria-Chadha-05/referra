'use client'

import { CheckCircle2, Clock, BookOpen, FileSearch } from 'lucide-react'

interface StatusBarProps {
  totalClaims:   number
  acceptedCount: number
  pendingCount:  number
  totalRefs:     number
  ready:         boolean
}

export default function StatusBar({
  totalClaims, acceptedCount, pendingCount, totalRefs, ready,
}: StatusBarProps) {
  const completionPct = totalClaims > 0
    ? Math.round(((totalClaims - pendingCount) / totalClaims) * 100)
    : 0

  return (
    <footer
      className="flex items-center justify-between px-5 shrink-0"
      style={{
        height: 34,
        background: 'var(--navy-dk)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-5">
        {ready ? (
          <>
            <Metric icon={<FileSearch size={11} />} label="Claims detected" value={totalClaims} />
            <Metric icon={<BookOpen size={11} />}   label="Papers retrieved" value={totalRefs} />
            <Metric icon={<CheckCircle2 size={11} />} label="Citations accepted" value={acceptedCount} color="var(--teal)" />
            {pendingCount > 0 && (
              <Metric icon={<Clock size={11} />} label="Pending review" value={pendingCount} color="var(--amber)" />
            )}
            {totalClaims > 0 && (
              <div className="flex items-center gap-1.5">
                <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${completionPct}%`,
                      height: '100%',
                      background: completionPct === 100 ? 'var(--teal)' : 'var(--indigo)',
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
                  {completionPct}%
                </span>
              </div>
            )}
          </>
        ) : (
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
            Paste or write academic text to begin analysis
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="pulse-dot" style={{ width: 5, height: 5 }} />
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)' }}>
          Referra v2 · Semantic Scholar · LLaMA3-70b
        </span>
      </div>
    </footer>
  )
}

function Metric({ icon, label, value, color = 'rgba(255,255,255,0.55)' }: {
  icon: React.ReactNode
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', fontWeight: 500, color }}>
        {value}
      </span>
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)' }}>
        {label}
      </span>
    </div>
  )
}
