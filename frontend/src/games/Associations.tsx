import { useState } from "react";
import { Avatar, Waiting } from "../components/ui";
import { Big, NextButton, PhaseHeader, Progress } from "./common";
import type { GameProps } from "./types";

export default function Associations({ room, view, byId, offset, act }: GameProps) {
  const [text, setText] = useState("");
  const total = room.game?.player_ids.length ?? 0;

  if (view.phase === "write") {
    return (
      <div>
        <PhaseHeader title={`Раунд ${view.round} з ${view.rounds}`} deadline={view.deadline} offset={offset} />
        <Big>
          <p className="text-sm uppercase tracking-wider text-slate-300">Перша асоціація до слова</p>
          <div className="mt-1 text-4xl font-black">{view.word}</div>
        </Big>
        {view.my_answer ? (
          <div className="mt-4">
            <Waiting>
              Твоя відповідь: <b>{view.my_answer}</b>. Чекаємо інших...
            </Waiting>
          </div>
        ) : (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) act({ type: "answer", text }).then(() => setText(""));
            }}
          >
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 30))}
              placeholder="Одне слово"
              autoFocus
            />
            <button className="btn-primary" disabled={!text.trim()}>
              ✓
            </button>
          </form>
        )}
        <Progress done={view.answered.length} total={total} />
      </div>
    );
  }

  if (view.phase === "reveal" && view.last) {
    const answers = view.last.answers as Record<string, string>;
    const pts = view.last.round_points as Record<string, number>;
    const groups: Record<string, string[]> = {};
    Object.entries(answers).forEach(([pid, t]) => {
      const k = t.toLowerCase().trim();
      (groups[k] ??= []).push(pid);
    });
    const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    return (
      <div>
        <PhaseHeader title={`«${view.word}»`} deadline={view.deadline} offset={offset} />
        <div className="space-y-2">
          {sorted.map(([word, ids]) => (
            <div key={word} className={`rounded-2xl px-4 py-3 ${ids.length > 1 ? "bg-yellow/15" : "bg-ink/50"}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{answers[ids[0]]}</span>
                {ids.length > 1 && <span className="font-mono font-bold text-yellow">+{pts[ids[0]]} кожному</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {ids.filter((id) => byId[id]).map((id) => (
                  <span key={id} className="flex items-center gap-1 text-sm text-slate-300">
                    <Avatar p={byId[id]} size="h-6 w-6 text-sm" /> {byId[id].name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <NextButton act={act} />
      </div>
    );
  }

  return (
    <Big>
      <div className="text-2xl font-black">Гру завершено! 🧠</div>
    </Big>
  );
}
