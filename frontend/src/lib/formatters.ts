import type { Reference, CitationStyle, DecisionMap, Suggestion, Sentence } from '@/types'

/**
 * Build a map of sentenceId → array of ref numbers (1-based).
 * Sentences with multiple accepted refs get [1, 3] style numbers.
 * Numbers are assigned in the order sentences appear in the text.
 */
export function buildRefNumberMap(
  sentences:   Sentence[],
  suggestions: Suggestion[],
  decisions:   DecisionMap
): Record<number, number[]> {
  const suggMap: Record<number, Suggestion> = {}
  for (const s of suggestions) suggMap[s.sentence_id] = s

  const map: Record<number, number[]> = {}
  let num = 1

  for (const s of sentences) {
    const dec = decisions[String(s.id)]
    if (!dec || dec.acceptedIndices.length === 0) continue

    const nums: number[] = []
    // Sort accepted indices so numbers are assigned in rank order
    const sorted = [...dec.acceptedIndices].sort((a, b) => a - b)
    for (const _ of sorted) {
      nums.push(num++)
    }
    map[s.id] = nums
  }

  return map
}

/**
 * Get all accepted refs in text order, each with its assigned ref number.
 * Returns flat list — a sentence with 2 accepted refs contributes 2 entries.
 */
export function getAcceptedRefs(
  sentences:   Sentence[],
  suggestions: Suggestion[],
  decisions:   DecisionMap
): Array<{ ref: Reference; num: number; sentenceId: number }> {
  const suggMap: Record<number, Suggestion> = {}
  for (const s of suggestions) suggMap[s.sentence_id] = s

  const result: Array<{ ref: Reference; num: number; sentenceId: number }> = []
  let num = 1

  for (const s of sentences) {
    const dec  = decisions[String(s.id)]
    if (!dec || dec.acceptedIndices.length === 0) continue

    const sugg = suggMap[s.id]
    if (!sugg) continue

    const sorted = [...dec.acceptedIndices].sort((a, b) => a - b)
    for (const ri of sorted) {
      const ref = sugg.refs[ri]
      if (ref) result.push({ ref, num: num++, sentenceId: s.id })
    }
  }

  return result
}

// ── Deduplication helper ──────────────────────────────────────────────────────
// In edge cases the same DOI might appear twice — deduplicate by DOI then title
export function deduplicateRefs(
  refs: Array<{ ref: Reference; num: number; sentenceId: number }>
): Array<{ ref: Reference; num: number; sentenceId: number }> {
  const seenDois   = new Set<string>()
  const seenTitles = new Set<string>()
  return refs.filter(({ ref }) => {
    const doi    = ref.doi?.trim()
    const ntitle = ref.title?.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (doi    && seenDois.has(doi))       return false
    if (ntitle && seenTitles.has(ntitle))  return false
    if (doi)    seenDois.add(doi)
    if (ntitle) seenTitles.add(ntitle)
    return true
  })
}

// ── Format by style ───────────────────────────────────────────────────────────

export function formatRef(ref: Reference, num: number, style: CitationStyle): string {
  switch (style) {
    case 'IEEE': return formatIEEE(ref, num)
    case 'MLA':  return formatMLA(ref, num)
    default:     return formatAPA(ref, num)
  }
}

export function formatAPA(ref: Reference, num: number): string {
  const authors = _shortenAuthors(ref.authors)
  const year    = ref.year ? `(${ref.year})` : '(n.d.)'
  const journal = ref.journal ? `*${ref.journal}*` : ''
  const vol     = ref.volume  ? `, *${ref.volume}*` : ''
  const pages   = ref.pages   ? `, ${ref.pages}`    : ''
  const doi     = ref.doi     ? ` https://doi.org/${ref.doi}` : ''
  return `[${num}] ${authors} ${year}. ${ref.title}. ${journal}${vol}${pages}.${doi}`
}

export function formatIEEE(ref: Reference, num: number): string {
  const authors = _ieeeAuthors(ref.authors)
  const journal = ref.journal ? `*${ref.journal}*` : ''
  const vol     = ref.volume  ? `, vol. ${ref.volume}` : ''
  const pages   = ref.pages   ? `, pp. ${ref.pages}`  : ''
  const year    = ref.year    ? `, ${ref.year}`        : ''
  const doi     = ref.doi     ? `, doi: ${ref.doi}`    : ''
  return `[${num}] ${authors}, "${ref.title}", ${journal}${vol}${pages}${year}${doi}.`
}

export function formatMLA(ref: Reference, num: number): string {
  const authors = _mlaAuthors(ref.authors)
  const journal = ref.journal ? `*${ref.journal}*` : ''
  const vol     = ref.volume  ? `, ${ref.volume}`  : ''
  const year    = ref.year    ? ` (${ref.year})`   : ''
  const pages   = ref.pages   ? `: ${ref.pages}`   : ''
  const doi     = ref.doi     ? `. doi:${ref.doi}`  : ''
  return `[${num}] ${authors} "${ref.title}." ${journal}${vol}${year}${pages}${doi}.`
}

export function formatBibTeX(ref: Reference): string {
  const key   = _bibtexKey(ref)
  const lines = [`@article{${key},`]
  lines.push(`  title   = {${ref.title}},`)
  lines.push(`  author  = {${ref.authors}},`)
  if (ref.year)    lines.push(`  year    = {${ref.year}},`)
  if (ref.journal) lines.push(`  journal = {${ref.journal}},`)
  if (ref.volume)  lines.push(`  volume  = {${ref.volume}},`)
  if (ref.pages)   lines.push(`  pages   = {${ref.pages}},`)
  if (ref.doi)     lines.push(`  doi     = {${ref.doi}},`)
  lines.push('}')
  return lines.join('\n')
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _shortenAuthors(authors: string): string {
  if (!authors) return 'Unknown'
  const parts = authors.split(',').map(a => a.trim()).filter(Boolean)
  if (parts.length === 0) return 'Unknown'
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`
  return `${parts[0]} et al.`
}

function _ieeeAuthors(authors: string): string {
  if (!authors) return 'Unknown'
  const parts = authors.split(',').map(a => a.trim()).filter(a => a && a.toLowerCase() !== 'et al.')
  if (parts.length === 0) return 'Unknown'
  return parts.length <= 3 ? parts.join(', ') : `${parts[0]} et al.`
}

function _mlaAuthors(authors: string): string {
  if (!authors) return 'Unknown'
  const parts = authors.split(',').map(a => a.trim()).filter(a => a && a.toLowerCase() !== 'et al.')
  if (parts.length === 0) return 'Unknown'
  return parts.length === 1 ? parts[0] : `${parts[0]}, et al.`
}

function _bibtexKey(ref: Reference): string {
  const lastName = (ref.authors || 'Unknown').split(',')[0].trim().split(' ').pop() || 'Unknown'
  return `${lastName.replace(/[^a-zA-Z0-9]/g, '')}${ref.year || '0000'}`
}
