/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // These map to the variables in your CSS
        'bg-start': 'var(--bg-start)',
        'bg-end': 'var(--bg-end)',
        'glass': 'var(--glass)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'accent': 'var(--accent)',
      },
      keyframes: {
        rollIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        rollIn: 'rollIn 1s ease-in-out',
        fadeIn: 'fadeIn 0.5s ease-in',
      },
    },
  },
  plugins: [],
}



