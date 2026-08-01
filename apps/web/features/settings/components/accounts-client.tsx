"use client";

import {
  Check,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { HospitalSettingsSidebar } from "@/features/settings/components/hospital-settings-sidebar";
import type {
  AccountRole,
  ChannelAssignee,
  ManagedAccount,
} from "@/features/settings/types/accounts";

type AccountDraft = {
  id: string;
  name: string;
  username: string;
  password: string;
  jobTitle: string;
  role: AccountRole;
  isDefaultAssignee: boolean;
};

const emptyDraft: AccountDraft = {
  id: "",
  name: "",
  username: "",
  password: "",
  jobTitle: "직원",
  role: "AGENT",
  isDefaultAssignee: false,
};

const channelStyles: Record<string, { label: string; className: string }> = {
  KAKAO: { label: "K", className: "bg-[#fee500] text-[#332b00]" },
  NAVER_TALK: { label: "N", className: "bg-[#03c75a] text-white" },
  LINE: { label: "L", className: "bg-[#06c755] text-white" },
  WECHAT: { label: "W", className: "bg-[#18b96b] text-white" },
  WHATSAPP: { label: "W", className: "bg-[#25d366] text-white" },
  INSTAGRAM: { label: "I", className: "bg-[#d946ef] text-white" },
};

function accountToDraft(account: ManagedAccount): AccountDraft {
  return { ...account, password: "" };
}

export function AccountsClient({
  initialAccounts,
  channels,
  currentRole,
  canManage,
  maxAccounts,
}: {
  initialAccounts: ManagedAccount[];
  channels: ChannelAssignee[];
  currentRole: AccountRole;
  canManage: boolean;
  maxAccounts: number;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [channelAssignees, setChannelAssignees] = useState(channels);
  const [draft, setDraft] = useState<AccountDraft>(emptyDraft);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [pendingChannel, setPendingChannel] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const atAccountLimit = accounts.length >= maxAccounts;

  function openCreateDialog() {
    setDraft(emptyDraft);
    setDeleteConfirm(false);
    setError("");
    setDialogMode("create");
  }

  function openEditDialog(account: ManagedAccount) {
    setDraft(accountToDraft(account));
    setDeleteConfirm(false);
    setError("");
    setDialogMode("edit");
  }

  function closeDialog() {
    if (!pendingId) setDialogMode(null);
  }

  async function saveAccount(event: FormEvent) {
    event.preventDefault();
    const creating = dialogMode === "create";
    setPendingId(draft.id || "NEW");
    setError("");
    try {
      const response = await fetch("/api/settings/accounts", {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as {
        accounts?: ManagedAccount[];
        error?: string;
      };
      if (!response.ok || !result.accounts) {
        throw new Error(result.error ?? "계정을 저장하지 못했습니다.");
      }
      setAccounts(result.accounts);
      setNotice(creating ? "새 계정을 추가했습니다." : "계정을 수정했습니다.");
      setDialogMode(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "계정을 저장하지 못했습니다.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function updateAccount(
    account: ManagedAccount,
    changes: Partial<Pick<ManagedAccount, "role" | "isDefaultAssignee">>,
  ) {
    setPendingId(account.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/settings/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...account, ...changes, password: "" }),
      });
      const result = (await response.json()) as {
        accounts?: ManagedAccount[];
        error?: string;
      };
      if (!response.ok || !result.accounts) {
        throw new Error(result.error ?? "계정을 수정하지 못했습니다.");
      }
      setAccounts(result.accounts);
      setNotice("계정 설정을 변경했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "계정을 수정하지 못했습니다.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function deleteAccount() {
    if (!draft.id) return;
    setPendingId(draft.id);
    setError("");
    try {
      const response = await fetch("/api/settings/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id }),
      });
      const result = (await response.json()) as {
        accounts?: ManagedAccount[];
        error?: string;
      };
      if (!response.ok || !result.accounts) {
        throw new Error(result.error ?? "계정을 삭제하지 못했습니다.");
      }
      setAccounts(result.accounts);
      setChannelAssignees((current) =>
        current.map((channel) =>
          channel.userId === draft.id ? { ...channel, userId: null } : channel,
        ),
      );
      setDialogMode(null);
      setNotice("계정을 삭제했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "계정을 삭제하지 못했습니다.",
      );
    } finally {
      setPendingId("");
      setDeleteConfirm(false);
    }
  }

  async function saveChannelAssignee(channel: ChannelAssignee) {
    setPendingChannel(channel.channel);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/settings/accounts/channel-assignees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: channel.channel,
          userId: channel.userId,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "채널 상담사를 지정하지 못했습니다.");
      }
      setNotice("채널 상담사를 지정했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "채널 상담사를 지정하지 못했습니다.",
      );
    } finally {
      setPendingChannel("");
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-[1180px] bg-[#f3f7fd]">
      <HospitalSettingsSidebar />
      <section className="min-w-0 flex-1 overflow-y-auto">
        <header className="flex h-[72px] items-center justify-between border-b border-[#dfe4ec] bg-white px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
              <UsersRound className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-[#30374a]">
                전체계정
              </h1>
              <p className="mt-0.5 text-xs text-[#9299a9]">
                병원에서 사용하는 계정과 상담 배정을 관리합니다.
              </p>
            </div>
          </div>
          <span className="rounded-lg bg-[#eef2ff] px-3 py-1.5 text-xs font-bold text-[#3157f6]">
            {accounts.length} / {maxAccounts} 계정
          </span>
        </header>

        <main className="mx-auto max-w-[1120px] space-y-6 px-9 py-8">
          {notice || error ? (
            <div
              role={error ? "alert" : "status"}
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                error
                  ? "bg-[#fff0f2] text-[#c64558]"
                  : "bg-[#edf8f2] text-[#34805b]"
              }`}
            >
              {error || notice}
            </div>
          ) : null}

          <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
            <div className="flex items-center justify-between gap-8">
              <div>
                <h2 className="text-lg font-extrabold text-[#30374a]">
                  계정 추가
                </h2>
                <p className="mt-1 text-sm text-[#9299aa]">
                  상담에 참여할 직원을 추가하고 로그인 정보를 발급합니다.
                </p>
              </div>
              <button
                type="button"
                disabled={!canManage || atAccountLimit}
                onClick={openCreateDialog}
                className="flex h-11 items-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b7c0dd]"
              >
                <Plus className="size-4" /> 계정 추가
              </button>
            </div>
            {atAccountLimit ? (
              <p className="mt-5 rounded-xl bg-[#f7f8fb] px-4 py-3 text-sm text-[#697187]">
                최대 계정 수에 도달했습니다. 사용하지 않는 계정을 삭제한 뒤 다시
                시도해 주세요.
              </p>
            ) : !canManage ? (
              <p className="mt-5 rounded-xl bg-[#f7f8fb] px-4 py-3 text-sm text-[#697187]">
                계정 추가와 수정은 마스터 또는 관리자만 할 수 있습니다.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
            <h2 className="text-lg font-extrabold text-[#30374a]">계정목록</h2>
            <p className="mt-1 text-sm text-[#9299aa]">
              기본 상담사는 채널 상담사가 없을 때 신규 상담에 자동 배정됩니다.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-[#e2e6ed]">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-[#f5f7fc] text-xs font-bold text-[#61697d]">
                  <tr>
                    <th className="w-[15%] px-4 py-3">직급/직책</th>
                    <th className="w-[18%] px-4 py-3">이름</th>
                    <th className="w-[20%] px-4 py-3">아이디</th>
                    <th className="w-[18%] px-4 py-3">권한</th>
                    <th className="w-[18%] px-4 py-3">기본 상담사</th>
                    <th className="w-[11%] px-4 py-3 text-center">수정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8ebf1]">
                  {accounts.map((account) => {
                    const accountPending = pendingId === account.id;
                    const adminCannotManage =
                      currentRole === "ADMIN" && account.role !== "AGENT";
                    const disabled =
                      !canManage || accountPending || adminCannotManage;
                    return (
                      <tr key={account.id} className="text-[#434b60]">
                        <td className="px-4 py-3 font-medium">
                          {account.jobTitle}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-full bg-[#eef2ff] text-[#3157f6]">
                              <UserRound className="size-3.5" />
                            </span>
                            <span className="truncate font-bold">
                              {account.name}
                            </span>
                            {account.isCurrentUser ? (
                              <span className="rounded bg-[#edf8f2] px-1.5 py-0.5 text-xs font-bold text-[#34805b]">
                                나
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="truncate px-4 py-3 text-[#697187]">
                          {account.username}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`${account.name} 권한`}
                            value={account.role}
                            disabled={disabled}
                            onChange={(event) =>
                              void updateAccount(account, {
                                role: event.target.value as AccountRole,
                              })
                            }
                            className="h-9 w-full rounded-lg border border-[#dfe3ea] bg-white px-2 text-sm outline-none disabled:bg-[#f5f6f8]"
                          >
                            {currentRole === "OWNER" ? (
                              <option value="OWNER">마스터</option>
                            ) : null}
                            <option value="ADMIN">관리자</option>
                            <option value="AGENT">상담사</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 font-medium">
                            <input
                              type="checkbox"
                              checked={account.isDefaultAssignee}
                              disabled={disabled}
                              onChange={(event) =>
                                void updateAccount(account, {
                                  isDefaultAssignee: event.target.checked,
                                })
                              }
                              className="size-4 accent-[#3157f6]"
                            />
                            지정
                          </label>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            aria-label={`${account.name} 계정 수정`}
                            disabled={disabled}
                            onClick={() => openEditDialog(account)}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-[#dfe3ea] text-[#697187] hover:bg-[#f7f8fb] disabled:text-[#c7cbd4]"
                          >
                            {accountPending ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Pencil className="size-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
            <h2 className="text-lg font-extrabold text-[#30374a]">
              채널별 상담사 지정
            </h2>
            <p className="mt-1 text-sm text-[#9299aa]">
              신규 상담에 자동으로 배정할 상담사를 채널별로 지정합니다.
            </p>
            {channelAssignees.length ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-[#e2e6ed]">
                <div className="grid grid-cols-[1.2fr_1fr_100px] bg-[#f5f7fc] px-4 py-3 text-xs font-bold text-[#61697d]">
                  <span>채널</span>
                  <span>상담사</span>
                  <span className="text-center">설정</span>
                </div>
                <ul className="divide-y divide-[#e8ebf1]">
                  {channelAssignees.map((channel) => {
                    const style = channelStyles[channel.channel] ?? {
                      label: "C",
                      className: "bg-[#8992a8] text-white",
                    };
                    return (
                      <li
                        key={channel.channel}
                        className="grid grid-cols-[1.2fr_1fr_100px] items-center px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${style.className}`}
                          >
                            {style.label}
                          </span>
                          <span className="truncate text-sm font-bold text-[#434b60]">
                            {channel.displayName}
                          </span>
                        </div>
                        <select
                          aria-label={`${channel.displayName} 상담사`}
                          value={channel.userId ?? ""}
                          disabled={
                            !canManage || pendingChannel === channel.channel
                          }
                          onChange={(event) =>
                            setChannelAssignees((current) =>
                              current.map((item) =>
                                item.channel === channel.channel
                                  ? {
                                      ...item,
                                      userId: event.target.value || null,
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="mr-4 h-9 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm outline-none disabled:bg-[#f5f6f8]"
                        >
                          <option value="">기본 상담사 사용</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} · {account.jobTitle}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={
                            !canManage || pendingChannel === channel.channel
                          }
                          onClick={() => void saveChannelAssignee(channel)}
                          className="mx-auto flex h-9 items-center gap-1.5 rounded-lg bg-[#3157f6] px-4 text-xs font-bold text-white disabled:bg-[#b7c0dd]"
                        >
                          {pendingChannel === channel.channel ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          설정
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[#dce1eb] bg-[#fafbfc] px-5 py-10 text-center">
                <p className="text-sm font-bold text-[#697187]">
                  연동 완료된 상담 채널이 없습니다.
                </p>
                <p className="mt-1 text-xs text-[#9299aa]">
                  채널연동에서 상담 채널을 먼저 연결해 주세요.
                </p>
              </div>
            )}
          </section>
        </main>
      </section>

      {dialogMode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18213a]/45 p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
            className="w-full max-w-[540px] rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-[#e7eaf0] px-6 py-5">
              <div>
                <h2
                  id="account-dialog-title"
                  className="text-lg font-extrabold text-[#30374a]"
                >
                  {dialogMode === "create" ? "계정 추가" : "계정 수정"}
                </h2>
                <p className="mt-1 text-xs text-[#9299aa]">
                  {dialogMode === "create"
                    ? "직원이 로그인할 수 있는 계정을 만듭니다."
                    : "계정 정보와 권한을 변경합니다."}
                </p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={closeDialog}
                className="flex size-9 items-center justify-center rounded-lg text-[#778095] hover:bg-[#f5f6f8]"
              >
                <X className="size-5" />
              </button>
            </header>
            <form onSubmit={saveAccount} className="space-y-4 px-6 py-5">
              {error ? (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fff0f2] px-4 py-3 text-sm text-[#c64558]"
                >
                  {error}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <Field label="이름 *">
                  <input
                    required
                    autoFocus
                    maxLength={40}
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-[#dfe3ea] px-3 font-normal outline-none focus:border-[#7187f6]"
                  />
                </Field>
                <Field label="직급/직책 *">
                  <input
                    required
                    maxLength={30}
                    value={draft.jobTitle}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        jobTitle: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-[#dfe3ea] px-3 font-normal outline-none focus:border-[#7187f6]"
                  />
                </Field>
              </div>
              <Field label="로그인 아이디 *">
                <input
                  required
                  minLength={3}
                  maxLength={30}
                  value={draft.username}
                  disabled={dialogMode === "edit"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="영문, 숫자, 마침표, 밑줄, 하이픈"
                  className="h-11 w-full rounded-xl border border-[#dfe3ea] px-3 font-normal outline-none focus:border-[#7187f6] disabled:bg-[#f5f6f8]"
                />
              </Field>
              <Field
                label={
                  dialogMode === "create" ? "임시 비밀번호 *" : "새 비밀번호"
                }
              >
                <div className="flex h-11 items-center rounded-xl border border-[#dfe3ea] px-3 focus-within:border-[#7187f6]">
                  <KeyRound className="mr-2 size-4 text-[#9aa1b0]" />
                  <input
                    type="password"
                    required={dialogMode === "create"}
                    minLength={8}
                    maxLength={72}
                    value={draft.password}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder={
                      dialogMode === "create"
                        ? "8자 이상 입력"
                        : "변경할 때만 입력"
                    }
                    className="min-w-0 flex-1 font-normal outline-none"
                  />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="권한 *">
                  <select
                    value={draft.role}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        role: event.target.value as AccountRole,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-[#dfe3ea] bg-white px-3 font-normal outline-none focus:border-[#7187f6]"
                  >
                    {currentRole === "OWNER" ? (
                      <option value="OWNER">마스터</option>
                    ) : null}
                    <option value="ADMIN">관리자</option>
                    <option value="AGENT">상담사</option>
                  </select>
                </Field>
                <label className="flex items-end pb-3 text-sm font-bold text-[#4d5569]">
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.isDefaultAssignee}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          isDefaultAssignee: event.target.checked,
                        }))
                      }
                      className="size-4 accent-[#3157f6]"
                    />
                    기본 상담사로 지정
                  </span>
                </label>
              </div>
              <footer className="flex items-center justify-between border-t border-[#e7eaf0] pt-5">
                {dialogMode === "edit" ? (
                  deleteConfirm ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(false)}
                        className="h-10 rounded-lg border border-[#dfe3ea] px-3 text-xs font-bold text-[#697187]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAccount()}
                        className="flex h-10 items-center gap-1.5 rounded-lg bg-[#d94758] px-3 text-xs font-bold text-white"
                      >
                        <Trash2 className="size-4" />
                        삭제 확인
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={accounts.some(
                        (account) =>
                          account.id === draft.id && account.isCurrentUser,
                      )}
                      onClick={() => setDeleteConfirm(true)}
                      className="flex h-10 items-center gap-1.5 rounded-lg border border-[#ead8dc] px-3 text-xs font-bold text-[#c64558] disabled:text-[#c7cbd4]"
                    >
                      <Trash2 className="size-4" />
                      계정 삭제
                    </button>
                  )
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="h-10 rounded-lg border border-[#dfe3ea] px-5 text-sm font-bold text-[#697187]"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={Boolean(pendingId)}
                    className="flex h-10 items-center gap-2 rounded-lg bg-[#3157f6] px-5 text-sm font-bold text-white disabled:bg-[#b7c0dd]"
                  >
                    {pendingId ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {dialogMode === "create" ? "추가" : "저장"}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-bold text-[#4d5569]">
      <span>{label}</span>
      {children}
    </label>
  );
}
