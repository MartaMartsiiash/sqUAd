import { useState } from "react";
import { Waiting } from "../components/ui";
import { NextButton, PhaseHeader, Progress, Spotlight } from "./common";
import type { GameProps } from "./types";

type Option = { id: string; text: string; mine?: boolean; authors?: string[] };

export default function ForgottenWords({ room, view, me, byId, offset, act }: GameProps) {
  const [text, setText] = useState("");
  const total = room.game?.player_ids.length ?? 0;

  const word = (
    <Spotlight>
      <p className="label text-fg">Що означає слово</p>
      <p className="display mt-3 break-words text-4xl sm:text-5xl">{view.word}</p>
    </Spotlight>
  );

  if (view.phase === "write") {
    return (
      <div>
        <PhaseHeader title={`Раунд ${view.round} / ${view.rounds}`} deadline={view.deadline} offset={offset} />
        {word}
        {view.my_fake ? (
          <div className="mt-4">
            <Waiting>
              Твоя версія: <b className="text-fg">{view.my_fake}</b>
            </Waiting>
          </div>
        ) : (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) act({ type: "fake", text }).then(() => setText(""));
            }}
          >
            <p className="mb-2 text-sm text-muted">Вигадай значення, у яке повірять інші</p>
            <textarea
              className="input min-h-24 resize-none text-base"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 90))}
              placeholder="Наприклад: старовинна дерев'яна ложка для меду"
            />
            <button className="btn-primary mt-3 w-full" disabled={!text.trim()}>
              Записати
            </button>
          </form>
        )}
        <Progress done={view.written.length} total={total} label="написали" />
      </div>
    );
  }

  if (view.phase === "vote") {
    return (
      <div>
        <PhaseHeader title="Яке значення справжнє?" deadline={view.deadline} offset={offset} />
        <p className="display mb-4 text-center text-3xl">{view.word}</p>
        <div className="space-y-2">
          {(view.options as Option[]).map((o) => (
            <button
              key={o.id}
              disabled={o.mine}
              onClick={() => act({ type: "vote", option: o.id })}
              className={`w-full rounded-2xl border px-4 py-4 text-left font-semibold transition active:scale-[0.98] ${
                view.my_vote === o.id ? "border-red bg-red/15" : "border-line bg-bg/40"
              } ${o.mine ? "opacity-50" : ""}`}
            >
              {o.text}
              {o.mine && <span className="label ml-2">твоя версія</span>}
            </button>
          ))}
        </div>
        <Progress done={view.voted.length} total={total} label="проголосували" />
      </div>
    );
  }

  if (view.phase === "reveal" && view.last) {
    const options = view.last.options as Option[];
    const votes = view.last.votes as Record<string, string>;
    const realId = view.last.real_id as string;
    return (
      <div>
        <PhaseHeader title={view.word} deadline={view.deadline} offset={offset} />
        <div className="space-y-2">
          {[...options]
            .sort((a, b) => (a.id === realId ? -1 : b.id === realId ? 1 : 0))
            .map((o) => {
              const voters = Object.entries(votes).filter(([, v]) => v === o.id).map(([p]) => byId[p]?.name);
              const real = o.id === realId;
              return (
                <div key={o.id} className={`rounded-2xl border px-4 py-3 ${real ? "border-red bg-red/15" : "border-line bg-bg/40"}`}>
                  <span className="label">
                    {real ? "справжнє" : `вигадка · ${(o.authors ?? []).map((a) => (a === me.id ? "ти" : byId[a]?.name)).join(", ")}`}
                  </span>
                  <p className="mt-1 font-semibold">{o.text}</p>
                  {voters.length > 0 && <p className="mt-1 text-sm text-muted">Повірили: {voters.join(", ")}</p>}
                </div>
              );
            })}
        </div>
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
