import { useState } from "react";
import { Waiting } from "../components/ui";
import { NextButton, PhaseHeader, Progress, Spotlight } from "./common";
import type { GameProps } from "./types";

export default function TwoTruths({ room, view, me, byId, offset, act, isHost }: GameProps) {
  const [facts, setFacts] = useState(["", "", ""]);
  const [lie, setLie] = useState<number | null>(null);
  const total = room.game?.player_ids.length ?? 0;

  if (view.phase === "write") {
    if (view.my_entry) {
      return (
        <div>
          <PhaseHeader title="Факти про себе" deadline={view.deadline} offset={offset} />
          <Waiting>Записано. Чекаємо, поки інші допишуть</Waiting>
          <Progress done={view.submitted.length} total={total} label="готові" />
        </div>
      );
    }
    const ready = facts.every((f) => f.trim()) && lie !== null;
    return (
      <div>
        <PhaseHeader title="Дві правди, одна брехня" deadline={view.deadline} offset={offset} />
        <p className="mb-3 text-sm text-muted">Напиши три факти про себе й познач вигаданий</p>
        <div className="space-y-2">
          {facts.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input text-base"
                value={f}
                placeholder={`Факт ${i + 1}`}
                onChange={(e) => setFacts(facts.map((x, j) => (j === i ? e.target.value.slice(0, 100) : x)))}
              />
              <button
                type="button"
                onClick={() => setLie(i)}
                className={`shrink-0 rounded-2xl border px-3 font-mono text-xs uppercase tracking-wider ${
                  lie === i ? "border-red bg-red text-on-red" : "border-line text-muted"
                }`}
                aria-pressed={lie === i}
              >
                брехня
              </button>
            </div>
          ))}
        </div>
        <button className="btn-primary mt-4 w-full" disabled={!ready} onClick={() => act({ type: "submit", facts, lie })}>
          Готово
        </button>
        <Progress done={view.submitted.length} total={total} label="готові" />
      </div>
    );
  }

  const author = byId[view.author];
  if (view.phase === "guess") {
    const mine = view.author === me.id;
    return (
      <div>
        <PhaseHeader title={`${view.turn} / ${view.turns}`} deadline={view.deadline} offset={offset} />
        <p className="mb-4 text-center text-lg">
          Факти про <b>{author?.name}</b>. Де брехня?
        </p>
        <div className="space-y-2">
          {(view.facts as string[]).map((f, i) => (
            <button
              key={i}
              disabled={mine}
              onClick={() => act({ type: "guess", choice: i })}
              className={`w-full rounded-2xl border px-4 py-4 text-left font-semibold transition active:scale-[0.98] ${
                view.my_guess === i ? "border-red bg-red/15" : "border-line bg-bg/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {mine && <p className="label mt-4 text-center">Це твої факти. Тримай обличчя</p>}
        <Progress done={view.guessed.length} total={total - 1} label="вгадали" />
      </div>
    );
  }

  if (view.phase === "reveal" && view.last) {
    return (
      <div>
        <PhaseHeader title={author?.name} deadline={view.deadline} offset={offset} />
        <div className="space-y-2">
          {(view.facts as string[]).map((f, i) => (
            <div
              key={i}
              className={`rounded-2xl border px-4 py-4 font-semibold ${
                i === view.last.lie ? "border-red bg-red/15" : "border-line bg-bg/40"
              }`}
            >
              <span className="label mr-2">{i === view.last.lie ? "брехня" : "правда"}</span>
              {f}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-muted">
          Обдурено: <b className="text-fg">{view.last.fooled}</b> · автору +{view.last.fooled}
        </p>
        <NextButton act={act} isHost={isHost} />
      </div>
    );
  }

  return (
    <Spotlight tone="dark">
      <p className="display text-2xl">Гру завершено</p>
    </Spotlight>
  );
}
