/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyberpunk color system
        bg: {
          primary: '#000000',      // Pure black main background
          secondary: '#0A0A0A',    // Cards, modals
          tertiary: '#141414',     // Hover states
        },
        text: {
          primary: '#FFFFFF',      // Main content
          secondary: '#B0B0B0',    // Secondary info
          muted: '#666666',        // Disabled/hints
        },
        cyber: {
          cyan: '#00FFFF',         // Primary actions, AI responses
          'cyan-dim': 'rgba(0, 255, 255, 0.15)',
          magenta: '#FF00FF',      // Warnings, deletions
          'magenta-dim': 'rgba(255, 0, 255, 0.15)',
          green: '#39FF14',        // Success, part identified
          'green-dim': 'rgba(57, 255, 20, 0.15)',
          orange: '#FF6600',       // Errors, warnings
          'orange-dim': 'rgba(255, 102, 0, 0.15)',
        },
        // Legacy garage colors for gradual migration
        garage: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        electric: {
          400: '#00FFFF',  // Map to cyber cyan
          500: '#00FFFF',
          600: '#00FFFF',
        }
      },
      fontFamily: {
        main: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', '"Cascadia Code"', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],     // 12px - labels, metadata
        sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px - secondary text
        base: ['1rem', { lineHeight: '1.5rem' }],    // 16px - body text
        lg: ['1.25rem', { lineHeight: '1.75rem' }],  // 20px - section headers
        xl: ['1.75rem', { lineHeight: '2.25rem' }],  // 28px - page titles
        '2xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px - hero text
      },
      animation: {
        'scan': 'scan 2s linear infinite',
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200%)' },
        },
        'pulse-cyan': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
            borderColor: 'rgba(0, 255, 255, 0.5)'
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.6)',
            borderColor: 'rgba(0, 255, 255, 1)'
          },
        },
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 255, 255, 0.4)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(0, 255, 255, 0.3)',
        'cyber-lg': '0 0 40px rgba(0, 255, 255, 0.4)',
        'magenta': '0 0 20px rgba(255, 0, 255, 0.3)',
        'green': '0 0 20px rgba(57, 255, 20, 0.3)',
        'orange': '0 0 20px rgba(255, 102, 0, 0.3)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
};