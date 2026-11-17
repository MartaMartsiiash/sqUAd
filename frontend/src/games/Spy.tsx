import { useState } from "react";
import { Waiting } from "../components/ui";
import { PhaseHeader, PlayerPicker, Progress, Spotlight } from "./common";
import type { GameProps } from "./types";

export default function Spy({ room, view, me, byId, offset, act }: GameProps) {
  const [shown, setShown] = useState(false);
  const players = room.players.filter((p) => room.game?.player_ids.includes(p.id));
  const total = players.length;

  if (view.phase === "discuss") {
    return (
      <div>
        <PhaseHeader title="Обговорення" deadline={view.deadline} offset={offset} />
        {/* Hidden by default so a neighbour cannot peek at the screen. */}
        <button
          className="w-full touch-manipulation select-none"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={() => setShown(true)}
          onPointerUp={() => setShown(false)}
          onPointerLeave={() => setShown(false)}
        >
          {shown ? (
            view.is_spy ? (
              <Spotlight tone="red">
                <p className="label text-fg">Твоя роль</p>
                <p className="display mt-3 text-4xl text-red">Шпигун</p>
                <p className="mt-3 text-sm text-muted">Вгадай локацію з розмови й не видай себе</p>
              </Spotlight>
            ) : (
              <Spotlight tone="dark">
                <p className="label">Локація</p>
                <p className="display mt-3 text-3xl">{view.location}</p>
              </Spotlight>
            )
          ) : (
            <div className="rounded-[24px] border border-dashed border-line px-6 py-12 text-center">
              <p className="display text-xl">Затисни</p>
              <p className="label mt-2">щоб побачити свою роль</p>
            </div>
          )}
        </button>
        <p className="mt-4 text-center text-muted">
          Першим питає <b className="text-fg">{byId[view.first_asker]?.name}</b>
        </p>
        <button className="btn-primary mt-4 w-full" onClick={() => act({ type: "ready_to_vote" })}>
          Готові голосувати
        </button>
        <Progress done={view.ready_count} total={total} label="готові · потрібна більшість" />
      </div>
    );
  }

  if (view.phase === "vote") {
    return (
      <div>
        <PhaseHeader title="Хто шпигун?" deadline={view.deadline} offset={offset} />
        <PlayerPicker
          players={players}
          exclude={me.id}
          chosen={view.my_vote}
          onPick={(id) => act({ type: "vote", target: id })}
        />
        <Progress done={view.voted.length} total={total} label="проголосували" />
      </div>
    );
  }

  if (view.phase === "spy_guess") {
    return (
      <div>
        <PhaseHeader title="Шпигуна впіймали" deadline={view.deadline} offset={offset} />
        {view.is_spy ? (
          <>
            <p className="mb-3 text-center">Останній шанс: вгадай локацію і забери 2 бали</p>
            <div className="grid grid-cols-2 gap-2">
              {(view.options as string[]).map((o) => (
                <button key={o} className="btn-ghost px-3 text-xs" onClick={() => act({ type: "guess", location: o })}>
                  {o}
                </button>
              ))}
            </div>
          </>
        ) : (
          <Waiting>{byId[view.spy]?.name} вгадує локацію...</Waiting>
        )}
      </div>
    );
  }

  const caught = view.accused === view.spy;
  return (
    <Spotlight tone={caught ? "dark" : "red"}>
      <p className="label">Шпигун</p>
      <p className="display mt-2 text-3xl">{byId[view.spy]?.name}</p>
      <p className="mt-3 text-muted">
        Локація: <b className="text-fg">{view.location}</b>
      </p>
      <p className="display mt-4 text-lg text-red">
        {caught
          ? view.spy_guess === view.location
            ? "Впіймали, але локацію вгадано"
            : "Шпигуна впіймали"
          : "Шпигун переміг"}
      </p>
    </Spotlight>
  );
}
