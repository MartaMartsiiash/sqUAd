import type { ReactNode } from "react";
import type { PlayerPublic } from "../api/client";
import { Avatar, Num, Timer } from "../components/ui";
import type { GameProps } from "./types";

export function PhaseHeader({ title, deadline, offset, right }: {
  title: ReactNode; deadline?: number | null; offset: number; right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="label">{title}</span>
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
          className={`flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-3 text-left font-semibold transition active:scale-95 ${
            chosen === p.id ? "border-red bg-red/15" : "border-line bg-bg/40 hover:border-fg/40"
          }`}
        >
          <Avatar p={p} size="h-9 w-9 text-sm" />
          <span className="truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

export function Progress({ done, total, label = "відповіли" }: { done: number; total: number; label?: string }) {
  return (
    <div className="mt-4">
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-red transition-all duration-500"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
      <p className="label mt-2 text-center">
        {done} / {total} {label}
      </p>
    </div>
  );
}

export function NextButton({ act }: { act: GameProps["act"] }) {
  return (
    <button className="btn-ghost mt-5 w-full" onClick={() => act({ type: "next" })}>
      Далі
    </button>
  );
}

/** Points earned in this game, best first. */
export function GamePoints({ points, byId }: { points: Record<string, number>; byId: GameProps["byId"] }) {
  const rows = Object.entries(points)
    .filter(([id]) => byId[id])
    .sort((a, b) => b[1] - a[1]);
  return (
    <ol className="mt-3 divide-y divide-line border-y border-line">
      {rows.map(([id, pts], i) => (
        <li key={id} className="flex items-center gap-3 py-2.5">
          <Num n={i + 1} className="w-6 text-sm text-muted" />
          <Avatar p={byId[id]} size="h-8 w-8 text-sm" />
          <span className="flex-1 truncate font-semibold">{byId[id].name}</span>
          <span className="font-mono font-semibold text-red">+{pts}</span>
        </li>
      ))}
    </ol>
  );
}

/** The main card of a game moment: the question, the word, the role. */
export function Spotlight({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "plain" | "dark" }) {
  const tones = {
    red: "border-red/50 bg-gradient-to-br from-red/30 via-red-deep/20 to-transparent",
    plain: "border-line bg-bg/40",
    dark: "border-fg/20 bg-gradient-to-br from-fg/10 to-transparent",
  };
  return <div className={`pop rounded-[24px] border p-6 text-center ${tones[tone]}`}>{children}</div>;
}
