"use client";

import { Clock3, LoaderCircle, MessageCircleMore, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { HospitalSettingsSidebar } from "@/features/settings/components/hospital-settings-sidebar";

export type AutoReplyChannel =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";

export type ChannelAutoReplyRecord = {
  channel: AutoReplyChannel;
  connected: boolean;
  delayMinutes: number;
  businessHoursEnabled: boolean;
  businessHoursMessage: string;
  outsideBusinessHoursEnabled: boolean;
  outsideBusinessHoursMessage: string;
};

const channelDefinitions: Array<{
  channel: AutoReplyChannel;
  label: string;
  badge: string;
  badgeClass: string;
}> = [
  {
    channel: "KAKAO",
    label: "카카오 상담톡",
    badge: "K",
    badgeClass: "bg-[#fee500] text-[#252525]",
  },
  {
    channel: "INSTAGRAM",
    label: "인스타그램",
    badge: "IG",
    badgeClass:
      "bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white",
  },
  {
    channel: "NAVER_TALK",
    label: "네이버 톡톡",
    badge: "N",
    badgeClass: "bg-[#03c75a] text-white",
  },
  {
    channel: "LINE",
    label: "LINE",
    badge: "L",
    badgeClass: "bg-[#06c755] text-white",
  },
  {
    channel: "WECHAT",
    label: "WeChat",
    badge: "微",
    badgeClass: "bg-[#07c160] text-white",
  },
  {
    channel: "WHATSAPP",
    label: "WhatsApp",
    badge: "W",
    badgeClass: "bg-[#25d366] text-white",
  },
];

function AutoReplySwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-[#3157f6]" : "bg-[#c8cdd8]"
      }`}
    >
      <span
        className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function ChannelAutoReplyClient({
  initialSettings,
}: {
  initialSettings: ChannelAutoReplyRecord[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialSettings),
  );
  const [selectedChannel, setSelectedChannel] = useState<AutoReplyChannel>(
    initialSettings[0]?.channel ?? "KAKAO",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selected =
    settings.find((setting) => setting.channel === selectedChannel) ??
    settings[0];
  const isDirty = JSON.stringify(settings) !== savedSnapshot;

  useEffect(() => {
    if (!isDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [isDirty]);

  function updateSelected(update: Partial<ChannelAutoReplyRecord>) {
    setSettings((current) =>
      current.map((setting) =>
        setting.channel === selectedChannel
          ? { ...setting, ...update }
          : setting,
      ),
    );
    setNotice("");
    setError("");
  }

  async function saveSettings() {
    setIsSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/settings/auto-replies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const result = (await response.json()) as {
        settings?: ChannelAutoReplyRecord[];
        error?: string;
      };
      if (!response.ok || !result.settings) {
        throw new Error(
          result.error ?? "자동응대 메시지를 저장하지 못했습니다.",
        );
      }
      setSettings(result.settings);
      setSavedSnapshot(JSON.stringify(result.settings));
      setNotice("채널별 자동응대 메시지를 저장했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "자동응대 메시지를 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!selected) return null;

  return (
    <div className="flex h-full min-h-0 min-w-[1180px] bg-[#f3f7fd]">
      <HospitalSettingsSidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center border-b border-[#dfe4ec] bg-white px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
              <MessageCircleMore className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-[#30374a]">
                자동응대 메시지
              </h1>
              <p className="mt-0.5 text-xs text-[#9299a9]">
                고객 메시지에 보낼 채널별 안내 메시지를 설정합니다.
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[1100px]">
            {notice || error ? (
              <div
                role="status"
                className={`mb-5 rounded-xl px-4 py-3 text-sm ${
                  error
                    ? "bg-[#fff0f2] text-[#c64558]"
                    : "bg-[#edf8f2] text-[#34805b]"
                }`}
              >
                {error || notice}
              </div>
            ) : null}

            <div className="grid min-h-[640px] grid-cols-[360px_1fr] overflow-hidden rounded-2xl border border-[#e0e5ed] bg-white shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <section className="border-r border-[#e2e6ef] p-6">
                <h2 className="text-base font-extrabold text-[#30374a]">
                  채널별 자동응대
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#9299aa]">
                  연동된 채널은 연결 상태를 함께 표시합니다.
                </p>
                <div className="mt-5 space-y-3">
                  {channelDefinitions.map((definition) => {
                    const setting = settings.find(
                      (item) => item.channel === definition.channel,
                    );
                    return (
                      <button
                        key={definition.channel}
                        type="button"
                        onClick={() => setSelectedChannel(definition.channel)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                          selectedChannel === definition.channel
                            ? "border-[#6aaee8] bg-[#eaf5ff]"
                            : "border-[#e0e4ec] bg-white hover:bg-[#f8f9fc]"
                        }`}
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${definition.badgeClass}`}
                        >
                          {definition.badge}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-extrabold text-[#3b4357]">
                          {definition.label}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${
                            setting?.connected
                              ? "bg-[#e8f8f0] text-[#15945d]"
                              : "bg-[#f1f3f7] text-[#8b92a2]"
                          }`}
                        >
                          {setting?.connected ? "연동" : "미연동"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="p-7">
                <div className="flex items-center gap-2 border-b border-[#e8ebf1] pb-5">
                  <Clock3 className="size-5 text-[#3157f6]" />
                  <span className="text-sm font-extrabold text-[#3b4357]">
                    고객이 메시지를 보낸 후
                  </span>
                  <select
                    value={selected.delayMinutes}
                    onChange={(event) =>
                      updateSelected({
                        delayMinutes: Number(event.target.value),
                      })
                    }
                    className="h-10 rounded-xl border border-[#dfe3ea] bg-white px-3 text-sm font-bold outline-none focus:border-[#7187f6]"
                  >
                    {[1, 3, 5, 10, 30].map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}분
                      </option>
                    ))}
                  </select>
                  <span className="text-sm font-extrabold text-[#3b4357]">
                    이 경과하면 전송합니다.
                  </span>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#3b4357]">
                          운영시간 내
                        </h3>
                        <p className="mt-1 text-xs text-[#9299aa]">
                          병원 운영시간 중 고객 메시지에 안내합니다.
                        </p>
                      </div>
                      <AutoReplySwitch
                        checked={selected.businessHoursEnabled}
                        label="운영시간 내 자동응대"
                        onChange={() =>
                          updateSelected({
                            businessHoursEnabled:
                              !selected.businessHoursEnabled,
                          })
                        }
                      />
                    </div>
                    <textarea
                      value={selected.businessHoursMessage}
                      disabled={!selected.businessHoursEnabled}
                      maxLength={2_000}
                      onChange={(event) =>
                        updateSelected({
                          businessHoursMessage: event.target.value,
                        })
                      }
                      placeholder="고객에게 안내할 메시지를 입력해 주세요."
                      className="mt-3 min-h-40 w-full resize-y rounded-2xl border border-[#dfe3ea] px-4 py-3 text-sm leading-6 outline-none focus:border-[#7187f6] disabled:bg-[#f5f6f8] disabled:text-[#a8aeba]"
                    />
                  </div>

                  <div className="border-t border-[#e8ebf1] pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#3b4357]">
                          운영시간 외
                        </h3>
                        <p className="mt-1 text-xs text-[#9299aa]">
                          휴진 또는 운영시간 종료 후 고객 메시지에 안내합니다.
                        </p>
                      </div>
                      <AutoReplySwitch
                        checked={selected.outsideBusinessHoursEnabled}
                        label="운영시간 외 자동응대"
                        onChange={() =>
                          updateSelected({
                            outsideBusinessHoursEnabled:
                              !selected.outsideBusinessHoursEnabled,
                          })
                        }
                      />
                    </div>
                    <textarea
                      value={selected.outsideBusinessHoursMessage}
                      disabled={!selected.outsideBusinessHoursEnabled}
                      maxLength={2_000}
                      onChange={(event) =>
                        updateSelected({
                          outsideBusinessHoursMessage: event.target.value,
                        })
                      }
                      placeholder="운영시간 외 안내 메시지를 입력해 주세요."
                      className="mt-3 min-h-48 w-full resize-y rounded-2xl border border-[#dfe3ea] px-4 py-3 text-sm leading-6 outline-none focus:border-[#7187f6] disabled:bg-[#f5f6f8] disabled:text-[#a8aeba]"
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        <footer className="flex h-[72px] shrink-0 items-center justify-end border-t border-[#dfe4ec] bg-white px-8">
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={() => void saveSettings()}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-6 text-sm font-bold text-white disabled:bg-[#aeb9e6]"
          >
            {isSaving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            저장
          </button>
        </footer>
      </section>
    </div>
  );
}
