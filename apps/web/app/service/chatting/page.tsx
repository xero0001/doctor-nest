"use client";

import { useState } from "react";
import {
  Archive,
  BellRing,
  BookOpenText,
  Bookmark,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Folder,
  MessageCircleMore,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Settings2,
  Smile,
  Sparkles,
  Star,
  UserRound,
  WandSparkles
} from "lucide-react";

type ChatState = "진행 중" | "완료" | "중요";

type ChatRoom = {
  id: number;
  name: string;
  channel: "K" | "N" | "C";
  message: string;
  time: string;
  unread?: number;
  important?: boolean;
  state: ChatState;
};

const chatRooms: ChatRoom[] = [
  { id: 1, name: "박지호", channel: "K", message: "다음주 수요일(24일)에 예약해드리겠습니다.", time: "오후 3:03", unread: 3, important: true, state: "진행 중" },
  { id: 2, name: "임정윤", channel: "C", message: "예약하려고 하는데요", time: "오후 3:03", unread: 1, state: "진행 중" },
  { id: 3, name: "홍태림", channel: "N", message: "(이미지를 보냈습니다.)", time: "오후 3:02", state: "진행 중" },
  { id: 4, name: "최하은", channel: "C", message: "김원장님 월요일에 진료 보시나요?", time: "오후 2:58", important: true, state: "중요" },
  { id: 5, name: "이민석", channel: "C", message: "안녕하세요. 이번주 금요일 16시에 예약했는데…", time: "오후 2:42", state: "진행 중" },
  { id: 6, name: "김연정", channel: "C", message: "네 감사합니다~", time: "오후 2:31", state: "완료" },
  { id: 7, name: "나지희", channel: "K", message: "지난번 시술이 많이 아팠는데 걱정이 크셨어요…", time: "오후 1:54", important: true, state: "중요" },
  { id: 8, name: "박현우", channel: "C", message: "좀더 생각해보고 연락드릴게요", time: "오후 1:28", state: "완료" },
  { id: 9, name: "정준서", channel: "C", message: "감사합니다. 예약 완료 되었습니다.", time: "오후 12:44", state: "완료" }
];

const knowledgeGroups = [
  { label: "피부", count: 12 },
  { label: "레이저 시술", count: 8 },
  { label: "필러 · 보톡스", count: 6 }
];

const appointments = [
  { date: "2026-07-24 (금) 16:00", doctor: "김민준 원장", active: true },
  { date: "2026-06-12 (금) 15:30", doctor: "김민준 원장" },
  { date: "2026-05-08 (금) 17:00", doctor: "박서연 원장" }
];

const channelStyles = {
  K: "bg-[#ffe400] text-[#2b2b2b]",
  N: "bg-[#20c76d] text-white",
  C: "bg-[#3157f6] text-white"
};

function ChannelBadge({ channel }: { channel: ChatRoom["channel"] }) {
  return (
    <span className={`flex size-[19px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold ${channelStyles[channel]}`}>
      {channel}
    </span>
  );
}

