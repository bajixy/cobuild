import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F6F6F6",
          100: "#E7E7E7",
          400: "#737373",
          600: "#111111",
          800: "#000000",
          900: "#000000",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
