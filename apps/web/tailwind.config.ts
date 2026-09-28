import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        card: {
          DEFAULT: '#121215',
          foreground: '#fafafa',
        },
        primary: {
          DEFAULT: '#f59e0b', // Amber/Sun
          hover: '#d97706',
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#18181b',
          foreground: '#fafafa',
        },
        border: '#27272a',
        input: '#27272a',
        ring: '#f59e0b',
      },
    },
  },
  plugins: [],
};

export default config;
