import {
  ArrowRight,
  CalendarCheck2,
  Check,
  MessageCircleMore,
  Sparkles,
  Stethoscope
} from "lucide-react";

import { Button } from "@doctornest/ui/button";

const careSteps = [
  { label: "시술 후 안내", time: "오늘", complete: true },
  { label: "경과 확인", time: "D+3", complete: true },
  { label: "맞춤 케어", time: "D+14", complete: false }
];

const patientUpdates = [
  { name: "김서윤", message: "경과 체크를 완료했어요", tone: "bg-blue-500" },
  { name: "이도현", message: "재진 일정을 예약했어요", tone: "bg-indigo" },
  { name: "박하린", message: "케어 메시지에 답변했어요", tone: "bg-pink" }
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 sm:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(circle_at_18%_26%,rgba(78,130,255,0.15),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(235,120,198,0.12),transparent_25%),linear-gradient(180deg,#ffffff_0%,#f8f9ff_72%,transparent_100%)]" />

      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2.5 text-lg font-semibold tracking-[-0.03em]">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo to-pink text-white shadow-[0_8px_24px_rgba(74,91,226,0.24)]">
            <Stethoscope className="size-[18px]" aria-hidden="true" />
          </span>
          닥터네스트
        </div>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a className="transition-colors hover:text-foreground" href="#product">제품 소개</a>
          <a className="transition-colors hover:text-foreground" href="#care">환자관리</a>
          <a className="transition-colors hover:text-foreground" href="#contact">도입 문의</a>
        </div>
        <Button className="shadow-[0_8px_24px_rgba(49,87,246,0.2)]">도입 문의</Button>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-16 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:py-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3.5 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur">
            <Sparkles className="size-4 text-pink" aria-hidden="true" />
            병원을 위한 AI 환자관리
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.1] tracking-[-0.055em] sm:text-6xl xl:text-[4rem]">
            진료 후의 안심까지,
            <span className="block bg-gradient-to-r from-primary via-indigo to-pink bg-clip-text text-transparent">먼저 챙기는 병원.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            환자별 치료 여정에 맞춰 안내하고, 경과를 확인하고,
            필요한 순간 의료진에게 연결하는 사후관리 자동화 솔루션입니다.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 bg-gradient-to-r from-primary to-indigo px-6 shadow-[0_12px_30px_rgba(67,82,224,0.24)] hover:opacity-90">
              도입 상담 신청
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 border-indigo/15 bg-white/80 px-6 text-foreground shadow-sm">
              서비스 알아보기
            </Button>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {['반복 업무 자동화', '병원별 맞춤 시나리오', '환자 응답 한곳에서'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-blue-300/25 via-indigo/15 to-pink/20 blur-3xl" />
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_36px_100px_rgba(54,67,143,0.16)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-sm font-semibold">오늘의 환자관리</p>
                <p className="mt-1 text-xs text-muted-foreground">놓치지 않아야 할 케어를 모았어요</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                AI 실행 중
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-[1.12fr_0.88fr]">
              <section className="rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MessageCircleMore className="size-4 text-primary" aria-hidden="true" />
                    새 환자 응답
                  </div>
                  <span className="rounded-full bg-pink/10 px-2 py-1 text-[11px] font-semibold text-pink">3 NEW</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {patientUpdates.map((patient) => (
                    <div key={patient.name} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${patient.tone} text-xs font-semibold text-white`}>
                        {patient.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{patient.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{patient.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-gradient-to-b from-[#f5f6ff] to-[#fff7fc] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarCheck2 className="size-4 text-indigo" aria-hidden="true" />
                  케어 여정
                </div>
                <div className="mt-5 space-y-1">
                  {careSteps.map((step, index) => (
                    <div key={step.label} className="grid grid-cols-[24px_1fr_auto] items-center gap-2">
                      <div className="flex flex-col items-center self-stretch">
                        <span className={`mt-0.5 flex size-5 items-center justify-center rounded-full ${step.complete ? 'bg-indigo text-white' : 'border-2 border-pink bg-white text-pink'}`}>
                          {step.complete ? <Check className="size-3" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-pink" />}
                        </span>
                        {index < careSteps.length - 1 ? <span className="my-1 w-px flex-1 bg-indigo/15" /> : null}
                      </div>
                      <span className="py-2.5 text-xs font-medium">{step.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{step.time}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mx-5 mb-5 flex items-center justify-between rounded-2xl bg-[#171b31] px-5 py-4 text-white">
              <div>
                <p className="text-sm font-semibold">오늘 28명의 환자를 자동으로 관리했어요</p>
                <p className="mt-1 text-xs text-white/55">의료진 확인이 필요한 응답만 알려드릴게요</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-pink">
                <Sparkles className="size-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
