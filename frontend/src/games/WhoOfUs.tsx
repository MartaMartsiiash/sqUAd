import { Avatar } from "../components/ui";
import { Big, NextButton, PhaseHeader, PlayerPicker, Progress } from "./common";
import type { GameProps } from "./types";

export default function WhoOfUs({ room, view, byId, offset, act }: GameProps) {
  const players = room.players.filter((p) => room.game?.player_ids.includes(p.id));

  if (view.phase === "vote") {
    return (
      <div>
        <PhaseHeader title={`Раунд ${view.round} з ${view.rounds}`} deadline={view.deadline} offset={offset} />
        <Big>
          <div className="text-2xl font-black leading-snug">{view.question}</div>
        </Big>
        <div className="mt-4">
          <PlayerPicker
            players={players}
            chosen={view.my_vote}
            onPick={(id) => act({ type: "vote", target: id })}
          />
        </div>
        <Progress done={view.voted.length} total={players.length} label="проголосували" />
      </div>
    );
  }

  if (view.phase === "reveal" && view.last) {
    const counts = view.last.counts as Record<string, number>;
    const max = Math.max(1, ...Object.values(counts));
    const rows = players
      .map((p) => ({ p, n: counts[p.id] ?? 0 }))
      .sort((a, b) => b.n - a.n);
    return (
      <div>
        <PhaseHeader title="Результат" deadline={view.deadline} offset={offset} />
        <p className="mb-3 text-center font-semibold text-slate-300">{view.question}</p>
        <div className="space-y-2">
          {rows.map(({ p, n }) => (
            <div key={p.id} className="flex items-center gap-3">
              <Avatar p={p} size="h-8 w-8 text-base" />
              <div className="relative h-9 flex-1 overflow-hidden rounded-xl bg-ink/50">
                <div
                  className={`h-full rounded-xl transition-all duration-700 ${
                    view.last.winners.includes(p.id) ? "bg-yellow/70" : "bg-blue/50"
                  }`}
                  style={{ width: `${(n / max) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-sm font-bold">
                  {p.name} · {n}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-slate-400">
          +1 бал усім, хто голосував як більшість
        </p>
        <NextButton act={act} />
      </div>
    );
  }

  return (
    <Big>
      <div className="text-2xl font-black">Гру завершено!</div>
      <p className="mt-1 text-slate-300">
        Найкраще знає компанію: {topName(view.points, byId)}
      </p>
    </Big>
  );
}

function topName(points: Record<string, number>, byId: GameProps["byId"]) {
  const best = Object.entries(points).sort((a, b) => b[1] - a[1])[0];
  return best && byId[best[0]] ? `${byId[best[0]].emoji} ${byId[best[0]].name}` : "—";
}
