import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 引入优雅的无衬线字体
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Learning Diary",
  description: "Personal productivity dashboard powered by GitHub Actions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
