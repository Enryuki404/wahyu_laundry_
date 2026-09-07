import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        wl: {
          primary: "#2563EB",
          "primary-dark": "#1E3A8A",
          "slate-800": "#1E293B",
          "slate-400": "#94A3B8",
          "slate-200": "#E2E8F0",
        },
        "wl-primary": "var(--wl-primary)",
      },
    },
  },
  plugins: [],
};
export default config;
