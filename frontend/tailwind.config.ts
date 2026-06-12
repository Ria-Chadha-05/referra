import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:         'var(--navy)',
        indigo:       'var(--indigo)',
        teal:         'var(--teal)',
        'text-mid':   'var(--text-mid)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
      },
      fontFamily: {
        display: ['var(--ff-display)', 'Georgia', 'serif'],
        ui:      ['var(--ff-ui)', 'system-ui', 'sans-serif'],
        mono:    ['var(--ff-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        '3xs': ['0.55rem',  { lineHeight: '0.85rem' }],
      },
    },
  },
  plugins: [],
}

export default config
