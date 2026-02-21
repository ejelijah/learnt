/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  future:{
hoverOnlyWhenSupported: true,
  },
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
        'logo': 'var(--logo)',
        'title-color': 'var(--title-color)',
        'card-bg':'var(--card-bg)',
        'border-color':'var(--border-color)',
        'main-button': 'var(--main-button)',
        'main-button-text':'var(--main-button-text)'

      },
      keyframes: {
        rollIn: {
          '0%': { transform: 'translateX(-50%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        rollIn: 'rollIn 1s ease-in-out',
        fadeIn: 'fadeIn 1s ease-in',
      },
    },
  },
  plugins: [],
}



