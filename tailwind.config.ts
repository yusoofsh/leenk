import typography from "@tailwindcss/typography";
import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  plugins: [typography],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", ...fontFamily.sans],
      },
    },
  },
} satisfies Config;
