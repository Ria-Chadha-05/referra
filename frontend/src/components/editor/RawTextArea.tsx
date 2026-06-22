'use client'

import { Sparkles, ChevronDown } from 'lucide-react'
import type { CitationStyle } from '@/types'

const STYLES: CitationStyle[] = ['APA', 'IEEE', 'MLA']

const EXAMPLES = [
  'Deep learning has emerged as one of the most influential branches of artificial intelligence and has transformed the field of computer vision. Modern deep learning architectures have demonstrated state-of-the-art performance on image classification, object detection, segmentation, and image generation tasks. Neural networks containing multiple hidden layers are capable of learning hierarchical feature representations, where lower layers capture simple patterns such as edges and textures while deeper layers learn complex semantic concepts. Convolutional neural networks revolutionized image recognition by exploiting spatial relationships within images and reducing the number of parameters required for training. In recent years, transformer-based vision models have further expanded the capabilities of computer vision systems and have shown competitive performance across numerous benchmarks. Transfer learning from large pre-trained models has significantly reduced the requirement for massive labeled datasets and has enabled researchers and practitioners to build effective models using comparatively smaller collections of domain-specific data. This approach has accelerated innovation in healthcare, autonomous vehicles, agriculture, and industrial automation. Deep learning techniques are increasingly being used to detect diseases from medical images, improve quality control in manufacturing environments, and provide real-time perception capabilities for self-driving cars. Despite these advances, several challenges remain. Training large neural networks requires substantial computational resources and energy consumption. Model interpretability continues to be an active area of research because understanding why a model makes a particular prediction is essential in safety-critical applications. Data bias and fairness concerns also influence model performance and can lead to unequal outcomes if not properly addressed. Researchers are actively investigating methods to improve robustness, reduce computational costs, and develop more explainable architectures. As hardware capabilities continue to improve and larger datasets become available, deep learning is expected to remain a key driver of progress in artificial intelligence and will likely enable new applications that were previously considered impossible.',
  'Climate change is one of the most significant environmental challenges facing humanity in the twenty-first century. Scientific evidence indicates that rising global temperatures are accelerating the loss of Arctic sea ice at unprecedented rates and are causing widespread disruptions to ecosystems around the world. Increasing concentrations of greenhouse gases, particularly carbon dioxide, methane, and nitrous oxide, are contributing to long-term warming trends. Atmospheric carbon dioxide concentrations have reached levels not observed in more than eight hundred thousand years, primarily due to human activities such as fossil fuel combustion, industrial processes, and deforestation. The consequences of climate change extend beyond temperature increases and include more frequent heat waves, changing precipitation patterns, rising sea levels, and intensified extreme weather events. Many plant and animal species are experiencing habitat loss and shifts in migration patterns as ecosystems adapt to changing environmental conditions. Agricultural productivity is also affected by droughts, floods, and changing growing seasons, posing risks to global food security. Coastal communities face increased vulnerability from storm surges and sea-level rise, while freshwater resources are becoming more stressed in many regions. Governments, international organizations, and researchers are working together to mitigate these impacts through renewable energy adoption, carbon reduction strategies, conservation efforts, and technological innovations. Solar power, wind energy, and energy storage technologies have become increasingly important components of global sustainability initiatives. Public awareness regarding climate change has grown substantially, encouraging businesses and consumers to adopt more environmentally responsible practices. Although significant challenges remain, advances in clean technology and international cooperation provide opportunities to reduce emissions and enhance resilience. Addressing climate change requires coordinated action across multiple sectors and long-term commitment from governments, industries, and individuals worldwide.',
  'Messenger RNA technology has transformed modern vaccine development and has demonstrated its value during the global COVID-19 pandemic. mRNA vaccines have proven highly effective against multiple variants of the virus and have provided strong protection against severe disease and hospitalization. Unlike traditional vaccines that use weakened pathogens or protein components, mRNA vaccines deliver genetic instructions that enable human cells to temporarily produce a harmless viral protein. The immune system recognizes this protein and generates antibodies and cellular responses that prepare the body to fight future infections. Lipid nanoparticles play a critical role in this process by protecting the fragile messenger RNA molecules and enabling efficient delivery into human cells. The success of mRNA technology has accelerated research into vaccines for influenza, respiratory syncytial virus, and various forms of cancer. Scientists are exploring personalized cancer vaccines that stimulate the immune system to target tumor-specific mutations unique to individual patients. The flexibility and rapid development cycle associated with mRNA platforms make them particularly valuable in responding to emerging infectious diseases. Advances in manufacturing techniques have improved scalability and enabled the production of millions of vaccine doses within relatively short periods. Despite these achievements, challenges such as cold-chain storage requirements, distribution logistics, and vaccine accessibility remain important considerations. Researchers are working to develop more stable formulations that can be stored at higher temperatures and distributed more easily in low-resource settings. Regulatory agencies continue to evaluate long-term safety and effectiveness data to ensure public confidence in these technologies. The broader implications of mRNA research extend beyond infectious diseases and may influence the future treatment of genetic disorders, autoimmune conditions, and personalized medicine. Continued investment in biotechnology and collaborative scientific research is expected to further expand the capabilities and applications of messenger RNA technologies in healthcare.'
]

