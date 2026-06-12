import type { AnalyzeResponse, DecisionMap, CitationStyle } from '@/types'
import { getAcceptedRefs, deduplicateRefs, formatRef } from './formatters'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
} from 'docx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function divider(): Paragraph {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '123C69', space: 1 } },
    spacing: { before: 160, after: 160 },
  })
}

// ── Build annotated body runs ─────────────────────────────────────────────────

function buildBodyRuns(
  result: AnalyzeResponse,
  decisions: DecisionMap,
): { runs: TextRun[]; numMap: Record<number, number[]> } {
  const numMap: Record<number, number[]> = {}
  let n = 1
  for (const s of result.sentences) {
    const dec = decisions[String(s.id)]
    if (!dec || dec.acceptedIndices.length === 0) continue
    numMap[s.id] = dec.acceptedIndices.sort((a, b) => a - b).map(() => n++)
  }

  const runs: TextRun[] = []
  for (const s of result.sentences) {
    runs.push(new TextRun({ text: s.text + ' ', font: 'Times New Roman', size: 24 }))
    const nums = numMap[s.id]
    if (nums?.length) {
      for (const num of nums) {
        runs.push(
          new TextRun({
            text: `[${num}]`,
            superScript: true,
            color: '123C69',
            font: 'Times New Roman',
            size: 16,
          }),
        )
      }
    }
  }

  return { runs, numMap }
}

// ── References list ───────────────────────────────────────────────────────────

function buildRefsParagraphs(
  accepted: { ref: any; num: number }[],
  citationStyle: CitationStyle,
): Paragraph[] {
  return accepted.map(({ ref, num }) =>
    new Paragraph({
      children: [
        new TextRun({
          text: formatRef(ref, num, citationStyle),
          font: 'Times New Roman',
          size: 22,
        }),
      ],
      spacing: { before: 0, after: 100 },
      indent: { left: 480, hanging: 480 },
    }),
  )
}

// ── Metrics table ─────────────────────────────────────────────────────────────

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'D4C4BA' }
const BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER }

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: '123C69', type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 18 })],
      }),
    ],
  })
}

function dataCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: 'Arial', size: 18 })],
      }),
    ],
  })
}

function buildMetricsTable(accepted: { ref: any; num: number }[]): Table {
  const cols = [520, 3840, 720, 1000, 1080, 1200]
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell('#', cols[0]),
          headerCell('Title', cols[1]),
          headerCell('Year', cols[2]),
          headerCell('Citations', cols[3]),
          headerCell('Confidence', cols[4]),
          headerCell('Verification', cols[5]),
        ],
      }),
      ...accepted.map(({ ref, num }) =>
        new TableRow({
          children: [
            dataCell(`[${num}]`, cols[0]),
            dataCell(ref.title ?? '', cols[1]),
            dataCell(String(ref.year ?? '—'), cols[2]),
            dataCell((ref.citation_count ?? 0).toLocaleString(), cols[3]),
            dataCell(`${Math.round((ref.confidence_score ?? 0) * 100)}%`, cols[4]),
            dataCell(ref.verification_status ?? '', cols[5]),
          ],
        }),
      ),
    ],
  })
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function downloadAsWord(
  result: AnalyzeResponse,
  decisions: DecisionMap,
  citationStyle: CitationStyle,
  docTitle: string,
): Promise<void> {
  const rawAccepted = getAcceptedRefs(result.sentences, result.suggestions, decisions)
  const accepted = deduplicateRefs(rawAccepted)
  const { runs } = buildBodyRuns(result, decisions)

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Times New Roman', size: 24 } },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial', color: '123C69' },
          paragraph: { spacing: { before: 0, after: 120 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial', color: '1a4e82' },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: docTitle, bold: true, font: 'Arial', color: '123C69', size: 36 }),
            ],
            spacing: { before: 0, after: 80 },
          }),

          // Meta
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated by Referra AI · ${citationStyle} format · ${now}`,
                font: 'Arial',
                size: 18,
                color: '7A6058',
                italics: true,
              }),
            ],
            spacing: { before: 0, after: 200 },
          }),

          divider(),

          // Annotated text
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: 'Annotated Text', bold: true, font: 'Arial', color: '1a4e82', size: 26 }),
            ],
            spacing: { before: 160, after: 100 },
          }),

          new Paragraph({
            children: runs,
            spacing: { before: 0, after: 160 },
            alignment: AlignmentType.JUSTIFIED,
          }),

          ...(accepted.length > 0
            ? [
                divider(),
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  children: [
                    new TextRun({ text: 'References', bold: true, font: 'Arial', color: '1a4e82', size: 26 }),
                  ],
                  spacing: { before: 160, after: 100 },
                }),
                ...buildRefsParagraphs(accepted, citationStyle),

                divider(),
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  children: [
                    new TextRun({
                      text: 'Citation Confidence Metrics',
                      bold: true,
                      font: 'Arial',
                      color: '1a4e82',
                      size: 26,
                    }),
                  ],
                  spacing: { before: 160, after: 100 },
                }),
                buildMetricsTable(accepted),
              ]
            : []),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${docTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
