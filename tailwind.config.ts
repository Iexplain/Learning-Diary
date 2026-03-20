import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 如果后续你想把 #8A9A8B 提取为全局主题色，可以加在这里
      // colors: { sage: "#8A9A8B" }
    },
  },
  plugins: [],
};
export default config;
