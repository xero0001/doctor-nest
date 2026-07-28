import Image from "next/image";
import Link from "next/link";

type DocumentShellProps = {
  title: string;
  description: string;
  effectiveDate: string;
  children: React.ReactNode;
};

export function DocumentShell({
  title,
  description,
  effectiveDate,
  children,
}: DocumentShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#20243a]">
      <header className="border-b border-[#e7eaf2] bg-white">
        <div className="mx-auto flex h-[68px] w-[min(100%-40px,960px)] items-center justify-between">
          <Link href="/" aria-label="닥터네스트 홈">
            <Image
              src="/images/doctornest-logo-header-opaque.png"
              alt="닥터네스트"
              width={1490}
              height={400}
              className="h-8 w-auto sm:h-9"
              priority
            />
          </Link>
          <nav
            aria-label="법적 문서"
            className="flex items-center gap-4 text-xs font-medium text-[#737b91] sm:gap-6 sm:text-sm"
          >
            <Link href="/docs/privacy-policy" className="transition-colors hover:text-[#3157f6]">
              개인정보처리방침
            </Link>
            <Link href="/docs/terms-of-service" className="transition-colors hover:text-[#3157f6]">
              이용약관
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-[min(100%-40px,800px)] py-12 sm:py-20">
        <div className="mb-10 border-b border-[#e2e6ef] pb-9 sm:mb-14 sm:pb-12">
          <p className="mb-4 text-xs font-bold tracking-[0.14em] text-[#3157f6]">
            DOCTORNEST LEGAL
          </p>
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.045em] text-[#171b2e] sm:text-[44px]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#687087] sm:text-base">
            {description}
          </p>
          <p className="mt-5 text-sm text-[#8a91a3]">시행일: {effectiveDate}</p>
        </div>

        <article className="space-y-11 text-[15px] leading-[1.85] text-[#4d556b] sm:text-base">
          {children}
        </article>
      </main>

      <footer className="border-t border-[#e7eaf2] bg-white">
        <div className="mx-auto flex w-[min(100%-40px,960px)] flex-col gap-3 py-7 text-xs text-[#7b8397] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DoctorNest. All rights reserved.</p>
          <p>주식회사 알오아이글로벌 · 사업자등록번호 163-81-02782</p>
        </div>
      </footer>
    </div>
  );
}

type DocumentSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function DocumentSection({ title, children }: DocumentSectionProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold tracking-[-0.025em] text-[#24293b] sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-3 [&_a]:font-medium [&_a]:text-[#3157f6] [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_strong]:font-semibold [&_strong]:text-[#30364a] [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
