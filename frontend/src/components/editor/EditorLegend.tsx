'use client'

export default function EditorLegend() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-2 shrink-0"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: '0.56rem',
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}
      >
        Legend
      </span>
      <LegendItem color="var(--indigo)" label="Claim — needs citation" underline />
      <LegendItem color="var(--teal)"   label="Cited — reference accepted" underline />
      <LegendItem color="var(--border-dk)" label="Ignored" dashed />
      <span
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: '0.56rem',
          color: 'var(--text-faint)',
          marginLeft: 'auto',
        }}
      >
        Click a sentence to jump to its references
      </span>
    </div>
  )
}

function LegendItem({
  color,
  label,
  underline,
  dashed,
}: {
  color: string
  label: string
  underline?: boolean
  dashed?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        style={{
          display: 'inline-block',
          width: 22,
          height: 12,
          borderRadius: 2,
          borderBottom: dashed
            ? `2px dashed ${color}`
            : underline
            ? `2px solid ${color}`
            : `2px solid ${color}`,
          background: underline
            ? color === 'var(--indigo)'
              ? 'var(--indigo-lt)'
              : 'var(--teal-lt)'
            : 'transparent',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: '0.57rem',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
