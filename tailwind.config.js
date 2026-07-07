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
        border: "var(--border-color)",
        input: "var(--border-color)",
        ring: "var(--accent)",
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--bg-primary)",
        },
        secondary: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--bg-tertiary)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--text-primary)",
        },
        popover: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--cards)",
          foreground: "var(--text-primary)",
        },
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
          500: "#ea4f1e",
          600: "#c83f12",
          700: "#a52f0b"
        },
        cream: {
          100: "#fde8d8",
          200: "#fbd0b4"
        }
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(0, 0, 0, 0.12)"
      }
    }
  },
  plugins: []
};
