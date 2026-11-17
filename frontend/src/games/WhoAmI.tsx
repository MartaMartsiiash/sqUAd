import { Avatar, Num } from "../components/ui";
import { PhaseHeader, Spotlight } from "./common";
import type { GameProps } from "./types";

export default function WhoAmI({ room, view, me, byId, offset, act }: GameProps) {
  const players = room.players.filter((p) => room.game?.player_ids.includes(p.id));
  const done = view.guessed.includes(me.id) || view.gave_up.includes(me.id);
  const chars = view.characters as Record<string, string>;

  return (
    <div>
      <PhaseHeader title="Хто я?" deadline={view.deadline} offset={offset} />
      <p className="mb-4 text-sm text-muted">
        Питай по черзі те, на що відповідають «так» або «ні». Наприклад: «Я людина?»
      </p>
      <div className="divide-y divide-line border-y border-line">
        {players.map((p) => {
          const order = view.guessed.indexOf(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3 py-3">
              <Avatar p={p} size="h-9 w-9 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="label">{p.name}</div>
                <div className="font-display text-lg font-semibold">
                  {chars[p.id] ?? (p.id === me.id ? "? ? ?" : "")}
                </div>
              </div>
              {order >= 0 && <Num n={order + 1} className="text-red" />}
              {view.gave_up.includes(p.id) && <span className="label">здався</span>}
            </div>
          );
        })}
      </div>
      {view.phase === "play" && !done && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-primary px-3" onClick={() => act({ type: "guessed" })}>
            Вгадав(ла)
          </button>
          <button className="btn-ghost px-3" onClick={() => act({ type: "give_up" })}>
            Здаюсь
          </button>
        </div>
      )}
      {view.phase === "finished" && (
        <div className="mt-5">
          <Spotlight tone="dark">
            <p className="display text-2xl">Гру завершено</p>
            {view.guessed[0] && byId[view.guessed[0]] && (
              <p className="mt-2 text-muted">Найшвидше: {byId[view.guessed[0]].name}</p>
            )}
          </Spotlight>
        </div>
      )}
    </div>
  );
}
