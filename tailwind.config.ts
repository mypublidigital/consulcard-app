import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#1A3A8F",
          secondary: "#0F5C48",
        },
        surface: {
          DEFAULT: "#FAFAF8",
          raised: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E4E0D9",
        },
        text: {
          primary: "#1C1917",
          muted: "#6B6560",
          faint: "#A8A29E",
        },
        accent: {
          blue: "#1A3A8F",
          green: "#0F5C48",
          amber: "#92400E",
          red: "#9B1C1C",
        },
        sidebar: "#111827",
      },
      fontFamily: {
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04)",
      },
      borderColor: {
        DEFAULT: "#E4E0D9",
      },
    },
  },
  plugins: [],
} satisfies Config;
