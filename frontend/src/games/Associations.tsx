import { useState } from "react";
import { Avatar, Waiting } from "../components/ui";
import { NextButton, PhaseHeader, Progress, Spotlight } from "./common";
import type { GameProps } from "./types";

export default function Associations({ room, view, byId, offset, act, isHost }: GameProps) {
  const [text, setText] = useState("");
  const total = room.game?.player_ids.length ?? 0;

  if (view.phase === "write") {
    return (
      <div>
        <PhaseHeader title={`Раунд ${view.round} / ${view.rounds}`} deadline={view.deadline} offset={offset} />
        <Spotlight>
          <p className="label text-fg">Перша асоціація до слова</p>
          <p className="display mt-3 text-4xl sm:text-5xl">{view.word}</p>
        </Spotlight>
        {view.my_answer ? (
          <div className="mt-4">
            <Waiting>
              Твоя відповідь: <b className="text-fg">{view.my_answer}</b>. Чекаємо інших
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
              enterKeyHint="send"
            />
            <button className="btn-primary px-5" disabled={!text.trim()}>
              ОК
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
      (groups[t.toLowerCase().trim()] ??= []).push(pid);
    });
    const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    return (
      <div>
        <PhaseHeader title={view.word} deadline={view.deadline} offset={offset} />
        <div className="space-y-2">
          {sorted.map(([word, ids]) => (
            <div
              key={word}
              className={`rounded-2xl border px-4 py-3 ${ids.length > 1 ? "border-red/50 bg-red/10" : "border-line bg-bg/40"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold">{answers[ids[0]]}</span>
                {ids.length > 1 && <span className="font-mono text-sm text-red">+{pts[ids[0]]} кожному</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ids.filter((id) => byId[id]).map((id) => (
                  <span key={id} className="flex items-center gap-1.5 text-sm text-muted">
                    <Avatar p={byId[id]} size="h-6 w-6 text-[0.6rem]" /> {byId[id].name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
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
