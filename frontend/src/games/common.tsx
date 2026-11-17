import type { ReactNode } from "react";
import type { PlayerPublic } from "../api/client";
import { Avatar, Timer } from "../components/ui";
import type { GameProps } from "./types";

export function PhaseHeader({ title, deadline, offset, right }: {
  title: ReactNode; deadline?: number; offset: number; right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-200">{title}</h2>
      {right ?? <Timer deadline={deadline} offset={offset} />}
    </div>
  );
}

/** A big tappable list of players, used for votes. */
export function PlayerPicker({ players, chosen, onPick, disabled, exclude }: {
  players: PlayerPublic[]; chosen?: string | null; onPick: (id: string) => void;
  disabled?: boolean; exclude?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {players.filter((p) => p.id !== exclude).map((p) => (
        <button
          key={p.id}
          disabled={disabled}
          onClick={() => onPick(p.id)}
          className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left font-semibold transition active:scale-95 ${
            chosen === p.id ? "border-yellow bg-yellow/15" : "border-line bg-ink/50 hover:border-blue"
          }`}
        >
          <Avatar p={p} size="h-9 w-9 text-lg" />
          <span className="truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

export function Progress({ done, total, label = "відповіли" }: { done: number; total: number; label?: string }) {
  return (
    <p className="mt-3 text-center text-sm text-slate-400">
      {done} з {total} {label}
    </p>
  );
}

export function NextButton({ act }: { act: GameProps["act"] }) {
  return (
    <button className="btn-ghost mt-4 w-full" onClick={() => act({ type: "next" })}>
      Далі →
    </button>
  );
}

/** Points earned in this game, best first. */
export function GamePoints({ points, byId }: { points: Record<string, number>; byId: GameProps["byId"] }) {
  const rows = Object.entries(points)
    .filter(([id]) => byId[id])
    .sort((a, b) => b[1] - a[1]);
  return (
    <ol className="mt-4 space-y-2">
      {rows.map(([id, pts], i) => (
        <li key={id} className="flex items-center gap-3 rounded-2xl bg-ink/50 px-3 py-2">
          <span className="w-6 text-center font-bold text-slate-400">{i + 1}</span>
          <Avatar p={byId[id]} size="h-8 w-8 text-base" />
          <span className="flex-1 truncate font-semibold">{byId[id].name}</span>
          <span className="font-mono font-bold text-yellow">+{pts}</span>
        </li>
      ))}
    </ol>
  );
}

export function Big({ children, tone = "yellow" }: { children: ReactNode; tone?: "yellow" | "blue" | "red" }) {
  const tones = {
    yellow: "from-yellow/25 to-yellow/5 border-yellow/40",
    blue: "from-blue/30 to-blue/5 border-blue/40",
    red: "from-red-500/30 to-red-500/5 border-red-500/40",
  };
  return (
    <div className={`pop rounded-3xl border bg-gradient-to-b p-6 text-center ${tones[tone]}`}>{children}</div>
  );
}
