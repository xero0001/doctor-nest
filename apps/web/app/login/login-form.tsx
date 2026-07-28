"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "로그인에 실패했습니다.");
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitLogin} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-[#5e667c]">
          아이디
        </span>
        <span className="flex h-12 items-center gap-3 rounded-xl border border-[#dde2ee] bg-white px-4 focus-within:border-[#6d7ef3] focus-within:ring-4 focus-within:ring-[#3157f6]/10">
          <UserRound className="size-4 text-[#9299ac]" />
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="아이디"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-[#5e667c]">
          비밀번호
        </span>
        <span className="flex h-12 items-center gap-3 rounded-xl border border-[#dde2ee] bg-white px-4 focus-within:border-[#6d7ef3] focus-within:ring-4 focus-within:ring-[#3157f6]/10">
          <LockKeyhole className="size-4 text-[#9299ac]" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="비밀번호"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            className="text-[#9299ac] hover:text-[#59617a]"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-[#fff0f2] px-4 py-3 text-xs font-medium text-[#d8465b]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3157f6] to-[#6657e9] text-sm font-bold text-white shadow-[0_12px_26px_rgba(49,87,246,0.24)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
      >
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
        로그인
        {!isSubmitting ? <ArrowRight className="size-4" /> : null}
      </button>
    </form>
  );
}
