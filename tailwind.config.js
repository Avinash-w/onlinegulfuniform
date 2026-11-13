/** @type {import('tailwindcss').Config} */

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH — EvaraNest visual theme
// Forest green chrome + bright lime accents + Anton display type
// ---------------------------------------------------------------------------
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', lg: '2.5rem' },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        ink: '#121124',
        graphite: '#28263D',
        muted: '#4F4C68',
        line: '#E8E5DF',
        chalk: '#F5F3EE',
        cream: '#FAF7F2',
        brand: '#4849E8',        // Exact Logo Blue
        brandDark: '#3839D6',    // Deep Royal Blue
        brandLight: '#EEEDFC',   // Soft periwinkle tint
        forest: '#4849E8',       // Replaced dark green everywhere with Logo Blue
        lime: '#D2E94A',         // Soft chartreuse accent from packaging (Image 2)
        gold: '#D2E94A',
        sand: '#E8E5DF',
        clay: '#73708A',
        berry: '#4849E8',
        sale: '#E02438',
        save: '#0F944E',
        offer: '#4849E8',
        star: '#F5A623',
      },
      fontFamily: {
        display: ['"Anton"', '"Archivo Black"', 'Impact', 'sans-serif'],
        sans: ['"Poppins"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { wider2: '.14em' },
      boxShadow: {
        card: '0 1px 3px rgba(16,16,16,.08)',
        drawer: '-8px 0 40px rgba(16,16,16,.15)',
        pop: '0 8px 30px rgba(16,16,16,.14)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-rtl': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee 22s linear infinite',
        'marquee-slow': 'marquee 40s linear infinite',
        'marquee-rtl': 'marquee-rtl 30s linear infinite',
        fadeIn: 'fadeIn .3s ease-out both',
        slideUp: 'slideUp .35s ease-out both',
      },
    },
  },
  plugins: [],
}
