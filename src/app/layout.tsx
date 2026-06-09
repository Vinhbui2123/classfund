import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ClassFund - Hệ Thống Quản Lý Quỹ Lớp",
  description: "Trang theo dõi công nợ, đóng quỹ lớp và ghi nhận các khoản thu chi công khai, minh bạch của lớp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
