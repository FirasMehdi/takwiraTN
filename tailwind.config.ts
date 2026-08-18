import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B7A43",
          dark: "#125C31",
          light: "#2E9C5C",
        },
        anthracite: "#22262B",
        accent: "#F5B301",
      },
    },
  },
  plugins: [],
} satisfies Config;
