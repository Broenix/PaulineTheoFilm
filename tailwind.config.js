// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: '0', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-4px)' }
        },
        fadeIn: {
      '0%': { opacity: 0, transform: 'translateY(4px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 1.8s ease-out',
        sparkle: 'sparkle 1s ease-in-out infinite',
      },
      boxShadow: {
        aura: '0 0 15px 3px rgba(0, 0, 0, 0.7)',
      }
    },
  },
  plugins: [],
};
