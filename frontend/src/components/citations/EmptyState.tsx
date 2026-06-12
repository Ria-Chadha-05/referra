'use client'

import { Search } from 'lucide-react'

interface EmptyStateProps {
  loading: boolean
}

export default function EmptyState({ loading }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center"
      style={{ color: 'var(--text-dim)' }}
    >
      {loading ? (
        <>
          <div className="spinner" />
          <p className="font-mono text-[0.62rem] uppercase tracking-wider mt-2">
            Retrieving references…
          </p>
        </>
      ) : (
        <>
          <Search size={28} strokeWidth={1} style={{ opacity: 0.35 }} />
          <p className="font-mono text-[0.62rem] uppercase tracking-wider">
            References appear here
          </p>
          <p className="font-mono text-[0.58rem]" style={{ maxWidth: 200 }}>
            Analyze your text to detect claims and find supporting papers
          </p>
        </>
      )}
    </div>
  )
}