export default function ChattingPage() {
  const [chatTab, setChatTab] = useState<ChatState>("진행 중");
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [query, setQuery] = useState("");
  const [knowledgeTab, setKnowledgeTab] = useState<"원내매뉴얼" | "콘텐츠">("원내매뉴얼");
  const [detailTab, setDetailTab] = useState<"AI 탭" | "자동화 내역" | "채팅북마크">("AI 탭");
  const [draft, setDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleRooms = chatRooms.filter((room) => {
    const matchesTab = chatTab === "중요" ? room.important : room.state === chatTab;
    const matchesQuery = !normalizedQuery || `${room.name} ${room.message}`.toLowerCase().includes(normalizedQuery);
    return matchesTab && matchesQuery;
  });

  const currentRoom = chatRooms.find((room) => room.id === selectedRoom) ?? chatRooms[0];

  function sendMessage() {
    const message = draft.trim();
    if (!message) return;
    setSentMessages((messages) => [...messages, message]);
    setDraft("");
  }

  return (
    <div className="grid h-full min-w-[1260px] grid-cols-[258px_276px_minmax(410px,1fr)_318px] bg-white">
      <section className="flex min-w-0 flex-col border-r border-[#e8eaf1] bg-white">
        <header className="flex h-[68px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-bold tracking-[-0.02em]">고객채팅</h1>
            <Settings2 className="size-4 text-[#9aa0b2]" />
          </div>
          <button type="button" className="flex items-center gap-1 text-[11px] text-[#8d93a6]">
            전체 <ChevronDown className="size-3" />
          </button>
        </header>

        <div className="grid grid-cols-3 border-b border-[#e8eaf1] px-3">
          {(["진행 중", "완료", "중요"] as ChatState[]).map((tab) => {
            const count = tab === "중요" ? chatRooms.filter((room) => room.important).length : chatRooms.filter((room) => room.state === tab).length;
            return (
              <button
                type="button"
                key={tab}
                onClick={() => setChatTab(tab)}
                className={`relative flex h-11 items-center justify-center gap-1.5 text-xs font-semibold ${chatTab === tab ? "text-[#252a3e]" : "text-[#9ca1b1]"}`}
              >
                {tab}
                <span className={`text-[10px] ${chatTab === tab ? "text-[#3157f6]" : "text-[#adb2bf]"}`}>{count}</span>
                {tab === "진행 중" ? <span className="absolute right-4 top-2 size-1.5 rounded-full bg-[#f04f68]" /> : null}
                {chatTab === tab ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#3157f6]" /> : null}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 border-b border-[#eef0f5] p-3">
          <button type="button" className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#e2e5ed] px-2.5 text-[11px] text-[#71788e]">
            채팅번호 <ChevronDown className="size-3" />
          </button>
          <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e2e5ed] px-2.5 text-[#9399aa] focus-within:border-[#7289f7] focus-within:ring-2 focus-within:ring-[#3157f6]/10">
            <Search className="size-3.5 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="고객명으로 검색"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-[#31364b] outline-none placeholder:text-[#aeb3c0]"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleRooms.map((room) => (
            <button
              type="button"
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`group relative w-full border-b border-[#f0f1f5] px-4 py-3.5 text-left transition-colors ${
                selectedRoom === room.id ? "bg-[#edf3ff]" : "bg-white hover:bg-[#f8f9fc]"
              }`}
            >
              {selectedRoom === room.id ? <span className="absolute inset-y-0 left-0 w-[3px] bg-[#3157f6]" /> : null}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ChannelBadge channel={room.channel} />
                  <span className="truncate text-[12px] font-bold text-[#2f3449]">{room.name}</span>
                  {room.unread ? <span className="flex min-w-4 items-center justify-center rounded-full bg-[#f04f68] px-1 text-[9px] font-bold text-white">{room.unread}</span> : null}
                </div>
                <Star className={`size-3.5 shrink-0 ${room.important ? "fill-[#ffcf34] text-[#ffbe19]" : "text-[#d2d5de]"}`} />
              </div>
              <div className="mt-2 flex items-end justify-between gap-2 pl-[27px]">
                <p className="min-w-0 truncate text-[10.5px] text-[#767d91]">{room.message}</p>
                <span className="shrink-0 text-[9px] text-[#a8adba]">{room.time}</span>
              </div>
            </button>
          ))}
          {visibleRooms.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-[#a1a7b6]">
              <MessageCircleMore className="mb-2 size-6" />
              <p className="text-xs">조건에 맞는 채팅이 없어요.</p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[#e8eaf1] p-3">
          <button type="button" className="rounded-lg border border-[#dde1ea] py-2 text-[10px] font-medium text-[#687086] hover:bg-[#f7f8fb]">고객 간편 입력</button>
          <button type="button" className="rounded-lg border border-[#dde1ea] py-2 text-[10px] font-medium text-[#687086] hover:bg-[#f7f8fb]">채팅 현황 보기</button>
        </div>
      </section>

      <section className="flex min-w-0 flex-col border-r border-[#e8eaf1] bg-[#fff]">
        <header className="flex h-[68px] items-center border-b border-[#e8eaf1] px-4">
          <BookOpenText className="mr-2 size-[17px] text-[#6657e9]" />
          <h2 className="text-[14px] font-bold">상담 백과사전</h2>
        </header>

        <div className="grid grid-cols-2 border-b border-[#e8eaf1] px-3">
          {(["원내매뉴얼", "콘텐츠"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setKnowledgeTab(tab)}
              className={`relative h-11 text-xs font-semibold ${knowledgeTab === tab ? "text-[#2c3146]" : "text-[#9da2b2]"}`}
            >
              {tab}
              {knowledgeTab === tab ? <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#6657e9]" /> : null}
            </button>
          ))}
        </div>

        <div className="border-b border-[#edf0f5] p-3">
          <label className="flex h-8 items-center gap-2 rounded-lg border border-[#e2e5ed] px-3 text-[#9ba1b1] focus-within:border-[#8676ef]">
            <Search className="size-3.5" />
            <input placeholder="태그명으로 검색" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#aeb3c0]" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-[#e8eaf1] py-2">
            {knowledgeGroups.map((group, index) => (
              <button
                type="button"
                key={group.label}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[11px] font-semibold ${index === 1 ? "bg-[#f0ebff] text-[#6657e9]" : "text-[#51586d] hover:bg-[#f8f9fc]"}`}
              >
                <ChevronRight className={`size-3 ${index === 1 ? "rotate-90" : ""}`} />
                {index === 1 ? <Bookmark className="size-3.5 fill-[#8066ec] text-[#8066ec]" /> : <Folder className="size-3.5 text-[#8d93a5]" />}
                <span className="flex-1">{group.label}</span>
                <span className="text-[9px] font-medium text-[#a0a5b3]">{group.count}</span>
              </button>
            ))}
          </div>

          <article className="space-y-4 px-4 py-4 text-[10.5px] leading-[1.65] text-[#5d6478]">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-[#eee9ff] px-2 py-1 text-[9px] font-bold text-[#6657e9]">레이저</span>
                <h3 className="text-[12px] font-bold text-[#33394d]">피코토닝 시술 안내</h3>
              </div>
              <p>피코토닝은 짧은 시간에 높은 에너지를 전달해 색소를 잘게 분해하는 레이저 시술입니다. 기미, 잡티, 피부톤 개선에 도움을 줄 수 있습니다.</p>
            </div>
            <div className="border-t border-[#eceef3] pt-4">
              <h4 className="mb-2 text-[11px] font-bold text-[#3d4357]">시술 효과</h4>
              <ul className="space-y-1 pl-3">
                <li>• 피부톤과 칙칙함 개선</li>
                <li>• 기미, 잡티 등 색소 병변 완화</li>
                <li>• 피부결과 모공 개선에 도움</li>
              </ul>
            </div>
            <div className="border-t border-[#eceef3] pt-4">
              <h4 className="mb-2 text-[11px] font-bold text-[#3d4357]">시술 방법</h4>
              <p>클렌징 → 마취 크림 → 레이저 시술 → 진정 관리</p>
              <p className="mt-2 text-[#878d9e]">※ 시술 시간은 피부 상태에 따라 달라질 수 있습니다.</p>
            </div>
            <div className="border-t border-[#eceef3] pt-4">
              <h4 className="mb-2 text-[11px] font-bold text-[#3d4357]">시술 후 주의사항</h4>
              <ul className="space-y-1 pl-3">
                <li>• 자외선 차단제를 꼼꼼히 발라주세요.</li>
                <li>• 당일 사우나와 격한 운동은 피해주세요.</li>
              </ul>
            </div>
            <div className="border-t border-[#eceef3] pt-4">
              <h4 className="mb-2 text-[11px] font-bold text-[#3d4357]">자주 묻는 질문</h4>
              <p className="font-semibold text-[#474e62]">Q. 시술 직후 세안이 가능한가요?</p>
              <p className="mt-1">A. 미온수로 가볍게 세안하실 수 있으며 자극적인 제품은 피해 주세요.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="flex min-w-0 flex-col bg-[#f2f5fb]">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#e5e8f0] bg-white px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#3157f6]">
              <UserRound className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-[13px] font-bold">{currentRoom.name}</h2>
                <span className="rounded-full bg-[#f0f2f7] px-1.5 py-0.5 text-[8px] font-bold text-[#747b8f]">VIP</span>
              </div>
              <p className="mt-0.5 text-[9px] text-[#9298a8]">여 / 1995-04-07 · 010-1234-1234</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="전화하기" className="flex size-8 items-center justify-center rounded-lg border border-[#e1e5ed] bg-white text-[#657087] hover:text-[#3157f6]">
              <Phone className="size-3.5" />
            </button>
            <button type="button" aria-label="더보기" className="flex size-8 items-center justify-center rounded-lg border border-[#e1e5ed] bg-white text-[#657087]">
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between border-b border-[#e7eaf1] bg-white px-4 py-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-[#edf1ff] px-2 py-1 text-[9px] font-bold text-[#3157f6]">치료태그</span>
            <span className="rounded-md bg-[#e8f8ef] px-2 py-1 text-[9px] font-bold text-[#1fa965]">피코토닝</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-[#777e91]">
            <span className="flex items-center gap-1"><Bot className="size-3 text-[#3157f6]" /> AI 자동응대</span>
            <span className="relative h-4 w-7 rounded-full bg-[#3157f6]"><span className="absolute right-0.5 top-0.5 size-3 rounded-full bg-white" /></span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto mb-5 w-fit rounded-full bg-[#e7eaf2] px-3 py-1 text-[9px] font-medium text-[#7f8698]">2026년 7월 21일 화요일</div>

          <div className="mb-6 flex items-end gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e9edf7] text-[10px] font-bold text-[#687188]">{currentRoom.name.slice(0, 1)}</div>
            <div>
              <p className="mb-1 text-[9px] font-semibold text-[#757c8e]">{currentRoom.name}</p>
              <div className="max-w-[280px] rounded-2xl rounded-bl-[5px] border border-[#dfe3ec] bg-white px-3.5 py-3 text-[11px] leading-[1.55] text-[#454b5e] shadow-sm">
                피코토닝 이벤트 보고 문의드려요.<br />가격이 어떻게 되나요?
              </div>
            </div>
            <span className="text-[8px] text-[#a0a6b4]">오후 1:31</span>
          </div>

          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-lg bg-[#e7edff] px-3 py-1.5 text-[9px] font-semibold text-[#4765dc]">
              <Sparkles className="size-3" /> AI가 답변을 제안했어요
            </div>
          </div>

          <div className="mb-6 flex justify-end gap-2">
            <div className="max-w-[330px]">
              <div className="rounded-2xl rounded-br-[5px] bg-gradient-to-br from-[#3157f6] to-[#6657e9] px-4 py-3 text-[11px] leading-[1.6] text-white shadow-[0_8px_20px_rgba(67,81,195,0.2)]">
                안녕하세요, {currentRoom.name}님. 피코토닝 이벤트는 현재 1회 8만 9천원이며 피부 상태에 따라 맞춤 상담 후 진행해드리고 있어요. 원하시면 예약 가능한 시간도 바로 안내해드릴게요.
              </div>
              <div className="mt-1 flex justify-end gap-1.5 text-[8px] text-[#9aa0ae]"><Check className="size-2.5 text-[#3157f6]" /> 오후 1:33</div>
            </div>
          </div>

          <div className="mb-6 flex items-end gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e9edf7] text-[10px] font-bold text-[#687188]">{currentRoom.name.slice(0, 1)}</div>
            <div className="max-w-[290px] rounded-2xl rounded-bl-[5px] border border-[#dfe3ec] bg-white px-3.5 py-3 text-[11px] leading-[1.55] text-[#454b5e] shadow-sm">
              좋아요! 이번 주 금요일 오후로 예약할 수 있을까요?
            </div>
            <span className="text-[8px] text-[#a0a6b4]">오후 1:36</span>
          </div>

          {sentMessages.map((message, index) => (
            <div key={`${message}-${index}`} className="mb-4 flex justify-end">
              <div className="max-w-[330px] rounded-2xl rounded-br-[5px] bg-gradient-to-br from-[#3157f6] to-[#6657e9] px-4 py-3 text-[11px] leading-[1.6] text-white shadow-sm">
                {message}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-[#e1e5ee] bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-[9px] text-[#858c9e]">
            <button type="button" className="flex items-center gap-1 rounded-md bg-[#eef2ff] px-2 py-1 font-semibold text-[#3157f6]"><WandSparkles className="size-3" /> 답변 예시</button>
            <span>Tab 키로 AI 답변을 사용할 수 있어요</span>
          </div>
          <div className="rounded-xl border border-[#dfe3ec] bg-white p-2 focus-within:border-[#7187f6] focus-within:ring-2 focus-within:ring-[#3157f6]/10">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder="메시지를 입력해 주세요."
              className="w-full resize-none bg-transparent px-1 text-[11px] leading-5 text-[#33394e] outline-none placeholder:text-[#adb2bf]"
            />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-[#9198aa]">
                <button type="button" aria-label="파일 첨부" className="rounded-md p-1.5 hover:bg-[#f1f3f8]"><Paperclip className="size-3.5" /></button>
                <button type="button" aria-label="이모지" className="rounded-md p-1.5 hover:bg-[#f1f3f8]"><Smile className="size-3.5" /></button>
                <button type="button" aria-label="추가 메뉴" className="rounded-md p-1.5 hover:bg-[#f1f3f8]"><Plus className="size-3.5" /></button>
              </div>
              <button
                type="button"
                onClick={sendMessage}
                disabled={!draft.trim()}
                className="flex h-7 items-center gap-1 rounded-lg bg-[#3157f6] px-3 text-[10px] font-bold text-white disabled:bg-[#d9dde6]"
              >
                전송 <Send className="size-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex min-w-0 flex-col border-l border-[#e8eaf1] bg-[#fafbfe]">
        <header className="flex h-[68px] items-center justify-between border-b border-[#e8eaf1] bg-white px-4">
          <div>
            <p className="text-[9px] font-semibold text-[#8d94a6]">고객 프로필</p>
            <h2 className="mt-1 text-[13px] font-bold">{currentRoom.name} <span className="font-mono text-[9px] font-medium text-[#9aa0af]">#10201</span></h2>
          </div>
          <button type="button" className="rounded-lg border border-[#e1e5ed] p-2 text-[#80879a]"><MoreHorizontal className="size-4" /></button>
        </header>

        <section className="border-b border-[#e5e8ef] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[#3157f6]" />
              <h3 className="text-[11px] font-bold">예약 내역</h3>
            </div>
            <button type="button" className="text-[9px] font-semibold text-[#3157f6]">전체보기</button>
          </div>
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div key={appointment.date} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${appointment.active ? "border-[#cfd8ff] bg-[#f4f6ff]" : "border-[#e4e7ee] bg-white"}`}>
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${appointment.active ? "bg-[#3157f6] text-white" : "bg-[#f0f2f6] text-[#9da3b1]"}`}>
                  {appointment.active ? <BellRing className="size-3.5" /> : <CalendarDays className="size-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[9.5px] font-bold ${appointment.active ? "text-[#344fc5]" : "text-[#62697c]"}`}>{appointment.date}</p>
                  <p className="mt-0.5 text-[8.5px] text-[#969cac]">{appointment.doctor} · 진료실 2</p>
                </div>
                {appointment.active ? <span className="rounded-full bg-[#e6ecff] px-1.5 py-0.5 text-[8px] font-bold text-[#3157f6]">예정</span> : null}
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-3 border-b border-[#e3e6ee] bg-white px-2">
          {(["AI 탭", "자동화 내역", "채팅북마크"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setDetailTab(tab)}
              className={`relative h-11 whitespace-nowrap text-[10px] font-semibold ${detailTab === tab ? "text-[#3157f6]" : "text-[#969cac]"}`}
            >
              {tab}
              {detailTab === tab ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#3157f6]" /> : null}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {detailTab === "AI 탭" ? (
            <div>
              <div className="mb-3 flex items-center gap-2 text-[#3157f6]">
                <span className="flex size-6 items-center justify-center rounded-lg bg-[#edf1ff]"><Sparkles className="size-3.5" /></span>
                <p className="text-[10px] font-bold">AI 상담 코치가 답변을 준비했어요</p>
              </div>
              <div className="rounded-xl border border-[#e0e4ed] bg-white p-3.5 shadow-[0_4px_14px_rgba(42,54,102,0.04)]">
                <div className="mb-3 flex items-center justify-between border-b border-[#eceef3] pb-3">
                  <div className="flex items-center gap-2 text-[9px] font-semibold text-[#747b8f]"><Bot className="size-3.5 text-[#6657e9]" /> 예약 가능 시간 확인</div>
                  <span className="rounded-full bg-[#eef8f3] px-2 py-1 text-[8px] font-bold text-[#1d9b60]">신뢰도 높음</span>
                </div>
                <p className="text-[10px] leading-[1.65] text-[#5a6175]">고객이 금요일 오후 예약을 요청했습니다. 현재 예약 가능한 시간과 담당 의료진을 확인한 뒤 선택지를 안내해 주세요.</p>
                <div className="mt-3 rounded-lg bg-[#edf2ff] p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold text-[#3157f6]"><WandSparkles className="size-3" /> 답변 예시</div>
                  <p className="text-[10px] leading-[1.65] text-[#485675]">이번 주 금요일은 오후 4시와 5시 30분 예약이 가능합니다. 원하시는 시간으로 도와드릴까요?</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="rounded-lg border border-[#dce1eb] py-2 text-[9px] font-semibold text-[#697187]">수정하기</button>
                  <button type="button" onClick={() => setDraft("이번 주 금요일은 오후 4시와 5시 30분 예약이 가능합니다. 원하시는 시간으로 도와드릴까요?")} className="rounded-lg bg-[#3157f6] py-2 text-[9px] font-bold text-white">답변에 사용</button>
                </div>
              </div>
            </div>
          ) : null}

          {detailTab === "자동화 내역" ? (
            <div className="space-y-4">
              {[
                { title: "예약 안내 자동화", description: "7월 24일 예약 안내가 발송될 예정입니다.", icon: Clock3, tone: "text-[#3157f6] bg-[#edf1ff]" },
                { title: "상담 분류 완료", description: "피코토닝 · 가격 문의로 분류했습니다.", icon: CheckCircle2, tone: "text-[#20a768] bg-[#eaf8f1]" },
                { title: "고객 정보 연결", description: "기존 고객 정보와 채팅을 연결했습니다.", icon: Archive, tone: "text-[#8a65dc] bg-[#f1edff]" }
              ].map(({ title, description, icon: Icon, tone }, index) => (
                <div key={title} className="relative flex gap-3">
                  {index < 2 ? <span className="absolute left-[15px] top-8 h-[30px] w-px bg-[#dde1eb]" /> : null}
                  <span className={`z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="size-3.5" /></span>
                  <div className="pt-0.5">
                    <p className="text-[10px] font-bold text-[#4a5165]">{title}</p>
                    <p className="mt-1 text-[9px] leading-4 text-[#8b91a2]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {detailTab === "채팅북마크" ? (
            <div className="space-y-2.5">
              {[
                "피코토닝 이벤트는 현재 1회 8만 9천원입니다.",
                "금요일 오후 예약을 희망하고 있어요.",
                "통증에 대한 걱정이 있어 마취 안내가 필요합니다."
              ].map((bookmark, index) => (
                <div key={bookmark} className="rounded-xl border border-[#e1e5ed] bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[8.5px] font-bold text-[#6657e9]"><Bookmark className="size-3 fill-[#8066ec]" /> 북마크 {index + 1}</span>
                    <MoreHorizontal className="size-3.5 text-[#a3a8b6]" />
                  </div>
                  <p className="text-[9.5px] leading-4 text-[#62697c]">{bookmark}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
