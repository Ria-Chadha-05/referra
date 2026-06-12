// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export type ClaimType =
  | 'empirical'
  | 'statistical'
  | 'methodological'
  | 'theoretical'
  | 'none'

export type VerificationStatus = 'YES' | 'PARTIAL' | 'NO'
export type CitationStyle      = 'APA' | 'IEEE' | 'MLA'

export interface Sentence {
  id:             number
  text:           string
  is_claim:       boolean
  claim_type:     ClaimType
  // 0 = no citation needed, 1 = single, 2 = multiple recommended
  citation_count: number
}

export interface Reference {
  ref_id:               string   // "<sentence_id>-<rank>"
  title:                string
  authors:              string
  year:                 number | null
  journal:              string | null
  volume:               string | null
  pages:                string | null
  doi:                  string | null
  citation_count:       number
  abstract:             string | null
  verification_status:  VerificationStatus
  confidence_score:     number
  semantic_score:       number
  domain_tag:           string | null
}

export interface Suggestion {
  sentence_id:    number
  citation_count: number   // how many citations recommended for this sentence
  refs:           Reference[]
}

export interface AnalyzeResponse {
  sentences:       Sentence[]
  suggestions:     Suggestion[]
  citation_style:  CitationStyle
  total_claims:    number
  total_refs_found: number
}

// ── Decisions ─────────────────────────────────────────────────────────────────

export type DecisionStatus = 'accepted' | 'ignored'

export interface Decision {
  // Array of accepted ref indices — supports multiple citations per sentence
  acceptedIndices: number[]
  // If user explicitly ignored all refs for this sentence
  ignored: boolean
}

// key = sentence id as string
export type DecisionMap = Record<string, Decision>

// ── Documents ─────────────────────────────────────────────────────────────────

export interface DocumentListItem {
  id:             string
  title:          string
  citation_style: CitationStyle
  created_at:     string
  updated_at:     string
  sentence_count: number
  accepted_count: number
}

export interface DocumentDetail {
  id:              string
  title:           string
  raw_text:        string
  pipeline_result: AnalyzeResponse | null
  decisions:       DecisionMap
  citation_style:  CitationStyle
  created_at:      string
  updated_at:      string
}

export type AppStep = 'input' | 'review' | 'output'
