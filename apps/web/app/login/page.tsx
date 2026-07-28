import { MessageCircleMore, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const { returnTo: requestedReturnTo } = await searchParams;
  const returnTo = requestedReturnTo?.startsWith("/service")
    ? requestedReturnTo
    : "/service/chatting";

  if (user) {
    redirect(returnTo);
  }

  return (
    <main className="grid min-h-svh bg-[#f4f6fb] lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-[#171c35] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-[#7057ee]/25 blur-3xl" />
        <div className="absolute -bottom-28 left-14 size-80 rounded-full bg-[#eb78c6]/20 blur-3xl" />

        <div className="relative">
          <Image
            src="/images/doctornest-logo-dark.png"
            alt="닥터네스트"
            width={1490}
            height={400}
            className="h-11 w-auto"
            priority
          />
        </div>

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/70">
            <MessageCircleMore className="size-3.5 text-[#9fb0ff]" />
            병원 통합 고객상담
          </span>
          <h1 className="mt-6 text-[52px] font-bold leading-[1.12] tracking-[-0.055em]">
            모든 채널의 고객을
            <br />
            한곳에서 놓치지 않게.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
            카카오부터 LINE, 네이버 톡톡, WeChat, WhatsApp, Instagram까지
            병원으로 들어오는 상담과 고객 정보를 하나의 화면에서 관리하세요.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/45">
          <ShieldCheck className="size-4" />
          병원별로 분리된 안전한 상담 공간
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[410px]">
          <div className="mb-10 lg:hidden">
            <Image
              src="/images/doctornest-logo-header-opaque.png"
              alt="닥터네스트"
              width={1490}
              height={400}
              className="h-10 w-auto"
              priority
            />
          </div>
          <p className="text-xs font-bold tracking-[0.12em] text-[#3157f6]">
            WELCOME BACK
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-[#20243a]">
            병원 관리자로 로그인
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#7a8195]">
            고객 상담과 채널 설정을 이어서 관리하세요.
          </p>
          <LoginForm returnTo={returnTo} />
        </div>
      </section>
    </main>
  );
}
