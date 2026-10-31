import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Eerie serif for headings, kept optional so it degrades gracefully.
        spooky: ["'Creepster'", "'Cinzel Decorative'", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Haunting accent palette.
        ectoplasm: "#10b981",
        banshee: "#a855f7",
        blood: "#dc2626",
      },
      boxShadow: {
        glow: "0 0 25px rgba(16, 185, 129, 0.25)",
        "glow-purple": "0 0 25px rgba(168, 85, 247, 0.25)",
        "glow-blood": "0 0 30px rgba(220, 38, 38, 0.3)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "45%": { opacity: "0.85" },
          "50%": { opacity: "0.6" },
          "55%": { opacity: "0.9" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(16, 185, 129, 0.45)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        flicker: "flicker 3s linear infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
