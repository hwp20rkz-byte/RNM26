import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#FAFAF9",
          raised: "#FFFFFF",
          sunken: "#F1F0EE"
        },
        ink: {
          DEFAULT: "#18181B",
          muted: "#52525B",
          faint: "#A1A1AA"
        },
        accent: {
          DEFAULT: "#C96442",
          soft: "#F3E4DD"
        },
        status: {
          planned: "#94A3B8",
          progress: "#C96442",
          review: "#D9A441",
          done: "#3F7A5C"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      }
    }
  },
  plugins: []
} satisfies Config;
