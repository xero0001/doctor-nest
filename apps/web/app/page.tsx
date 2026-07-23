import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronRight,
  CircleCheck,
  Handshake,
  Heart,
  Instagram,
  MessageCircleMore,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  Users,
  WandSparkles
} from "lucide-react";

const funnelSteps = [
  {
    number: "01",
    label: "신규 도달",
    title: "우리 병원과 결이 맞는 체험단",
    description:
      "진료과, 지역, 타깃 고객, 콘텐츠 톤을 함께 보고 병원에 어울리는 인플루언서만 선별합니다.",
    icon: Target
  },
  {
    number: "02",
    label: "관심 전환",
    title: "광고보다 자연스러운 경험 콘텐츠",
    description:
      "과장된 홍보가 아닌 실제 방문 여정이 담긴 콘텐츠로 신뢰와 검색 접점을 함께 만듭니다.",
    icon: Instagram
  },
  {
    number: "03",
    label: "상담·내원",
    title: "놓치지 않는 상담 연결",
    description:
      "콘텐츠에서 발생한 문의가 예약과 내원으로 이어지도록 흐름을 한곳에서 관리합니다.",
    icon: MessageCircleMore
  },
  {
    number: "04",
    label: "재방문",
    title: "내원 이후까지 이어지는 케어",
    description:
      "치료 주기와 환자 상태에 맞춘 사후관리로 한 번의 방문을 오래 가는 관계로 전환합니다.",
    icon: RefreshCw
  }
];

const matchingProfiles = [
  {
    name: "뷰티 기록형",
    handle: "@daily.soo",
    followers: "1.8만",
    reach: "12.4만",
    fit: "96%",
    gradient: "from-[#f8d8e8] to-[#e9e4ff]",
    initials: "수"
  },
  {
    name: "직장인 라이프",
    handle: "@mood.jin",
    followers: "3.1만",
    reach: "18.7만",
    fit: "93%",
    gradient: "from-[#dce8ff] to-[#d9f4ff]",
    initials: "진"
  },
  {
    name: "로컬 큐레이션",
    handle: "@seoul.zip",
    followers: "9.6천",
    reach: "8.2만",
    fit: "91%",
    gradient: "from-[#e3ddff] to-[#ffe4f3]",
    initials: "집"
  }
];

const serviceItems = [
  "캠페인 기획과 모집 공고",
  "인플루언서 탐색·검수·섭외",
  "예약 및 방문 일정 조율",
  "콘텐츠 가이드와 일정 관리",
  "게시물 검수 및 성과 리포트",
  "내원 환자 사후관리 자동화"
];