interface RawTextAreaProps {
  value:         string
  onChange:      (v: string) => void
  citationStyle: CitationStyle
  onStyleChange: (s: CitationStyle) => void
  onAnalyze:     () => void
  loading:       boolean
  error:         string | null
}

export default function RawTextArea({
  value, onChange, citationStyle, onStyleChange, onAnalyze, loading, error,
}: RawTextAreaProps) {
  const charCount = value.length
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0

  return (
    <div className="flex flex-col h-full">
      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Paste your academic writing here…\n\nReferra will analyze each sentence, detect factual claims, retrieve relevant research papers from Semantic Scholar, and suggest verified citations with confidence scores.\n\nExample: "${EXAMPLES[0].slice(0, 100)}…"`}
          className="w-full h-full resize-none p-5"
          style={{
            fontFamily: 'var(--ff-ui)',
            fontSize: '0.94rem',
            lineHeight: 1.75,
            color: 'var(--text)',
            background: 'var(--surface)',
            border: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onAnalyze()
          }}
        />

        {/* Character count overlay */}
        {value && (
          <div
            className="absolute bottom-3 right-4"
            style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.56rem', color: 'var(--text-faint)' }}
          >
            {wordCount} words · {charCount} chars
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-md" style={{ background: 'var(--rose-lt)', border: '1px solid var(--rose-bd)' }}>
          <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--rose)' }}>{error}</p>
        </div>
      )}

      {/* Bottom toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {/* Citation style selector */}
        <div className="relative">
          <select
            value={citationStyle}
            onChange={e => onStyleChange(e.target.value as CitationStyle)}
            className="appearance-none pr-6 pl-3 py-1.5 rounded-md cursor-pointer"
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '0.68rem',
              fontWeight: 500,
              color: 'var(--text-mid)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              outline: 'none',
            }}
          >
            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>

        {/* Tip */}
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: 'var(--text-faint)', flex: 1 }}>
          ⌘↵ to analyze
        </span>

        {/* Try example */}
        {!value && (
          <button
            onClick={() => onChange(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)])}
            className="px-3 py-1.5 rounded-md transition-all"
            style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--indigo-bd)'; e.currentTarget.style.color='var(--indigo)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)' }}
          >
            Try example
          </button>
        )}

        {/* Analyze button */}
        <button
          onClick={onAnalyze}
          disabled={loading || !value.trim() || value.trim().length < 20}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md transition-all"
          style={{
            fontFamily: 'var(--ff-ui)',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: loading || !value.trim() ? 'var(--surface-3)' : 'var(--indigo)',
            color: loading || !value.trim() ? 'var(--text-faint)' : '#fff',
            border: '1.5px solid transparent',
            cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
            boxShadow: loading || !value.trim() ? 'none' : '0 2px 8px rgba(75,95,216,0.3)',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            if (!loading && value.trim().length >= 20) e.currentTarget.style.background = 'var(--indigo-dk)'
          }}
          onMouseLeave={e => {
            if (!loading && value.trim().length >= 20) e.currentTarget.style.background = 'var(--indigo)'
          }}
        >
          {loading ? (
            <><div className="spinner-sm" />Analyzing…</>
          ) : (
            <><Sparkles size={13} />Analyze Text</>
          )}
        </button>
      </div>
    </div>
  )
}
