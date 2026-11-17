import { Avatar } from "../components/ui";
import { NextButton, PhaseHeader, PlayerPicker, Progress, Spotlight } from "./common";
import type { GameProps } from "./types";

export default function WhoOfUs({ room, view, offset, act }: GameProps) {
  const players = room.players.filter((p) => room.game?.player_ids.includes(p.id));

  if (view.phase === "vote") {
    return (
      <div>
        <PhaseHeader title={`Раунд ${view.round} / ${view.rounds}`} deadline={view.deadline} offset={offset} />
        <Spotlight>
          <p className="font-display text-xl font-semibold leading-snug sm:text-2xl">{view.question}</p>
        </Spotlight>
        <div className="mt-4">
          <PlayerPicker players={players} chosen={view.my_vote} onPick={(id) => act({ type: "vote", target: id })} />
        </div>
        <Progress done={view.voted.length} total={players.length} label="проголосували" />
      </div>
    );
  }

  if (view.phase === "reveal" && view.last) {
    const counts = view.last.counts as Record<string, number>;
    const max = Math.max(1, ...Object.values(counts));
    const rows = players.map((p) => ({ p, n: counts[p.id] ?? 0 })).sort((a, b) => b.n - a.n);
    return (
      <div>
        <PhaseHeader title="Результат" deadline={view.deadline} offset={offset} />
        <p className="mb-4 text-center font-semibold">{view.question}</p>
        <div className="space-y-2">
          {rows.map(({ p, n }) => (
            <div key={p.id} className="flex items-center gap-3">
              <Avatar p={p} size="h-8 w-8 text-sm" />
              <div className="relative h-9 flex-1 overflow-hidden rounded-xl bg-bg/50">
                <div
                  className={`h-full rounded-xl transition-all duration-700 ${
                    view.last.winners.includes(p.id) ? "bg-red" : "bg-fg/20"
                  }`}
                  style={{ width: `${(n / max) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-between px-3 text-sm font-semibold">
                  <span>{p.name}</span>
                  <span className="font-mono">{n}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="label mt-4 text-center">+1 бал тим, хто голосував як більшість</p>
        <NextButton act={act} />
      </div>
    );
  }

  return (
    <Spotlight tone="dark">
      <p className="display text-2xl">Гру завершено</p>
    </Spotlight>
  );
}