const faqs = [
  {
    question: "팔로워가 많은 인플루언서만 매칭하나요?",
    answer:
      "아니요. 팔로워 수보다 진료과와 지역, 실제 반응률, 콘텐츠 결, 잠재 환자와의 일치도를 우선합니다. 작아도 전환 가능성이 높은 계정을 선별합니다."
  },
  {
    question: "병원에서 직접 체험단을 관리해야 하나요?",
    answer:
      "모집부터 일정 조율, 가이드 전달, 게시 확인, 성과 정리까지 닥터네스트가 운영합니다. 병원은 진료와 좋은 경험 제공에 집중하면 됩니다."
  },
  {
    question: "기존 환자 관리도 함께 가능한가요?",
    answer:
      "가능합니다. 신규 고객을 데려오는 체험단 퍼널과 내원 이후 상담·사후관리·재방문 흐름을 하나의 운영 체계로 연결합니다."
  }
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Stethoscope className="size-[18px]" />
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-background">
      <header className="site-header">
        <nav className="page-shell flex h-[72px] items-center justify-between" aria-label="주요 메뉴">
          <a href="#top" className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.04em]">
            <BrandMark />
            닥터네스트
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a className="nav-link" href="#funnel">
              성장 퍼널
            </a>
            <a className="nav-link" href="#matching">
              인플루언서 매칭
            </a>
            <a className="nav-link" href="#operation">
              운영 방식
            </a>
            <a className="nav-link" href="#faq">
              자주 묻는 질문
            </a>
          </div>
          <a className="button button-primary button-sm" href="/service/chatting">
            무료 상담
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </nav>
      </header>

      <section id="top" className="hero-section">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="page-shell relative grid min-h-[780px] items-center gap-14 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div className="relative z-10">
            <div className="eyebrow">
              <Sparkles className="size-4 text-pink" aria-hidden="true" />
              병원의 유입부터 재방문까지, 하나의 성장팀
            </div>
            <h1 className="hero-title">
              환자가 오기 전부터,
              <span>다시 찾을 때까지.</span>
            </h1>
            <p className="hero-copy">
              병원과 가장 잘 맞는 인플루언서를 찾아 신규 고객을 만들고,
              <br className="hidden sm:block" /> 내원한 고객은 놓치지 않도록 관리합니다.
              <strong> 닥터네스트가 처음부터 끝까지 알아서.</strong>
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a className="button button-primary button-lg" href="/service/chatting">
                우리 병원 성장 진단받기
                <ArrowRight className="size-5" aria-hidden="true" />
              </a>
              <a className="button button-ghost button-lg" href="#funnel">
                서비스 한눈에 보기
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
              {["합리적인 운영비", "전담 매니저 운영", "진료과 맞춤 매칭"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CircleCheck className="size-4 text-primary" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-wrap">
              <Image
                src="/images/doctornest-influencer-growth.png"
                alt="병원에 방문한 인플루언서들과 상담을 준비하는 코디네이터"
                width={1536}
                height={1024}
                className="h-full w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/25 via-transparent to-primary/5" />
            </div>

            <div className="floating-card match-card">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <WandSparkles className="size-4 text-indigo" aria-hidden="true" />
                  오늘의 추천 매칭
                </span>
                <span className="status-pill">분석 완료</span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#f7cfe3] to-[#d9d6ff] font-bold text-indigo">
                  민
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">직장인 뷰티 크리에이터</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">강남 · 25–34세 반응 우수</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">96%</p>
                  <p className="text-[10px] text-muted-foreground">브랜드 핏</p>
                </div>
              </div>
            </div>

            <div className="floating-card funnel-card">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">이번 달 환자 퍼널</span>
                <BarChart3 className="size-4 text-primary" aria-hidden="true" />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1 text-center">
                {[
                  ["콘텐츠", "24"],
                  ["문의", "83"],
                  ["내원", "31"],
                  ["재예약", "19"]
                ].map(([label, value], index) => (
                  <div key={label} className="relative">
                    <div className="mx-auto flex size-9 items-center justify-center rounded-xl bg-primary/[0.07] text-sm font-bold text-primary">
                      {value}
                    </div>
                    <p className="mt-1.5 text-[9px] text-muted-foreground">{label}</p>
                    {index < 3 ? (
                      <ChevronRight className="absolute -right-2 top-3 size-3 text-indigo/30" aria-hidden="true" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-white">
        <div className="page-shell py-8">
          <p className="text-center text-sm font-medium text-muted-foreground">
            피부과 · 성형외과 · 치과 · 한의원 · 안과 · 검진센터까지
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-x-10 gap-y-4 text-base font-semibold text-foreground/40 sm:text-lg">
            {["BEAUTY", "DENTAL", "WELLNESS", "MEDICAL", "LOCAL CLINIC"].map((item) => (
              <span key={item} className="tracking-[0.08em]">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="funnel" className="section-space">
        <div className="page-shell">
          <div className="section-heading mx-auto max-w-4xl text-center">
            <p className="section-kicker">FULL-FUNNEL GROWTH</p>
            <h2>
              광고로 끝나는 마케팅이 아니라
              <br />
              <span>환자가 쌓이는 구조</span>를 만듭니다
            </h2>
            <p>
              기존 고객의 리텐션만으로는 성장이 시작되지 않습니다.
              <br className="hidden sm:block" />
              닥터네스트는 새로운 고객을 발견하는 순간부터 다시 방문하는 순간까지 연결합니다.
            </p>
          </div>

          <div className="funnel-grid mt-16">
            {funnelSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.number} className="funnel-step">
                  <div className="flex items-start justify-between">
                    <span className="step-number">{step.number}</span>
                    <span className="step-icon">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-9 text-xs font-bold tracking-[0.08em] text-primary">{step.label}</p>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < funnelSteps.length - 1 ? (
                    <ArrowRight className="funnel-arrow hidden size-5 text-primary/25 xl:block" aria-hidden="true" />
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="growth-equation mt-10">
            <div className="growth-block">
              <Users className="size-6 text-primary" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-primary">NEW PATIENT</p>
                <p className="mt-1 text-lg font-bold">신규 환자 유입</p>
              </div>
            </div>
            <span className="equation-plus">+</span>
            <div className="growth-block">
              <Heart className="size-6 text-pink" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-pink">PATIENT CARE</p>
                <p className="mt-1 text-lg font-bold">내원 환자 리텐션</p>
              </div>
            </div>
            <span className="equation-equals">=</span>
            <div className="growth-result">
              <Sparkles className="size-6" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-white/65">SUSTAINABLE GROWTH</p>
                <p className="mt-1 text-lg font-bold">지속 가능한 병원 성장</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="matching" className="section-space bg-[#f4f6ff]">
        <div className="page-shell grid items-center gap-14 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="section-kicker">SMART MATCHING</p>
            <h2 className="feature-title">
              많이 보이는 사람보다,
              <br />
              <span>잘 맞는 사람</span>을 찾습니다
            </h2>
            <p className="feature-copy">
              팔로워 수만 보고 섭외하지 않습니다. 병원의 진료과와 톤, 지역, 핵심 고객층,
              콘텐츠 반응 데이터를 함께 분석해 실제 내원 가능성이 높은 인플루언서를 매칭합니다.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "진료과·시술군과 콘텐츠 관심사 분석",
                "지역 기반 팔로워와 실제 반응률 확인",
                "과도한 광고 계정과 브랜드 미스매치 사전 제외"
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium sm:text-base">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a className="text-link mt-9" href="/service/chatting">
              우리 병원 예상 매칭 보기
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="matching-board">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-7">
              <div>
                <p className="text-sm font-bold">인플루언서 매칭 보드</p>
                <p className="mt-1 text-xs text-muted-foreground">강남 · 피부과 · 25–39세 여성 타깃</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary">
                <Search className="size-3.5" aria-hidden="true" />
                284명 분석
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3">
                {matchingProfiles.map((profile, index) => (
                  <div key={profile.handle} className="profile-row">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${profile.gradient} font-bold text-indigo`}
                    >
                      {profile.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold">{profile.name}</p>
                        {index === 0 ? <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" /> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{profile.handle}</p>
                    </div>
                    <div className="hidden text-center sm:block">
                      <p className="text-sm font-bold">{profile.followers}</p>
                      <p className="text-[10px] text-muted-foreground">팔로워</p>
                    </div>
                    <div className="hidden text-center sm:block">
                      <p className="text-sm font-bold">{profile.reach}</p>
                      <p className="text-[10px] text-muted-foreground">평균 도달</p>
                    </div>
                    <div className="fit-score">
                      <span>{profile.fit}</span>
                      <small>매칭률</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-[#171b31] p-4 text-white sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-pink">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">선별부터 섭외까지 전담 매니저가 진행해요</p>
                    <p className="mt-1 text-xs text-white/55">병원은 승인만 해주세요</p>
                  </div>
                </div>
                <span className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold sm:mt-0">
                  All managed
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="operation" className="section-space">
        <div className="page-shell">
          <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <div>
              <p className="section-kicker">DONE-FOR-YOU</p>
              <h2 className="feature-title">
                이것저것 준비할 필요 없이,
                <br />
                <span>우리가 다 알아서</span>
              </h2>
            </div>
            <p className="feature-copy lg:pb-1">
              체험단은 모집보다 운영이 어렵습니다. 수십 명의 지원자를 검수하고, 연락하고,
              예약을 맞추고, 콘텐츠를 확인하는 반복 업무를 닥터네스트 전담팀이 가져갑니다.
            </p>
          </div>

          <div className="operation-grid mt-14">
            <div className="operation-panel operation-main">
              <div className="max-w-lg">
                <span className="operation-icon">
                  <Handshake className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-8 text-sm font-semibold text-primary">전담 운영팀</p>
                <h3>병원과 같은 목소리로 움직입니다</h3>
                <p>
                  병원의 주력 진료, 고객 응대 기준, 원하는 이미지까지 먼저 이해하고 매칭과
                  콘텐츠 가이드를 설계합니다. 내부 마케팅 인력을 새로 채용하지 않아도 됩니다.
                </p>
              </div>
              <div className="manager-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">이번 주 캠페인</p>
                  <span className="status-pill">정상 운영</span>
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    ["매칭 확정", "12 / 15명", "80%"],
                    ["방문 완료", "8 / 12명", "66%"],
                    ["콘텐츠 게시", "6 / 8건", "75%"]
                  ].map(([label, value, width]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold">{value}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-indigo"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="operation-panel price-panel">
              <span className="operation-icon bg-pink/10 text-pink">
                <Star className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-8 text-sm font-semibold text-pink">합리적인 가격</p>
              <h3>필요한 만큼 시작하고, 성과에 맞춰 키우세요</h3>
              <p>큰 선결제나 불필요한 기능 묶음 없이 병원 규모와 목표에 맞춰 운영 범위를 설계합니다.</p>
              <div className="mt-8 flex items-end gap-2">
                <span className="text-4xl font-bold tracking-[-0.05em]">맞춤형</span>
                <span className="pb-1 text-sm text-muted-foreground">운영 플랜</span>
              </div>
            </div>
          </div>

          <div className="service-list">
            {serviceItems.map((item) => (
              <div key={item} className="service-item">
                <CircleCheck className="size-5 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space bg-[#171b31] text-white">
        <div className="page-shell">
          <div className="mx-auto max-w-4xl text-center">
            <p className="section-kicker !text-[#91a7ff]">ONE CONNECTED JOURNEY</p>
            <h2 className="mt-5 text-4xl font-bold leading-[1.18] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
              신규 환자를 만드는 힘과
              <br />
              단골 환자를 지키는 힘을 하나로.
            </h2>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
              누군가의 진짜 경험이 새로운 환자의 첫 방문을 만들고,
              세심한 관리가 그 방문을 오래 가는 관계로 만듭니다.
            </p>
          </div>
          <div className="journey-line mt-16">
            {[
              ["발견", "인플루언서 콘텐츠"],
              ["관심", "검색과 문의"],
              ["방문", "상담과 진료"],
              ["신뢰", "맞춤 사후관리"],
              ["재방문", "단골 고객 전환"]
            ].map(([title, description], index) => (
              <div key={title} className="journey-item">
                <div className="journey-dot">
                  <span>{index + 1}</span>
                </div>
                <p className="mt-5 text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs text-white/45">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="section-space">
        <div className="page-shell grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="section-kicker">FAQ</p>
            <h2 className="feature-title">
              원장님들이
              <br />
              자주 묻는 질문
            </h2>
            <p className="feature-copy">
              더 궁금한 내용은 상담에서 병원 상황에 맞춰 구체적으로 안내해드릴게요.
            </p>
          </div>
          <div className="divide-y divide-border rounded-[2rem] border border-border bg-white px-6 sm:px-8">
            {faqs.map((faq) => (
              <details key={faq.question} className="faq-item group">
                <summary>
                  <span>{faq.question}</span>
                  <span className="faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-8 sm:pb-12">
        <div className="page-shell">
          <div className="final-cta">
            <div className="relative z-10 max-w-3xl">
              <p className="text-sm font-semibold text-white/65">DOCTORNEST GROWTH TEAM</p>
              <h2>
                우리 병원에 꼭 맞는
                <br />
                첫 성장 퍼널을 만나보세요.
              </h2>
              <p>
                신규 유입부터 재방문까지, 닥터네스트가 병원의 다음 성장을 함께 설계합니다.
              </p>
              <a className="button button-white button-lg mt-8" href="/service/chatting">
                무료 성장 상담 시작하기
                <ArrowRight className="size-5" aria-hidden="true" />
              </a>
            </div>
            <div className="cta-orb cta-orb-one" />
            <div className="cta-orb cta-orb-two" />
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white">
        <div className="page-shell flex flex-col gap-7 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 font-bold tracking-[-0.03em]">
              <BrandMark />
              닥터네스트
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              병원의 유입부터 재방문까지, 하나의 성장팀
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
            <a href="#funnel" className="hover:text-foreground">
              서비스 소개
            </a>
            <a href="/service/chatting" className="hover:text-foreground">
              도입 문의
            </a>
            <span>© 2026 DoctorNest</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
