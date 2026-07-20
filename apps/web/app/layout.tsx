import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "닥터네스트",
  description: "진료 후까지 이어지는 환자관리"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
