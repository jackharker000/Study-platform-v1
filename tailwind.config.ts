import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0e14',
        'bg-card': '#111620',
        'bg-card-hover': '#161d2a',
        'bg-input': '#0d1018',
        border: '#1c2333',
        'border-focus': '#3b82f6',
        text: '#c8cdd5',
        'text-dim': '#6b7280',
        'text-bright': '#e8ecf1',
      },
      fontFamily: {
        display: ['Palatino Linotype', 'Book Antiqua', 'Palatino', 'Georgia', 'serif'],
        body: ['Segoe UI', 'SF Pro Text', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
}

export default config
