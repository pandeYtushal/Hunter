/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./popup.html", "./sidebar.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "sans-serif"],
        display: ["Syne", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        serif: ["Instrument Serif", "serif"]
      },
      colors: {
        ink: {
          50: "#fafaf9",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b"
        },
        amber: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea6c0a",
          700: "#c2530a"
        },
        cream: {
          100: "#fde8d8",
          200: "#fbd0b4"
        }
      },
      boxShadow: {
        panel: "0 18px 48px rgba(0, 0, 0, 0.12)"
      }
    }
  },
  plugins: []
};
