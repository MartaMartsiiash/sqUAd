import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PlayerPublic } from "../api/client";
import { useAuth } from "../auth/auth";

export function Logo({ size = "text-4xl" }: { size?: string }) {
  return (
    <span className={`${size} font-black tracking-tight`}>
      sq
      <span className="bg-gradient-to-b from-blue from-50% to-yellow to-50% bg-clip-text text-transparent">UA</span>
      d
    </span>
  );
}

export function Header() {
  const { account, signOut } = useAuth();
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-4">
      <Link to="/" aria-label="На головну">
        <Logo size="text-2xl" />
      </Link>
      {account && (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="max-w-[11rem] truncate" title={account.email}>
            {account.email}
          </span>
          <button className="rounded-xl px-2 py-1 text-slate-400 hover:text-white" onClick={signOut}>
            Вийти
          </button>
        </div>
      )}
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}

export function Avatar({ p, size = "h-10 w-10 text-xl" }: { p: PlayerPublic; size?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${size}`}
      style={{ background: `${p.color}33`, boxShadow: `inset 0 0 0 2px ${p.color}` }}
    >
      {p.emoji}
    </span>
  );
}

export function PlayerChip({ p, me, extra }: { p: PlayerPublic; me?: boolean; extra?: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-ink/50 px-3 py-2 ${p.online ? "" : "opacity-50"}`}>
      <Avatar p={p} size="h-8 w-8 text-base" />
      <span className="truncate font-semibold">
        {p.name}
        {me && <span className="text-slate-400"> (ви)</span>}
      </span>
      {p.is_host && <span title="Ведучий">👑</span>}
      {extra}
    </div>
  );
}

/** Seconds left until `deadline` (server clock), ticking every 250 ms. */
export function useCountdown(deadline: number | undefined, offset: number) {
  const [now, setNow] = useState(() => Date.now() / 1000 + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000 + offset), 250);
    return () => clearInterval(id);
  }, [offset]);
  if (!deadline) return null;
  return Math.max(0, Math.ceil(deadline - now));
}

export function Timer({ deadline, offset }: { deadline?: number; offset: number }) {
  const left = useCountdown(deadline, offset);
  if (left === null) return null;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const urgent = left <= 10;
  return (
    <span
      className={`rounded-full px-3 py-1 font-mono text-lg font-bold tabular-nums ${
        urgent ? "bg-red-500/20 text-red-300" : "bg-ink/60 text-slate-200"
      }`}
    >
      ⏱ {mm}:{ss}
    </span>
  );
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="mt-3 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-200">{text}</p>;
}

export function Waiting({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ink/50 px-4 py-3 text-slate-300">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow" />
      {children}
    </div>
  );
}
