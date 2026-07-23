import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "닥터네스트 | 병원의 유입부터 재방문까지",
  description:
    "병원과 꼭 맞는 인플루언서 체험단 매칭부터 신규 환자 유입, 상담, 사후관리와 재방문까지 함께하는 병원 성장 솔루션"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
