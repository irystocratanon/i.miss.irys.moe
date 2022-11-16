/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./public/templates/*.html"],
  theme: {
    extend: {},
  },
  plugins: [],
    blocklist: [
        "absolute",
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
        "shadow",
        "transition",
        "transform",
        "grow",
        "sticky",
        "shrink"
    ]
}
