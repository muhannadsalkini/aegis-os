import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aegis OS color palette - dark, techy vibes
        aegis: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          accent: '#00d4aa',
          accentDim: '#00a080',
          text: '#e4e4e7',
          textDim: '#71717a',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

