module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/**/**/*.{js,ts,jsx,tsx}',
    './src/**/**/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#ff7e1a', // orange accent
        background: '#0a0a0a',
        accent: '#ffd700', // gold
        surface: '#1a0a0a',
      },
      backgroundImage: {
        'wood-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 100%)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
