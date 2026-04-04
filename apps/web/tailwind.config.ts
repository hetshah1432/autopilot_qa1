import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0b12",
        foreground: "#f4f4fb",
        surface: "#12121e",
        sidebar: "#0e0e18",
        border: "#2a2a3d",
        muted: "#8b8ba3",
        primary: {
          DEFAULT: "#8b7cff",
          foreground: "#ffffff",
        },
        success: "#34d399",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#22d3ee",
        card: "#14141f",
        "card-foreground": "#f4f4fb",
        popover: "#14141f",
        "popover-foreground": "#f4f4fb",
        secondary: {
          DEFAULT: "#1e1e2c",
          foreground: "#f4f4fb",
        },
        accent: {
          DEFAULT: "#22d3ee",
          foreground: "#061016",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        input: "#1a1a28",
        ring: "#8b7cff",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.125rem",
        "3xl": "1.375rem",
      },
      boxShadow: {
        glow: "0 0 32px -6px rgba(139, 124, 255, 0.45), 0 0 0 1px rgba(139, 124, 255, 0.12)",
        "glow-sm": "0 0 24px -8px rgba(139, 124, 255, 0.35)",
        "glow-cyan": "0 0 28px -6px rgba(34, 211, 238, 0.3)",
        elevated:
          "0 16px 48px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
        soft: "0 8px 32px -8px rgba(0, 0, 0, 0.45)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      backgroundImage: {
        "gradient-neo":
          "linear-gradient(135deg, rgba(139,124,255,0.15) 0%, rgba(34,211,238,0.08) 50%, rgba(168,85,247,0.1) 100%)",
        "gradient-radial-hero":
          "radial-gradient(ellipse 100% 80% at 50% -30%, rgba(139,124,255,0.35), transparent 55%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
