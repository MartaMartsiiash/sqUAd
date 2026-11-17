import { Avatar } from "../components/ui";
import { Big, PhaseHeader } from "./common";
import type { GameProps } from "./types";

export default function WhoAmI({ room, view, me, byId, offset, act }: GameProps) {
  const players = room.players.filter((p) => room.game?.player_ids.includes(p.id));
  const done = view.guessed.includes(me.id) || view.gave_up.includes(me.id);
  const chars = view.characters as Record<string, string>;

  return (
    <div>
      <PhaseHeader title="Хто я?" deadline={view.deadline} offset={offset} />
      <p className="mb-3 text-sm text-slate-300">
        Питай по черзі те, на що можна відповісти «так» або «ні». Наприклад: «Я людина?»
      </p>
      <div className="space-y-2">
        {players.map((p) => {
          const order = view.guessed.indexOf(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-ink/50 px-3 py-3">
              <Avatar p={p} size="h-9 w-9 text-lg" />
              <div className="flex-1">
                <div className="text-sm text-slate-400">{p.name}</div>
                <div className="text-lg font-bold">{chars[p.id] ?? (p.id === me.id ? "❓❓❓" : "")}</div>
              </div>
              {order >= 0 && <span className="text-xl">{["🥇", "🥈", "🥉"][order] ?? "✅"}</span>}
              {view.gave_up.includes(p.id) && <span className="text-xl">🏳️</span>}
            </div>
          );
        })}
      </div>
      {view.phase === "play" && !done && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn-primary" onClick={() => act({ type: "guessed" })}>
            Я вгадав(ла)!
          </button>
          <button className="btn-ghost" onClick={() => act({ type: "give_up" })}>
            Здаюсь
          </button>
        </div>
      )}
      {view.phase === "finished" && (
        <div className="mt-4">
          <Big>
            <div className="text-2xl font-black">Гру завершено! 🎭</div>
            {view.guessed[0] && byId[view.guessed[0]] && (
              <p className="mt-1">Найшвидше: {byId[view.guessed[0]].name}</p>
            )}
          </Big>
        </div>
      )}
    </div>
  );
}
