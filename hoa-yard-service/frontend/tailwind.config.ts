import type { Config } from "tailwindcss";

// Colors resolve to the CSS custom properties in src/tokens.css — components
// consume tokens only, never raw hex (see .claude/rules/website-quality.md).
// `hsl(var(--x) / <alpha-value>)` keeps Tailwind's opacity modifiers (e.g.
// bg-accent/50) working against a CSS-variable color.
function fromToken(variable: string) {
  return `hsl(var(${variable}) / <alpha-value>)`;
}

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)"]
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-body)",
        lg: "var(--text-lg)"
      },
      colors: {
        surface: {
          DEFAULT: fromToken("--bg-base"),
          raised: fromToken("--bg-elevated"),
          sunken: fromToken("--bg-sunken")
        },
        ink: {
          DEFAULT: fromToken("--text-primary"),
          muted: fromToken("--text-mute"),
          faint: fromToken("--text-faint")
        },
        accent: {
          DEFAULT: fromToken("--accent"),
          hover: fromToken("--accent-hover"),
          soft: fromToken("--accent-soft")
        },
        status: {
          planned: fromToken("--status-planned"),
          progress: fromToken("--status-progress"),
          review: {
            DEFAULT: fromToken("--status-review"),
            soft: fromToken("--status-review-soft")
          },
          done: {
            DEFAULT: fromToken("--status-done"),
            soft: fromToken("--status-done-soft")
          }
        },
        danger: fromToken("--danger")
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      maxWidth: {
        container: "var(--container)",
        // 15rem = 240px, 8pt-compliant — unifies what used to be two
        // slightly-different arbitrary panel widths (220px/240px)
        panel: "15rem"
      }
    }
  },
  plugins: []
} satisfies Config;
