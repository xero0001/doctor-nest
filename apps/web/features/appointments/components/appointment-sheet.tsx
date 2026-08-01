"use client";

import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  RefreshCw,
  Search,
  Settings2,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  AppointmentOperatingHour,
  AppointmentSheetItem,
  AppointmentStatus,
} from "@/features/appointments/appointment-types";

const SEOUL_TIME_ZONE = "Asia/Seoul";
const intervalOptions = [15, 30, 60] as const;
const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
const weekdayKeys: AppointmentOperatingHour["weekday"][] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const statusMeta: Record<
  AppointmentStatus,
  { label: string; cardClass: string; badgeClass: string }
> = {
  SCHEDULED: {
    label: "예약",
    cardClass: "border-[#bcd0ff] bg-[#eef3ff] text-[#3157b5]",
    badgeClass: "bg-[#dfe9ff] text-[#3157b5]",
  },
  COMPLETED: {
    label: "완료",
    cardClass: "border-[#bae7d0] bg-[#edf9f3] text-[#237653]",
    badgeClass: "bg-[#d9f2e5] text-[#237653]",
  },
  CANCELLED: {
    label: "취소",
    cardClass: "border-[#f1c7ce] bg-[#fff3f5] text-[#b64758]",
    badgeClass: "bg-[#ffe0e5] text-[#b64758]",
  },
  NO_SHOW: {
    label: "노쇼",
    cardClass: "border-[#e1d5f6] bg-[#f7f2ff] text-[#7650a8]",
    badgeClass: "bg-[#eadff9] text-[#7650a8]",
  },
};

type CalendarCell = {
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
  weekday: number;
};

function dateKeyFromUTC(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function createCalendarCells(monthKey: string): CalendarCell[] {
  const { year, month } = parseDateKey(`${monthKey}-01`);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = firstDay.getUTCDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index - firstWeekday + 1));
    return {
      dateKey: dateKeyFromUTC(date),
      day: date.getUTCDate(),
      inCurrentMonth: date.getUTCMonth() === month - 1,
      weekday: date.getUTCDay(),
    };
  });
}

function moveMonth(monthKey: string, offset: number) {
  const { year, month } = parseDateKey(`${monthKey}-01`);
  const nextMonth = new Date(Date.UTC(year, month - 1 + offset, 1));
  return dateKeyFromUTC(nextMonth).slice(0, 7);
}

