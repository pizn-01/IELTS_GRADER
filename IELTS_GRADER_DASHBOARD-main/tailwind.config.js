/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2C3E50",
        background: "#FFFFFF",
        overall: "#E74C3C",
        response: "#F39C12",
        coherence: "#1ABC9C",
        vocabulary: "#9B59B6",
        grammar: "#3498DB",
      },
      fontFamily: {
        sans: ["Nunito", "sans-serif"],
      },
    },
  },
  plugins: [],
}

