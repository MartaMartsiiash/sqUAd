import { useState } from "react";
import { Waiting } from "../components/ui";
import { Big, PhaseHeader, PlayerPicker, Progress } from "./common";
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
          onClick={(e) => e.preventDefault()}
        >
          {shown ? (
            view.is_spy ? (
              <Big tone="red">
                <div className="text-5xl">🕵️</div>
                <div className="mt-2 text-2xl font-black">Ти шпигун!</div>
                <p className="mt-1 text-sm text-slate-300">Вгадай локацію з розмови й не видай себе</p>
              </Big>
            ) : (
              <Big tone="blue">
                <p className="text-sm uppercase tracking-wider text-slate-300">Локація</p>
                <div className="mt-2 text-3xl font-black">{view.location}</div>
              </Big>
            )
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-line p-10 text-center text-slate-300">
              <div className="text-5xl">👆</div>
              <p className="mt-2 font-semibold">Затисни, щоб побачити свою роль</p>
            </div>
          )}
        </button>
        <p className="mt-4 text-center text-slate-300">
          Першим питає: <b>{byId[view.first_asker]?.emoji} {byId[view.first_asker]?.name}</b>
        </p>
        <button className="btn-blue mt-4 w-full" onClick={() => act({ type: "ready_to_vote" })}>
          🗳 Готові голосувати
        </button>
        <Progress done={view.ready_count} total={total} label="готові (потрібна більшість)" />
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
        <PhaseHeader title="Шпигуна впіймали!" deadline={view.deadline} offset={offset} />
        {view.is_spy ? (
          <>
            <p className="mb-3 text-center text-slate-300">Останній шанс: вгадай локацію і забери 2 бали</p>
            <div className="grid grid-cols-2 gap-2">
              {(view.options as string[]).map((o) => (
                <button key={o} className="btn-ghost text-sm" onClick={() => act({ type: "guess", location: o })}>
                  {o}
                </button>
              ))}
            </div>
          </>
        ) : (
          <Waiting>
            {byId[view.spy]?.emoji} {byId[view.spy]?.name} вгадує локацію...
          </Waiting>
        )}
      </div>
    );
  }

  // finished
  const caught = view.accused === view.spy;
  return (
    <div>
      <Big tone={caught ? "blue" : "red"}>
        <p className="text-sm uppercase tracking-wider text-slate-300">Шпигун</p>
        <div className="mt-1 text-3xl font-black">
          {byId[view.spy]?.emoji} {byId[view.spy]?.name}
        </div>
        <p className="mt-2 text-slate-200">
          Локація: <b>{view.location}</b>
        </p>
        <p className="mt-3 text-lg font-bold">
          {caught
            ? view.spy_guess === view.location
              ? "Впіймали, але шпигун вгадав локацію! 😎"
              : "Шпигуна впіймали! 🎉"
            : "Шпигун переміг 🕵️"}
        </p>
      </Big>
    </div>
  );
}
