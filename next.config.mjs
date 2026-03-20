/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', 
  images: {
    unoptimized: true,
  },
  // 告诉 Next.js，GitHub 仓库名作为基础路径
  basePath: '/Learning-Diary', 
};
export default nextConfig;
