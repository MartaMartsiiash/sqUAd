import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PlayerPublic } from "../api/client";
import { useAuth } from "../auth/auth";

/** The wordmark: "squad" with UA set apart in red. */
export function Logo({ className = "text-xl", glossy = false }: { className?: string; glossy?: boolean }) {
  return (
    <span className={`font-display font-extrabold lowercase tracking-tight ${className}`}>
      sq{glossy ? <ScriptUA /> : <span className="text-red uppercase">UA</span>}
      <span className="relative z-0">d</span>
    </span>
  );
}

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#070707" : "#cfcfcf");
    try {
      localStorage.setItem("squad:theme", theme);
    } catch {
      /* private mode */
    }
  }, [theme]);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setTheme(next)}
      className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted transition hover:text-fg"
      aria-label={next === "light" ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" fill="currentColor" />
      </svg>
      {theme === "dark" ? "dark" : "light"}
    </button>
  );
}

export function Header() {
  const { account, signOut } = useAuth();
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 pt-5 lg:px-8">
      <Link to="/" aria-label="На головну">
        <Logo className="text-2xl" />
      </Link>
      <div className="flex min-w-0 items-center gap-3">
        {account && (
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="label truncate normal-case tracking-normal" title={account.email}>
              {account.email}
            </span>
          </div>
        )}
        {account && (
          <button className="label hover:text-fg" onClick={signOut}>
            Вийти
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-x-clip">
      {/* Chrome loops in the margins: only on wide screens, where there is room for them. */}
      <ChromeSquiggle variant={1} className="pointer-events-none fixed -left-8 bottom-10 hidden w-44 -rotate-12 opacity-90 xl:block" />
      <ChromeSquiggle variant={2} className="pointer-events-none fixed right-4 top-28 hidden w-32 rotate-[25deg] opacity-90 xl:block" />
      <Header />
      <main className={`relative mx-auto w-full flex-1 px-5 pb-20 pt-6 ${wide ? "max-w-5xl lg:px-8" : "max-w-xl"}`}>
        {children}
      </main>
    </div>
  );
}

/** A player's monogram: first letter of the name on the player's colour. */
export function Avatar({ p, size = "h-10 w-10 text-base" }: { p: PlayerPublic; size?: string }) {
  const letter = Array.from(p.name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-extrabold text-[#0a0a0a] ${size}`}
      style={{ background: p.color }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function PlayerChip({ p, me, extra }: { p: PlayerPublic; me?: boolean; extra?: ReactNode }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-line bg-bg/40 py-1 pl-1 pr-3 ${
        p.online ? "" : "opacity-45"
      }`}
    >
      <Avatar p={p} size="h-8 w-8 text-sm" />
      <span className="truncate font-semibold">{p.name}</span>
      {me && <span className="label">ви</span>}
      {p.is_host && <span className="label text-red">host</span>}
      {extra}
    </div>
  );
}

/** Seconds left until `deadline` (server clock), ticking four times a second. */
export function useCountdown(deadline: number | undefined | null, offset: number) {
  const [now, setNow] = useState(() => Date.now() / 1000 + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000 + offset), 250);
    return () => clearInterval(id);
  }, [offset]);
  if (!deadline) return null;
  return Math.max(0, Math.ceil(deadline - now));
}

export function Timer({ deadline, offset }: { deadline?: number | null; offset: number }) {
  const left = useCountdown(deadline, offset);
  if (left === null) return null;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span
      className={`rounded-full border px-3 py-1 font-mono text-base font-semibold tabular-nums ${
        left <= 10 ? "border-red bg-red/15 text-red" : "border-line text-fg"
      }`}
    >
      {mm}:{ss}
    </span>
  );
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="mt-3 rounded-2xl border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">{text}</p>;
}

export function Waiting({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-bg/40 px-4 py-3 text-muted">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red" />
      <span>{children}</span>
    </div>
  );
}

/** 01, 02, 03... as in an editorial layout. */
export function Num({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{String(n).padStart(2, "0")}</span>;
}

/** A liquid-chrome shape drawn in SVG: grey bands like reflections, and a red reflection. */
export function ChromeBlob({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <defs>
        <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.18" stopColor="#8e8e8e" />
          <stop offset="0.32" stopColor="#1a1a1a" />
          <stop offset="0.46" stopColor="#e9e9e9" />
          <stop offset="0.6" stopColor="#5a5a5a" />
          <stop offset="0.74" stopColor="#0d0d0d" />
          <stop offset="0.88" stopColor="#bdbdbd" />
          <stop offset="1" stopColor="#3a3a3a" />
        </linearGradient>
        <radialGradient id="redglint" cx="0.7" cy="0.75" r="0.45">
          <stop offset="0" stopColor="#a5102e" stopOpacity="0.9" />
          <stop offset="1" stopColor="#a5102e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="shine" cx="0.32" cy="0.25" r="0.3">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <path
        d="M197 38c58-6 120 18 146 70 25 50-6 92 9 142 14 47-14 101-70 113-52 11-82-26-130-20-51 7-96-12-110-58-14-45 22-74 18-120-4-44-24-86 12-111 35-25 70-11 125-16z"
        fill="url(#chrome)"
        filter="url(#soft)"
      />
      <path
        d="M197 38c58-6 120 18 146 70 25 50-6 92 9 142 14 47-14 101-70 113-52 11-82-26-130-20-51 7-96-12-110-58-14-45 22-74 18-120-4-44-24-86 12-111 35-25 70-11 125-16z"
        fill="url(#redglint)"
      />
      <path
        d="M197 38c58-6 120 18 146 70 25 50-6 92 9 142 14 47-14 101-70 113-52 11-82-26-130-20-51 7-96-12-110-58-14-45 22-74 18-120-4-44-24-86 12-111 35-25 70-11 125-16z"
        fill="url(#shine)"
      />
      <path
        d="M140 120c30-30 90-36 120-8 22 20 10 52-14 58-30 8-46-22-76-12-26 8-50-16-30-38z"
        fill="#050505"
        opacity="0.55"
        filter="url(#soft)"
      />
    </svg>
  );
}

/**
 * "UA" in a cherry-red script that looks like a thick tube of glass: a dark
 * outline and shadow underneath, the gradient body, and a thin light line on top.
 */
export function ScriptUA() {
  const text = (
    <text x="14" y="168" fontFamily="Yellowtail, cursive" fontSize="200" style={{ textTransform: "none" }}>
      UA
    </text>
  );
  return (
    <svg
      viewBox="0 0 285 215"
      className="relative z-10 -ml-[0.08em] -mr-[0.14em] inline-block h-[1.3em] w-auto -translate-y-[0.08em] -rotate-[6deg] align-middle"
      role="img"
      aria-label="UA"
      overflow="visible"
    >
      <defs>
        <linearGradient id="ua-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8304d" />
          <stop offset="0.4" stopColor="#9c0f2c" />
          <stop offset="0.75" stopColor="#6a061a" />
          <stop offset="1" stopColor="#3d030d" />
        </linearGradient>
        <filter id="ua-soft">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id="ua-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>
      <g strokeLinejoin="round" strokeLinecap="round">
        <g fill="#3a020c" stroke="#3a020c" strokeWidth="16" filter="url(#ua-shadow)">{text}</g>
        <g fill="url(#ua-body)" stroke="url(#ua-body)" strokeWidth="11">{text}</g>
        <g fill="none" stroke="#ffd6dd" strokeOpacity="0.5" strokeWidth="3" filter="url(#ua-soft)" transform="translate(-1.5 -3)">
          {text}
        </g>
      </g>
    </svg>
  );
}

/** A loop of liquid chrome, the small decorative element from the references. */
const SQUIGGLES = [
  "M40 150 C 40 60, 150 40, 170 100 C 190 160, 110 190, 100 140 C 90 90, 200 60, 250 110 C 290 150, 260 200, 220 190",
  "M60 60 C 140 20, 200 80, 150 120 C 100 160, 60 120, 110 90 C 170 55, 260 120, 220 180 C 200 205, 150 200, 160 170",
  "M30 120 C 70 40, 130 60, 120 110 C 110 160, 170 190, 210 140 C 240 100, 200 50, 170 80 C 150 100, 200 150, 270 120",
];

export function ChromeSquiggle({ className = "", variant = 0 }: { className?: string; variant?: number }) {
  const d = SQUIGGLES[variant % SQUIGGLES.length];
  return (
    <svg viewBox="0 0 300 230" className={className} aria-hidden>
      <defs>
        <linearGradient id="sq-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fafafa" />
          <stop offset="0.25" stopColor="#6d6d6d" />
          <stop offset="0.45" stopColor="#f0f0f0" />
          <stop offset="0.6" stopColor="#1c1c1c" />
          <stop offset="0.8" stopColor="#d9d9d9" />
          <stop offset="1" stopColor="#4a4a4a" />
        </linearGradient>
        <filter id="sq-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <path d={d} fill="none" stroke="#2a2a2a" strokeWidth="30" strokeLinecap="round" filter="url(#sq-shadow)" />
      <path d={d} fill="none" stroke="url(#sq-chrome)" strokeWidth="26" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" transform="translate(-4 -6)" />
      <path d={d} fill="none" stroke="#8f0b27" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" transform="translate(5 7)" />
    </svg>
  );
}
