/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      colors: {
        // Dashboard primary (dark navy)
        primary: "#2C3E50",
        // Marketing site accent (blue)
        accent: "#3B9EFF",
        "accent-light": "#EBF5FF",
        // Text
        "text-body": "#374151",
        "text-muted": "#6B7280",
        "text-light": "#9CA3AF",
        // Backgrounds
        background: "#FFFFFF",
        "bg-alt": "#F7F8FA",
        "bg-features": "#EEF2F7",
        // Borders
        "border-light": "#E5E7EB",
        // Misc site tokens
        star: "#F59E0B",
        "badge-bg": "#FEF9C3",
        "badge-border": "#FDE68A",
        "badge-text": "#78350F",
        "fix-red": "#E57373",
        "fix-red-bg": "#FFF5F5",
        "fix-red-badge": "#FDECEA",
        "fix-green": "#2D9D78",
        "fix-green-bg": "#F0FBF8",
        teal: "#00C9A7",
        // IELTS band chart colors (dashboard)
        overall: "#E74C3C",
        response: "#F39C12",
        coherence: "#1ABC9C",
        vocabulary: "#9B59B6",
        grammar: "#3498DB",
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.08)',
        'card-sm': '0 2px 12px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
