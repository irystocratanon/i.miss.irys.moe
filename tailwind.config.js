/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/templates/*.html"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {},
  },
  plugins: [],
    blocklist: [
        "block",
        "border-collapse",
        "flex",
        "blur",
        "capitalize",
        "collapse",
        "contents",
        "filter",
        "fixed",
        "grid",
        "italic",
        "ordinal",
        "outline",
        "resize",
        "ring",
        "transition",
        "transform",
        "grow",
        "sticky",
        "shrink"
    ]
}