function getKoreanAppointmentTime(isoDate: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoDate));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    minutes: hour * 60 + minute,
    timeLabel: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function formatMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatSelectedDate(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function AppointmentSheet({
  enabled,
  initialDateKey,
  operatingNotes,
  operatingHours,
  appointments,
}: {
  enabled: boolean;
  initialDateKey: string;
  operatingNotes: string;
  operatingHours: AppointmentOperatingHour[];
  appointments: AppointmentSheetItem[];
}) {
  const router = useRouter();
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [monthKey, setMonthKey] = useState(initialDateKey.slice(0, 7));
  const [intervalMinutes, setIntervalMinutes] =
    useState<(typeof intervalOptions)[number]>(15);
  const [doctorFilter, setDoctorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">(
    "ALL",
  );
  const [query, setQuery] = useState("");

  const appointmentTimes = useMemo(
    () =>
      new Map(
        appointments.map((appointment) => [
          appointment.id,
          getKoreanAppointmentTime(appointment.scheduledAt),
        ]),
      ),
    [appointments],
  );
  const doctors = useMemo(
    () =>
      Array.from(
        new Set(appointments.map((appointment) => appointment.doctorName)),
      ).sort((left, right) => left.localeCompare(right, "ko")),
    [appointments],
  );
  const appointmentCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const appointment of appointments) {
      if (appointment.status === "CANCELLED") continue;
      const dateKey = appointmentTimes.get(appointment.id)?.dateKey;
      if (dateKey) counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }
    return counts;
  }, [appointments, appointmentTimes]);
  const calendarCells = useMemo(
    () => createCalendarCells(monthKey),
    [monthKey],
  );
  const selectedWeekday = new Date(`${selectedDateKey}T00:00:00Z`).getUTCDay();
  const selectedOperatingHour =
    operatingHours.find(
      (hour) => hour.weekday === weekdayKeys[selectedWeekday],
    ) ?? null;
  const timeSlots = useMemo(() => {
    if (!selectedOperatingHour?.isOpen) return [];
    const slots: number[] = [];
    for (
      let minutes = selectedOperatingHour.openMinutes;
      minutes < selectedOperatingHour.closeMinutes;
      minutes += intervalMinutes
    ) {
      slots.push(minutes);
    }
    return slots;
  }, [intervalMinutes, selectedOperatingHour]);

  const normalizedQuery = query
    .trim()
    .replaceAll("-", "")
    .toLocaleLowerCase("ko");
  const selectedAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const appointmentTime = appointmentTimes.get(appointment.id);
        if (appointmentTime?.dateKey !== selectedDateKey) return false;
        if (doctorFilter !== "ALL" && appointment.doctorName !== doctorFilter)
          return false;
        if (statusFilter !== "ALL" && appointment.status !== statusFilter)
          return false;
        if (!normalizedQuery) return true;

        return [
          appointment.patientName,
          appointment.patientPhone.replaceAll("-", ""),
          appointment.chartNumber,
          appointment.treatment,
        ].some((value) =>
          value.toLocaleLowerCase("ko").includes(normalizedQuery),
        );
      }),
    [
      appointmentTimes,
      appointments,
      doctorFilter,
      normalizedQuery,
      selectedDateKey,
      statusFilter,
    ],
  );
  const visibleDoctors =
    doctorFilter === "ALL"
      ? doctors.length > 0
        ? doctors
        : ["전체 예약"]
      : [doctorFilter];
  const scheduledCount = selectedAppointments.filter(
    (appointment) => appointment.status === "SCHEDULED",
  ).length;
  const completedCount = selectedAppointments.filter(
    (appointment) => appointment.status === "COMPLETED",
  ).length;
  const cancelledCount = selectedAppointments.filter(
    (appointment) => appointment.status === "CANCELLED",
  ).length;
  const appointmentsByDoctorAndSlot = useMemo(() => {
    const schedule = new Map<string, AppointmentSheetItem[]>();
    for (const appointment of selectedAppointments) {
      const time = appointmentTimes.get(appointment.id);
      if (!time) continue;
      const slot = Math.floor(time.minutes / intervalMinutes) * intervalMinutes;
      const key = `${appointment.doctorName}\u0000${slot}`;
      const current = schedule.get(key);
      if (current) current.push(appointment);
      else schedule.set(key, [appointment]);
    }
    return schedule;
  }, [appointmentTimes, intervalMinutes, selectedAppointments]);
  const gridColumns = `72px repeat(${visibleDoctors.length}, minmax(240px, 1fr))`;

  function selectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setMonthKey(dateKey.slice(0, 7));
  }

  function changeMonth(offset: number) {
    const nextMonthKey = moveMonth(monthKey, offset);
    setMonthKey(nextMonthKey);
    setSelectedDateKey(`${nextMonthKey}-01`);
  }

  function exportCsv() {
    const header = [
      "예약일시",
      "고객명",
      "전화번호",
      "차트번호",
      "담당자",
      "시술",
      "상태",
    ];
    const rows = selectedAppointments.map((appointment) => {
      const time = appointmentTimes.get(appointment.id);
      return [
        `${time?.dateKey ?? ""} ${time?.timeLabel ?? ""}`,
        appointment.patientName,
        appointment.patientPhone,
        appointment.chartNumber,
        appointment.doctorName,
        appointment.treatment,
        statusMeta[appointment.status].label,
      ];
    });
    const csv = `\uFEFF${[header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `예약기록-${selectedDateKey}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f5f7fb]">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-[#dfe4ec] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#edf2ff] text-[#3157f6]">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-[#2f374a]">예약시트</h1>
            <p className="mt-0.5 text-xs text-[#8d95a7]">
              병원 운영시간과 선택한 시간 간격에 맞춰 예약 일정을 확인합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={selectedAppointments.length === 0}
            className="flex h-10 items-center gap-2 rounded-xl border border-[#dce1e9] bg-white px-3 text-xs font-bold text-[#667086] hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:text-[#b5bbc7]"
          >
            <Download className="size-4" /> CSV 저장
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex h-10 items-center gap-2 rounded-xl border border-[#dce1e9] bg-white px-3 text-xs font-bold text-[#667086] hover:bg-[#f8f9fc]"
          >
            <RefreshCw className="size-4" /> 새로고침
          </button>
          <Link
            href="/service/settings/basic"
            className="flex h-10 items-center gap-2 rounded-xl border border-[#dce1e9] bg-white px-3 text-xs font-bold text-[#667086] hover:bg-[#f8f9fc]"
          >
            <Settings2 className="size-4" /> 설정
          </Link>
        </div>
      </header>

      {!enabled ? (
        <div className="mx-6 mt-4 flex shrink-0 items-center justify-between gap-4 rounded-xl border border-[#f0d6a0] bg-[#fff8e9] px-4 py-3 text-sm text-[#8a6319]">
          <span>
            예약관리 사용이 꺼져 있습니다. 기본설정에서 활성화하면 서비스 메뉴에
            표시됩니다.
          </span>
          <Link
            href="/service/settings/basic"
            className="shrink-0 font-bold underline"
          >
            기본설정 열기
          </Link>
        </div>
      ) : null}

      <section className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#dfe4ec] bg-white px-6 py-3">
        <label className="flex h-10 min-w-[260px] flex-1 items-center rounded-xl border border-[#dce1e9] px-3 focus-within:border-[#7187f6] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
          <Search className="mr-2 size-4 text-[#9aa2b2]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="고객명, 휴대폰번호, 차트번호로 검색"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a8afbc]"
          />
        </label>
        <select
          value={doctorFilter}
          onChange={(event) => setDoctorFilter(event.target.value)}
          aria-label="담당자 필터"
          className="h-10 min-w-40 rounded-xl border border-[#dce1e9] bg-white px-3 text-sm font-semibold text-[#596177] outline-none focus:border-[#7187f6]"
        >
          <option value="ALL">담당자 전체</option>
          {doctors.map((doctor) => (
            <option key={doctor} value={doctor}>
              {doctor}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as AppointmentStatus | "ALL")
          }
          aria-label="예약 상태 필터"
          className="h-10 min-w-36 rounded-xl border border-[#dce1e9] bg-white px-3 text-sm font-semibold text-[#596177] outline-none focus:border-[#7187f6]"
        >
          <option value="ALL">예약상태 전체</option>
          {Object.entries(statusMeta).map(([status, meta]) => (
            <option key={status} value={status}>
              {meta.label}
            </option>
          ))}
        </select>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-[#dce1e9] bg-white px-3">
          <Clock3 className="size-4 text-[#7f879a]" />
          <select
            value={intervalMinutes}
            onChange={(event) =>
              setIntervalMinutes(
                Number(event.target.value) as (typeof intervalOptions)[number],
              )
            }
            aria-label="시간 간격"
            className="bg-transparent text-sm font-bold text-[#4f586d] outline-none"
          >
            {intervalOptions.map((interval) => (
              <option key={interval} value={interval}>
                {interval}분 간격
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[320px] shrink-0 overflow-y-auto border-r border-[#dfe4ec] bg-white">
          <section className="border-b border-[#e5e8ef] p-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="이전 달"
                className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3ea] text-[#6c7488] hover:bg-[#f6f7fa]"
              >
                <ChevronLeft className="size-4" />
              </button>
              <h2 className="text-base font-extrabold text-[#32394c]">
                {monthKey.replace("-", "년 ")}월
              </h2>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="다음 달"
                className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3ea] text-[#6c7488] hover:bg-[#f6f7fa]"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => selectDate(initialDateKey)}
              className="mx-auto mt-3 block h-8 rounded-lg border border-[#dfe3ea] px-4 text-xs font-bold text-[#697187] hover:bg-[#f7f8fb]"
            >
              오늘
            </button>
            <div className="mt-4 grid grid-cols-7 text-center text-xs font-bold text-[#737b8e]">
              {weekdayNames.map((weekday, index) => (
                <span
                  key={weekday}
                  className={
                    index === 0
                      ? "text-[#df6371]"
                      : index === 6
                        ? "text-[#4e81d3]"
                        : ""
                  }
                >
                  {weekday}
                </span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-y-1">
              {calendarCells.map((cell) => {
                const selected = cell.dateKey === selectedDateKey;
                const count = appointmentCountByDate.get(cell.dateKey) ?? 0;
                return (
                  <button
                    type="button"
                    key={cell.dateKey}
                    onClick={() => selectDate(cell.dateKey)}
                    aria-label={`${cell.dateKey}, 예약 ${count}건`}
                    aria-pressed={selected}
                    className={`relative mx-auto flex size-9 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      selected
                        ? "bg-[#3157f6] text-white shadow-sm"
                        : cell.inCurrentMonth
                          ? cell.weekday === 0
                            ? "text-[#dc6170] hover:bg-[#f5f7fb]"
                            : cell.weekday === 6
                              ? "text-[#4b7dca] hover:bg-[#f5f7fb]"
                              : "text-[#555e72] hover:bg-[#f5f7fb]"
                          : "text-[#c0c5cf] hover:bg-[#f8f9fb]"
                    }`}
                  >
                    {cell.day}
                    {count > 0 ? (
                      <span
                        className={`absolute bottom-0.5 size-1 rounded-full ${selected ? "bg-white" : "bg-[#3157f6]"}`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-b border-[#e5e8ef] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#8e96a8]">선택일</p>
                <p className="mt-1 text-sm font-extrabold text-[#353d50]">
                  {formatSelectedDate(selectedDateKey)}
                </p>
              </div>
              <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#3157f6]">
                {selectedAppointments.length}건
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SummaryStat
                label="예약"
                count={scheduledCount}
                className="text-[#3157f6]"
              />
              <SummaryStat
                label="완료"
                count={completedCount}
                className="text-[#27845e]"
              />
              <SummaryStat
                label="취소"
                count={cancelledCount}
                className="text-[#c44d5d]"
              />
            </div>
          </section>

          <section className="border-b border-[#e5e8ef] p-5">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-[#6f7890]" />
              <h3 className="text-sm font-extrabold text-[#394154]">
                담당자 현황
              </h3>
            </div>
            <div className="mt-3 space-y-2">
              {visibleDoctors.map((doctor) => {
                const count = selectedAppointments.filter(
                  (appointment) =>
                    doctor === "전체 예약" || appointment.doctorName === doctor,
                ).length;
                return (
                  <div
                    key={doctor}
                    className="flex items-center justify-between rounded-xl bg-[#f7f8fb] px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-[#5b6479]">
                      {doctor}
                    </span>
                    <span className="font-extrabold text-[#3157f6]">
                      {count}건
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="p-5">
            <h3 className="text-sm font-extrabold text-[#394154]">공지사항</h3>
            <div className="mt-3 min-h-24 whitespace-pre-wrap rounded-xl border border-[#e1e5ec] bg-[#fafbfc] p-3 text-xs leading-5 text-[#737c90]">
              {operatingNotes || "등록된 공지사항이 없습니다."}
            </div>
          </section>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto bg-[#f8f9fc]">
          {timeSlots.length > 0 ? (
            <div className="min-w-max">
              <div
                className="sticky top-0 z-10 grid border-b border-[#dfe4ec] bg-white"
                style={{ gridTemplateColumns: gridColumns }}
              >
                <div className="flex h-14 items-center justify-center border-r border-[#e2e6ed] text-xs font-bold text-[#8b93a5]">
                  시간
                </div>
                {visibleDoctors.map((doctor) => (
                  <div
                    key={doctor}
                    className="flex h-14 items-center justify-center border-r border-[#e2e6ed] px-3 text-sm font-extrabold text-[#444c61]"
                  >
                    {doctor}
                  </div>
                ))}
              </div>

              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  data-testid="appointment-time-slot"
                  data-slot-minutes={slot}
                  className="grid border-b border-[#e5e8ef]"
                  style={{ gridTemplateColumns: gridColumns }}
                >
                  <div className="flex min-h-12 items-start justify-center border-r border-[#e2e6ed] bg-white pt-3 text-xs font-semibold text-[#858da0]">
                    {formatMinutes(slot)}
                  </div>
                  {visibleDoctors.map((doctor) => {
                    const slotAppointments =
                      appointmentsByDoctorAndSlot.get(
                        `${doctor}\u0000${slot}`,
                      ) ?? [];
                    return (
                      <div
                        key={`${doctor}-${slot}`}
                        className="min-h-12 border-r border-[#e2e6ed] bg-white/70 p-1.5"
                      >
                        {slotAppointments.map((appointment) => {
                          const meta = statusMeta[appointment.status];
                          const time = appointmentTimes.get(appointment.id);
                          return (
                            <article
                              key={appointment.id}
                              className={`rounded-lg border px-2.5 py-2 shadow-sm ${meta.cardClass}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-extrabold">
                                  {appointment.patientName}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                                >
                                  {meta.label}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-[11px] font-semibold opacity-80">
                                {time?.timeLabel} ·{" "}
                                {appointment.treatment || "상담"}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[480px] flex-col items-center justify-center text-center text-[#9299aa]">
              <CalendarOff className="size-10" />
              <p className="mt-4 text-base font-extrabold text-[#5f687c]">
                휴진일입니다.
              </p>
              <p className="mt-1 text-sm">
                병원프로필에서 운영시간을 변경할 수 있습니다.
              </p>
              <Link
                href="/service/settings/profile"
                className="mt-4 rounded-xl border border-[#dce1e9] bg-white px-4 py-2 text-xs font-bold text-[#596177]"
              >
                운영시간 설정
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  const Icon =
    label === "완료" ? CheckCircle2 : label === "취소" ? XCircle : CalendarDays;
  return (
    <div className="rounded-xl border border-[#e4e7ed] bg-[#fafbfc] p-2.5 text-center">
      <Icon className={`mx-auto size-4 ${className}`} />
      <p className={`mt-1 text-sm font-extrabold ${className}`}>{count}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-[#8c94a6]">{label}</p>
    </div>
  );
}
