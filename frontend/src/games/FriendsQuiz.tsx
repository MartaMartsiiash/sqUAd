import { Waiting } from "../components/ui";
import { NextButton, PhaseHeader, Progress, Spotlight } from "./common";
import type { GameProps } from "./types";

export default function FriendsQuiz({ room, view, byId, offset, act }: GameProps) {
  const subject = byId[view.subject];
  const pair = view.pair as [string, string];
  const total = room.game?.player_ids.length ?? 0;

  if (view.phase === "pick") {
    return (
      <div>
        <PhaseHeader title={`Раунд ${view.round} / ${view.rounds}`} deadline={view.deadline} offset={offset} />
        <p className="mb-4 text-center text-lg">
          {view.is_subject ? (
            "Ти герой раунду. Обери чесно"
          ) : (
            <>
              Що обрав(ла) <b>{subject?.name}</b>?
            </>
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {pair.map((option, i) => (
            <button
              key={option}
              onClick={() => act({ type: "pick", choice: i })}
              className={`rounded-[24px] border px-3 py-10 font-display text-lg font-semibold uppercase transition active:scale-95 ${
                view.my_answer === i ? "border-red bg-red text-on-red" : "border-line bg-bg/40"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <Progress done={view.answered.length} total={total} />
      </div>
    );
  }

  if (view.phase === "reveal" && view.last) {
    const choice = view.last.choice as number | null;
    return (
      <div>
        <PhaseHeader title={subject?.name} deadline={view.deadline} offset={offset} />
        {choice === null ? (
          <Waiting>Герой не встиг обрати</Waiting>
        ) : (
          <Spotlight>
            <p className="label text-fg">Обрав(ла)</p>
            <p className="display mt-3 text-4xl">{pair[choice]}</p>
            <p className="mt-3 text-muted">
              Вгадали:{" "}
              {(view.last.right as string[]).map((id) => byId[id]?.name).filter(Boolean).join(", ") || "ніхто"}
            </p>
          </Spotlight>
        )}
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
