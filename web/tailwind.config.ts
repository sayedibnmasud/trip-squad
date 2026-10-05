import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// shadcn/ui-style theme: every colour reads the CSS variables in
// src/app/styles.css, so components and hand-written CSS share one palette.
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: token("border"),
        input: token("border"),
        ring: token("primary"),
        background: token("background"),
        foreground: token("foreground"),
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        card: { DEFAULT: token("card"), foreground: token("foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("foreground") },
        coral: token("coral"),
        sky: token("sky"),
        lilac: token("lilac")
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-body)"] }
    }
  },
  plugins: [animate]
} satisfies Config;
