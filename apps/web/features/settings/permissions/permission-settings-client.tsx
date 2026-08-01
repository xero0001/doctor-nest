"use client";

import {
  BookOpenText,
  Bot,
  Check,
  CircleHelp,
  ClipboardList,
  LoaderCircle,
  Megaphone,
  MessageCircleMore,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { HospitalSettingsSidebar } from "@/features/settings/components/hospital-settings-sidebar";
import {
  AccessProfileRecord,
  permissionGroups,
  PermissionKey,
} from "@/features/settings/permissions/permission-config";

const groupIcons = {
  CUSTOMER_CHAT: MessageCircleMore,
  CUSTOMER_RECORDS: ClipboardList,
  AUTOMATIONS: Workflow,
  MARKETING: Megaphone,
  MANUALS: BookOpenText,
  CONTENT: Sparkles,
  MEDIPAL_AI: Bot,
  HOSPITAL_SETTINGS: Settings,
} as const;

function permissionSnapshot(permissions: PermissionKey[]) {
  return [...permissions].sort().join("|");
}

export function PermissionSettingsClient({
  initialProfiles,
  masterAccount,
}: {
  initialProfiles: AccessProfileRecord[];
  masterAccount: { name: string; username: string };
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedId, setSelectedId] = useState(
    initialProfiles.find((profile) => profile.key === "MASTER")?.id ??
      initialProfiles[0]?.id ??
      "",
  );
  const [draftPermissions, setDraftPermissions] = useState<PermissionKey[]>(
    initialProfiles.find((profile) => profile.key === "MASTER")?.permissions ??
      initialProfiles[0]?.permissions ??
      [],
  );
  const [pendingProfileId, setPendingProfileId] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId),
    [profiles, selectedId],
  );
  const isDirty = Boolean(
    selectedProfile &&
    !selectedProfile.isLocked &&
    permissionSnapshot(draftPermissions) !==
      permissionSnapshot(selectedProfile.permissions),
  );

  useEffect(() => {
    if (!isDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [isDirty]);

  function selectProfile(profileId: string, force = false) {
    if (profileId === selectedId) return;
    if (isDirty && !force) {
      setPendingProfileId(profileId);
      return;
    }
    const nextProfile = profiles.find((profile) => profile.id === profileId);
    if (!nextProfile) return;
    setSelectedId(nextProfile.id);
    setDraftPermissions(nextProfile.permissions);
    setPendingProfileId("");
    setNotice("");
    setError("");
  }

  function togglePermission(permission: PermissionKey) {
    if (!selectedProfile || selectedProfile.isLocked) return;
    setNotice("");
    setError("");
    setDraftPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  async function savePermissions() {
    if (!selectedProfile || selectedProfile.isLocked || !isDirty) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/settings/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          permissions: draftPermissions,
        }),
      });
      const result = (await response.json()) as {
        profiles?: AccessProfileRecord[];
        error?: string;
      };
      if (!response.ok || !result.profiles) {
        throw new Error(result.error ?? "권한을 저장하지 못했습니다.");
      }
      setProfiles(result.profiles);
      const savedProfile = result.profiles.find(
        (profile) => profile.id === selectedProfile.id,
      );
      setDraftPermissions(savedProfile?.permissions ?? draftPermissions);
      setNotice(`${selectedProfile.name} 권한을 저장했습니다.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "권한을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-[1180px] bg-[#f3f7fd]">
      <HospitalSettingsSidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#dfe4ec] bg-white px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-[#30374a]">
                권한설정
              </h1>
              <p className="mt-0.5 text-xs text-[#9299a9]">
                역할에 따라 서비스 접근 범위를 설정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!isDirty || saving}
            onClick={() => void savePermissions()}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-[#c5ccdc]"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : isDirty ? (
              <Save className="size-4" />
            ) : (
              <Check className="size-4" />
            )}
            {saving ? "저장 중" : isDirty ? "저장" : "저장됨"}
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[1120px] pb-10">
            <div className="mb-6 flex items-center justify-between gap-6 rounded-2xl border border-[#dbe3ff] bg-[#f7f9ff] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3157f6] text-white">
                  <UserRoundCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#3157f6]">
                    현재 접속 계정 · 마스터
                  </p>
                  <p className="mt-0.5 truncate text-sm font-extrabold text-[#30374a]">
                    {masterAccount.name}
                    {masterAccount.username
                      ? ` (@${masterAccount.username})`
                      : ""}
                  </p>
                </div>
              </div>
              <p className="max-w-[440px] text-right text-xs leading-5 text-[#788198]">
                마스터는 병원 운영에 필요한 모든 기능에 접근하며 권한을 변경할
                수 없습니다.
              </p>
            </div>

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

            <section aria-labelledby="profile-heading">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <h2
                    id="profile-heading"
                    className="text-lg font-extrabold text-[#30374a]"
                  >
                    권한 프로필
                  </h2>
                  <p className="mt-1 text-sm text-[#9299aa]">
                    수정할 역할을 선택해 접근 가능한 기능을 설정해 주세요.
                  </p>
                </div>
                <p className="text-xs font-bold text-[#8a92a5]">
                  마스터 권한은 수정할 수 없습니다.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {profiles.map((profile) => {
                  const selected = selectedId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => selectProfile(profile.id)}
                      className={`min-h-[112px] rounded-2xl border p-5 text-left transition-all ${
                        selected
                          ? "border-[#5b76f7] bg-[#eaf3ff] shadow-[0_6px_18px_rgba(49,87,246,0.10)]"
                          : "border-[#dfe4ec] bg-white hover:border-[#aebcf9] hover:bg-[#fafbff]"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-base font-extrabold text-[#374055]">
                          {profile.name}
                        </span>
                        {selected ? (
                          <Check className="size-5 text-[#3157f6]" />
                        ) : null}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-[#858da0]">
                        {profile.description}
                      </span>
                      {profile.userCount > 0 ? (
                        <span className="mt-2 block text-xs font-bold text-[#68738b]">
                          연결 계정 {profile.userCount}개
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-7 overflow-hidden rounded-2xl border border-[#e0e5ed] bg-white shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-center justify-between border-b border-[#e8ebf1] px-6 py-5">
                <div>
                  <h2 className="text-base font-extrabold text-[#30374a]">
                    {selectedProfile?.name ?? "권한"} 접근 범위
                  </h2>
                  <p className="mt-1 text-xs text-[#9299aa]">
                    체크한 기능만 해당 역할의 계정에서 사용할 수 있습니다.
                  </p>
                </div>
                <span className="rounded-full bg-[#f2f5ff] px-3 py-1.5 text-xs font-bold text-[#3157f6]">
                  {draftPermissions.length}개 권한
                </span>
              </div>

              <div className="divide-y divide-[#edf0f4] px-6">
                {permissionGroups.map((group) => {
                  const Icon = groupIcons[group.key];
                  return (
                    <div
                      key={group.key}
                      className="grid grid-cols-[190px_1fr] gap-6 py-5"
                    >
                      <div className="flex items-start gap-3 pt-1">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f3f5fa] text-[#697187]">
                          <Icon className="size-4.5" />
                        </span>
                        <span className="pt-2 text-sm font-extrabold text-[#3d465a]">
                          {group.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-x-5 gap-y-3">
                        {group.permissions.map((permission) => {
                          const checked = draftPermissions.includes(
                            permission.key,
                          );
                          return (
                            <label
                              key={permission.key}
                              className={`flex min-h-10 items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                                selectedProfile?.isLocked
                                  ? "cursor-default text-[#8f96a6]"
                                  : "cursor-pointer text-[#566076] hover:bg-[#f7f8fb]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={selectedProfile?.isLocked}
                                onChange={() =>
                                  togglePermission(permission.key)
                                }
                                className="size-4 rounded border-[#c8ceda] accent-[#3157f6]"
                              />
                              <span className="font-bold">
                                {permission.label}
                              </span>
                              <span
                                title={permission.description}
                                aria-label={permission.description}
                                className="text-[#a1a7b4]"
                              >
                                <CircleHelp className="size-3.5" />
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </section>

      <UnsavedChangesDialog
        open={Boolean(pendingProfileId)}
        title="변경사항을 저장하지 않을까요?"
        description="다른 권한 프로필로 이동하면 현재 변경한 접근 범위가 사라집니다."
        confirmLabel="저장하지 않고 이동"
        cancelLabel="계속 편집"
        onCancel={() => setPendingProfileId("")}
        onConfirm={() => selectProfile(pendingProfileId, true)}
      />
    </div>
  );
}
