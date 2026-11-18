import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PlayerPublic } from "../api/client";
import { useAuth } from "../auth/auth";

/** The wordmark from the brand artwork: a dark and a light version, switched by the theme. */
export function Logo({ className = "h-8" }: { className?: string; glossy?: boolean }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <img src="/brand/logo-dark.webp" alt="sqUAd" className="theme-dark-only h-full w-auto" draggable={false} />
      <img src="/brand/logo-light.webp" alt="sqUAd" className="theme-light-only h-full w-auto" draggable={false} />
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
        <Logo className="h-7 sm:h-8" />
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
      {/* Silver drops in the margins; small on a phone, bigger on a laptop. */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden>
        <Blob n={3} className="float absolute -left-10 bottom-16 w-28 opacity-80 [--r:-12deg] lg:w-56" />
        <Blob n={4} className="float absolute -right-8 top-40 w-20 opacity-80 [--r:20deg] [animation-delay:-3s] lg:right-6 lg:w-40" />
        <img src="/brand/drop.webp" alt="" className="float absolute right-[18%] top-24 w-4 opacity-80 [animation-delay:-5s] lg:w-6" />
        <img src="/brand/drop.webp" alt="" className="float absolute bottom-40 left-[22%] w-3 opacity-70 [animation-delay:-2s] lg:w-5" />
      </div>
      <Header />
      <main className={`relative z-10 mx-auto w-full flex-1 px-5 pb-20 pt-6 ${wide ? "max-w-5xl lg:px-8" : "max-w-xl"}`}>
        {children}
      </main>
    </div>
  );
}

export const AVATAR_COLORS = ["silver", "cherry", "rose", "violet", "gold", "ice", "graphite", "mint"] as const;

/** A player's avatar: a chrome mannequin head in the colour they chose. */
export function Avatar({ p, size = "h-10 w-10" }: { p: Pick<PlayerPublic, "color" | "name">; size?: string }) {
  const color = (AVATAR_COLORS as readonly string[]).includes(p.color) ? p.color : "silver";
  return (
    <span className={`inline-flex shrink-0 items-end justify-center overflow-hidden ${size}`} aria-hidden>
      <img src={`/heads/${color}.webp`} alt="" className="h-full w-auto object-contain" draggable={false} />
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
      <Avatar p={p} size="h-9 w-8" />
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

/** Silver drops from the brand artwork, placed by the caller. */
export function Blob({ n = 1, className = "" }: { n?: 1 | 2 | 3 | 4 | 5; className?: string }) {
  return <img src={`/brand/blob${n}.webp`} alt="" aria-hidden draggable={false} className={`pointer-events-none select-none ${className}`} />;
}

/** The red glitch glare from the brand artwork. */
export function Glare({ className = "" }: { className?: string }) {
  return <img src="/brand/glare.webp" alt="" aria-hidden draggable={false} className={`pointer-events-none select-none ${className}`} />;
}

/**
 * Text drawn as glossy cherry-red tubes, like the room-code artwork: a rounded
 * thin font, stroked thick in layers (dark edge, body, soft light on top).
 */
export function TubeText({ text, className = "" }: { text: string; className?: string }) {
  const w = Math.max(1, text.length) * 118 + 40;
  const glyphs = (
    <text
      x={w / 2}
      y="132"
      textAnchor="middle"
      fontFamily="Quicksand, ui-rounded, sans-serif"
      fontWeight="300"
      fontSize="150"
      letterSpacing="18"
    >
      {text}
    </text>
  );
  return (
    <svg viewBox={`0 0 ${w} 180`} className={className} role="img" aria-label={text}>
      <defs>
        <linearGradient id="tube-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6405b" />
          <stop offset="0.45" stopColor="#a10f2c" />
          <stop offset="1" stopColor="#4d0412" />
        </linearGradient>
        <filter id="tube-blur">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id="tube-glow" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#a10f2c" floodOpacity="0.45" />
        </filter>
      </defs>
      <g strokeLinejoin="round" strokeLinecap="round" style={{ textTransform: "none" }}>
        <g fill="#3d020c" stroke="#3d020c" strokeWidth="26" filter="url(#tube-glow)">{glyphs}</g>
        <g fill="url(#tube-body)" stroke="url(#tube-body)" strokeWidth="21">{glyphs}</g>
        <g fill="#ffd2da" stroke="#ffd2da" fillOpacity="0.5" strokeOpacity="0.35" strokeWidth="2" filter="url(#tube-blur)" transform="translate(-3 -6)">
          {glyphs}
        </g>
      </g>
    </svg>
  );
}
