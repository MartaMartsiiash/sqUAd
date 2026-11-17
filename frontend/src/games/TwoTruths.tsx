import { useState } from "react";
import { Waiting } from "../components/ui";
import { Big, NextButton, PhaseHeader, Progress } from "./common";
import type { GameProps } from "./types";

export default function TwoTruths({ room, view, me, byId, offset, act }: GameProps) {
  const [facts, setFacts] = useState(["", "", ""]);
  const [lie, setLie] = useState<number | null>(null);
  const total = room.game?.player_ids.length ?? 0;

  if (view.phase === "write") {
    if (view.my_entry) {
      return (
        <div>
          <PhaseHeader title="Факти про себе" deadline={view.deadline} offset={offset} />
          <Waiting>Записано! Чекаємо, поки інші допишуть...</Waiting>
          <Progress done={view.submitted.length} total={total} label="готові" />
        </div>
      );
    }
    const ready = facts.every((f) => f.trim()) && lie !== null;
    return (
      <div>
        <PhaseHeader title="Дві правди й одна брехня" deadline={view.deadline} offset={offset} />
        <p className="mb-3 text-sm text-slate-300">Напиши 3 факти про себе і познач, який із них вигаданий 🤥</p>
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
                className={`rounded-2xl px-3 text-xl ${lie === i ? "bg-red-500/30 ring-2 ring-red-400" : "bg-ink/50"}`}
                aria-label={`Факт ${i + 1} — брехня`}
              >
                🤥
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn-primary mt-4 w-full"
          disabled={!ready}
          onClick={() => act({ type: "submit", facts, lie })}
        >
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
        <PhaseHeader title={`${view.turn} з ${view.turns}`} deadline={view.deadline} offset={offset} />
        <p className="mb-3 text-center text-lg">
          Факти про <b>{author?.emoji} {author?.name}</b>. Де брехня?
        </p>
        <div className="space-y-2">
          {(view.facts as string[]).map((f, i) => (
            <button
              key={i}
              disabled={mine}
              onClick={() => act({ type: "guess", choice: i })}
              className={`w-full rounded-2xl border px-4 py-4 text-left font-semibold transition active:scale-[0.98] ${
                view.my_guess === i ? "border-yellow bg-yellow/15" : "border-line bg-ink/50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {mine && <p className="mt-3 text-center text-slate-400">Це твої факти — тримай обличчя 😐</p>}
        <Progress done={view.guessed.length} total={total - 1} label="вгадали" />
      </div>
    );
  }

  if (view.phase === "reveal" && view.last) {
    return (
      <div>
        <PhaseHeader title={`${author?.emoji} ${author?.name}`} deadline={view.deadline} offset={offset} />
        <div className="space-y-2">
          {(view.facts as string[]).map((f, i) => (
            <div
              key={i}
              className={`rounded-2xl px-4 py-4 font-semibold ${
                i === view.last.lie ? "bg-red-500/25 ring-2 ring-red-400" : "bg-blue/15"
              }`}
            >
              {i === view.last.lie ? "🤥 " : "✅ "}
              {f}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-slate-300">
          Обдурено: <b>{view.last.fooled}</b> → +{view.last.fooled} автору
        </p>
        <NextButton act={act} />
      </div>
    );
  }

  return (
    <Big>
      <div className="text-2xl font-black">Гру завершено! 🤥</div>
    </Big>
  );
}
