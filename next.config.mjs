/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 关键：生成纯静态 HTML/CSS/JS
  images: {
    unoptimized: true,
  },
};
export default nextConfig;
