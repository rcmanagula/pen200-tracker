/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans:  ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono:  ["var(--font-mono)"],
      },
      colors: {
        canvas:       "var(--bg-canvas)",
        surface:      "var(--bg-surface)",
        "surface-2":  "var(--bg-surface-2)",
        overlay:      "var(--bg-overlay)",
        "fg-default": "var(--fg-default)",
        "fg-muted":   "var(--fg-muted)",
        "fg-subtle":  "var(--fg-subtle)",
        "on-accent":  "var(--fg-on-accent)",
        accent: {
          DEFAULT: "var(--accent)",
          hover:   "var(--accent-hover)",
          soft:    "var(--accent-soft)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger:  "var(--danger)",
      },
      borderColor: {
        DEFAULT: "var(--border-default)",
        default: "var(--border-default)",
        strong:  "var(--border-strong)",
        focus:   "var(--border-focus)",
      },
      ringColor: {
        focus: "var(--border-focus)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        pop:  "var(--shadow-pop)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      fontSize: {
        display: ["var(--text-display)", { lineHeight: "1.05", letterSpacing: "-0.01em" }],
        h1:      ["var(--text-h1)",      { lineHeight: "1.2" }],
        h2:      ["var(--text-h2)",      { lineHeight: "1.3" }],
        h3:      ["var(--text-h3)",      { lineHeight: "1.4" }],
        body:    ["var(--text-body)",    { lineHeight: "1.55" }],
        small:   ["var(--text-small)",   { lineHeight: "1.5" }],
        tiny:    ["var(--text-tiny)",    { lineHeight: "1.4" }],
      },
      spacing: {
        sidebar: "var(--sidebar-w)",
      },
      maxWidth: {
        content: "880px",
      },
    },
  },
};
