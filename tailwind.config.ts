import type { Config } from "tailwindcss";

/**
 * Identidade visual — Manual de Uso de Marca Consulcard v1c (ago/2024).
 *
 * Cores institucionais:  Verde  rgb(141,198,63)  ·  Azul rgb(53,68,84)
 * Cores de apoio:        Cinza claro rgb(209,211,212) · Cinza escuro rgb(87,87,86)
 * Tipografia:            Roboto (institucional)
 *
 * O verde institucional é claro demais para texto sobre branco (contraste
 * ~1,9:1), então ele é usado em preenchimentos e destaques, e há uma variação
 * escurecida (green-ink) para texto e ícones — derivada, não substitui a cor
 * institucional nas peças de marca.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#354454",   // Azul Consulcard
          green: "#8DC63F",     // Verde Consulcard
          "green-ink": "#5E8E2B", // derivada, para texto/ícone sobre branco
          secondary: "#8DC63F",
        },
        surface: {
          DEFAULT: "#F5F6F7",
          raised: "#FFFFFF",
        },
        border: {
          DEFAULT: "#D1D3D4",   // Cinza Consulcard Claro
        },
        text: {
          primary: "#354454",   // Azul Consulcard
          muted: "#575756",     // Cinza Consulcard Escuro
          faint: "#9A9A99",     // derivada do cinza escuro
        },
        accent: {
          blue: "#354454",
          green: "#5E8E2B",
          amber: "#92400E",
          red: "#9B1C1C",
        },
        sidebar: "#354454",     // Azul Consulcard
      },
      fontFamily: {
        sans: ["Roboto", "Arial", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(53, 68, 84, 0.06)",
      },
      borderColor: {
        DEFAULT: "#D1D3D4",
      },
    },
  },
  plugins: [],
} satisfies Config;
