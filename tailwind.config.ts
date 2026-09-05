import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0A0A0B",
          900: "#111113",
          800: "#191A1D",
          700: "#232427",
          600: "#33353A",
          400: "#8A8D93",
          200: "#D4D5D8",
        },
        accent: {
          DEFAULT: "#9BB84A",
          dim: "#7B9639",
          fg: "#0A0A0B",
        },
      },
      fontFamily: {
        sans: ["General Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        "word-in": {
          from: { opacity: "0", transform: "translateY(0.4em)", filter: "blur(4px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "price-pop": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.92)" },
        },
      },
      animation: {
        "word-in": "word-in 0.7s cubic-bezier(0.2,0.7,0.2,1) forwards",
        "price-pop": "price-pop 1.8s ease-in-out infinite",
        pulse2: "pulse2 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
