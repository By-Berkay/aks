import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
        },
        sidebar: "#0f172a",
        "sidebar-hover": "#1e293b",
      },
      fontFamily: { sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
