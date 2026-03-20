import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0b0f",
          card: "#12141d",
          hover: "#1a1c2a",
        },
        border: {
          DEFAULT: "#1e2130",
        },
        accent: {
          green: "#00ff88",
          red: "#ff3366",
          blue: "#3b82f6",
          amber: "#f59e0b",
          orange: "#f97316",
        },
        text: {
          primary: "#ffffff",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-in-right": "slideInRight 0.5s ease-out",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0, 255, 136, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 255, 136, 0.4)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
