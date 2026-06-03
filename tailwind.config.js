/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      xs:  '375px',
      sm:  '640px',
      md:  '768px',
      lg:  '1024px',
      xl:  '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          bg:        '#F4F6F4',
          card:      '#FFFFFF',
          border:    '#E5E7E5',
          green:     '#8CC63F',
          greenDark: '#6B9B2F',
          red:       '#EF4444',
          yellow:    '#EAB308',
          gold:      '#F59E0B',
          text:      '#1A1A1A',
          heading:   '#4A4A4A',
          muted:     '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up':   'fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-row': 'slideInRow 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer':      'shimmer 2.8s linear infinite',
        'pulse-dot':    'pulseDot 1.8s ease-in-out infinite',
        'spin-slow':    'spin 2s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRow: {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-300% center' },
          '100%': { backgroundPosition: '300% center' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':      { opacity: '0.2', transform: 'scale(0.65)' },
        },
      },
    },
  },
  plugins: [],
}
