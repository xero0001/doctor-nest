"use client";

import {
  Building2,
  Clock3,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { HospitalSettingsSidebar } from "@/features/settings/components/hospital-settings-sidebar";
import type {
  HospitalOperatingHourRecord,
  HospitalProfileImage,
  HospitalProfileRecord,
  HospitalWeekday,
} from "@/features/settings/hospital-profile-types";

const weekdayLabels: Record<HospitalWeekday, string> = {
  MONDAY: "월요일",
  TUESDAY: "화요일",
  WEDNESDAY: "수요일",
  THURSDAY: "목요일",
  FRIDAY: "금요일",
  SATURDAY: "토요일",
  SUNDAY: "일요일",
};

function minutesToTime(minutes: number) {
  const bounded = Math.max(0, Math.min(1439, minutes));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(
    bounded % 60,
  ).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function cloneProfile(profile: HospitalProfileRecord): HospitalProfileRecord {
  return {
    ...profile,
    profileImage: profile.profileImage ? { ...profile.profileImage } : null,
    operatingHours: profile.operatingHours.map((hour) => ({ ...hour })),
  };
}

export function HospitalProfileClient({
  initialProfile,
}: {
  initialProfile: HospitalProfileRecord;
}) {
  const [profile, setProfile] = useState(() => cloneProfile(initialProfile));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialProfile),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const isDirty = JSON.stringify(profile) !== savedSnapshot;

  useEffect(() => {
    if (!isDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [isDirty]);

  function updateHour(
    weekday: HospitalWeekday,
    update: Partial<HospitalOperatingHourRecord>,
  ) {
    setProfile((current) => ({
      ...current,
      operatingHours: current.operatingHours.map((hour) =>
        hour.weekday === weekday ? { ...hour, ...update } : hour,
      ),
    }));
  }

  async function uploadProfileImage(file: File) {
    setIsUploading(true);
    setNotice("");
    setError("");
    try {
      const signingResponse = await fetch(
        "/api/settings/hospital-profile/image-upload-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        },
      );
      const signingResult = (await signingResponse.json()) as {
        uploadUrl?: string;
        image?: HospitalProfileImage;
        error?: string;
      };
      if (
        !signingResponse.ok ||
        !signingResult.uploadUrl ||
        !signingResult.image
      ) {
        throw new Error(
          signingResult.error ?? "이미지 업로드를 준비하지 못했습니다.",
        );
      }
      const uploadResponse = await fetch(signingResult.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("병원 프로필 이미지를 업로드하지 못했습니다.");
      }
      setProfile((current) => ({
        ...current,
        profileImage: signingResult.image!,
      }));
      setNotice("이미지를 업로드했습니다. 저장 버튼을 눌러 반영해 주세요.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "병원 프로필 이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function saveProfile() {
    setIsSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/settings/hospital-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = (await response.json()) as {
        profile?: HospitalProfileRecord;
        error?: string;
      };
      if (!response.ok || !result.profile) {
        throw new Error(result.error ?? "병원 프로필을 저장하지 못했습니다.");
      }
      const nextProfile = cloneProfile(result.profile);
      setProfile(nextProfile);
      setSavedSnapshot(JSON.stringify(nextProfile));
      setNotice("병원 프로필을 저장했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "병원 프로필을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-[1180px] bg-[#f3f7fd]">
      <HospitalSettingsSidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center border-b border-[#dfe4ec] bg-white px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-[#30374a]">
                병원프로필
              </h1>
              <p className="mt-0.5 text-[11px] text-[#9299a9]">
                고객에게 공개되는 병원 정보와 운영시간을 관리합니다.
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[1100px] space-y-6">
            {notice || error ? (
              <div
                role="status"
                className={`rounded-xl px-4 py-3 text-sm ${
                  error
                    ? "bg-[#fff0f2] text-[#c64558]"
                    : "bg-[#edf8f2] text-[#34805b]"
                }`}
              >
                {error || notice}
              </div>
            ) : null}

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.03)]">
              <div>
                <h2 className="text-base font-extrabold text-[#3b4357]">
                  병원프로필
                </h2>
                <p className="mt-1 text-xs text-[#979ead]">
                  병원 브랜드를 알릴 수 있는 대표 정보와 이미지를 설정해 주세요.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-[240px_1fr] gap-8">
                <div>
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-[#ccd3df] bg-[#f8f9fc]">
                    {profile.profileImage ? (
                      <>
                        <Image
                          src={profile.profileImage.publicUrl}
                          alt={`${profile.name} 병원 프로필`}
                          fill
                          loading="eager"
                          sizes="240px"
                          className="object-contain p-4"
                        />
                        <button
                          type="button"
                          aria-label="병원 프로필 이미지 제거"
                          onClick={() =>
                            setProfile((current) => ({
                              ...current,
                              profileImage: null,
                            }))
                          }
                          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/65 text-white"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    ) : (
                      <label className="flex h-full cursor-pointer flex-col items-center justify-center text-[#969dac] hover:bg-[#f0f3f8]">
                        {isUploading ? (
                          <LoaderCircle className="size-8 animate-spin" />
                        ) : (
                          <ImagePlus className="size-9" />
                        )}
                        <span className="mt-3 text-xs font-bold">
                          프로필 이미지 추가
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          disabled={isUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) void uploadProfileImage(file);
                          }}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                  <p className="mt-2 text-center text-[10px] text-[#969dad]">
                    JPG, PNG, WebP · 최대 10MB
                  </p>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="text-sm font-bold text-[#596175]">
                      병원명 <span className="text-[#df5163]">*</span>
                    </span>
                    <input
                      value={profile.name}
                      maxLength={100}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#dfe3ea] px-4 outline-none focus:border-[#7187f6]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#596175]">
                      소개글
                    </span>
                    <textarea
                      value={profile.introduction}
                      maxLength={1_000}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          introduction: event.target.value,
                        }))
                      }
                      placeholder="병원을 소개하는 문구를 입력해 주세요."
                      className="mt-2 min-h-32 w-full resize-y rounded-xl border border-[#dfe3ea] px-4 py-3 text-sm leading-6 outline-none focus:border-[#7187f6]"
                    />
                    <span className="mt-1 block text-right text-[10px] text-[#969dad]">
                      {profile.introduction.length.toLocaleString("ko-KR")} /
                      1,000
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.03)]">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
                  <Clock3 className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#3b4357]">
                    병원운영시간
                  </h2>
                  <p className="mt-1 text-xs text-[#979ead]">
                    고객이 내원 전 참고할 수 있도록 진료시간을 설정해 주세요.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-[1fr_1fr] gap-10">
                <div>
                  <h3 className="text-sm font-bold text-[#596175]">
                    운영시간 설정 <span className="text-[#df5163]">*</span>
                  </h3>
                  <div className="mt-4 space-y-2.5">
                    {profile.operatingHours.map((hour) => (
                      <div
                        key={hour.weekday}
                        className="grid grid-cols-[80px_1fr] items-center gap-4"
                      >
                        <label className="flex items-center gap-2 text-sm font-bold text-[#596175]">
                          <input
                            type="checkbox"
                            checked={hour.isOpen}
                            onChange={(event) =>
                              updateHour(hour.weekday, {
                                isOpen: event.target.checked,
                              })
                            }
                            className="size-4 accent-[#3157f6]"
                          />
                          {weekdayLabels[hour.weekday]}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            step={300}
                            disabled={!hour.isOpen}
                            value={minutesToTime(hour.openMinutes)}
                            onChange={(event) =>
                              updateHour(hour.weekday, {
                                openMinutes: timeToMinutes(event.target.value),
                              })
                            }
                            className="h-10 min-w-0 flex-1 rounded-xl border border-[#dfe3ea] px-3 disabled:bg-[#f2f3f5] disabled:text-[#adb2bc]"
                          />
                          <span className="text-[#9ca2af]">~</span>
                          <input
                            type="time"
                            step={300}
                            disabled={!hour.isOpen}
                            value={minutesToTime(hour.closeMinutes)}
                            onChange={(event) =>
                              updateHour(hour.weekday, {
                                closeMinutes: timeToMinutes(event.target.value),
                              })
                            }
                            className="h-10 min-w-0 flex-1 rounded-xl border border-[#dfe3ea] px-3 disabled:bg-[#f2f3f5] disabled:text-[#adb2bc]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-[#596175]">
                    참고사항
                  </span>
                  <textarea
                    value={profile.operatingNotes}
                    maxLength={5_000}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        operatingNotes: event.target.value,
                      }))
                    }
                    placeholder={`예) 점심시간 13:00~14:00\n매주 일요일과 공휴일은 휴진입니다.`}
                    className="mt-3 min-h-[310px] w-full resize-y rounded-xl border border-[#dfe3ea] px-4 py-3 text-sm leading-7 outline-none focus:border-[#7187f6]"
                  />
                  <span className="mt-1 block text-right text-[10px] text-[#969dad]">
                    {profile.operatingNotes.length.toLocaleString("ko-KR")} /
                    5,000
                  </span>
                </label>
              </div>
            </section>
          </div>
        </main>

        <footer className="flex h-[72px] shrink-0 items-center justify-end border-t border-[#dfe4ec] bg-white px-8">
          <button
            type="button"
            disabled={!isDirty || isSaving || isUploading}
            onClick={() => void saveProfile()}
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
