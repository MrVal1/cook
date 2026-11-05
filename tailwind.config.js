/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff8f1',
          100: '#feede0',
          200: '#fed7be',
          300: '#fdb893',
          400: '#fa8e62',
          500: '#f56534',
          600: '#e6471e',
          700: '#bf3416',
          800: '#982b18',
          900: '#7c2617',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e5ebe5',
          200: '#ced9ce',
          300: '#a7bda7',
          400: '#7c9a7d',
          500: '#5c7d5d',
          600: '#466447',
          700: '#385039',
          800: '#2e412f',
          900: '#273628',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'serif'],
      }
    },
  },
  plugins: [],
};
