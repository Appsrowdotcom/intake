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
        red: { DEFAULT: '#C12029', dark: '#97171F' },
        ink: '#020202',
        canvas: '#F7F7F6',
        surface: '#FFFFFF',
        'surface-muted': '#F1F1EF',
        line: { DEFAULT: '#D9D9D6', strong: '#BFBFBA' },
        muted: { DEFAULT: '#666661', 2: '#92928C' },
        primary: '#C12029',
        paper: '#F7F7F6',
      },
      fontFamily: {
        sans: ['Geist', 'Arial', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      spacing: {
        s0: '4px',
        s1: '8px',
        s2: '16px',
        s3: '24px',
        s4: '32px',
        s5: '48px',
        s6: '64px',
        s7: '96px',
      },
    },
  },
  plugins: [],
}
export default config
