import { Waiting } from "../components/ui";
import { Big, NextButton, PhaseHeader, Progress } from "./common";
import type { GameProps } from "./types";

export default function FriendsQuiz({ room, view, byId, offset, act }: GameProps) {
  const subject = byId[view.subject];
  const pair = view.pair as [string, string];
  const total = room.game?.player_ids.length ?? 0;

  if (view.phase === "pick") {
    return (
      <div>
        <PhaseHeader title={`Раунд ${view.round} з ${view.rounds}`} deadline={view.deadline} offset={offset} />
        <p className="mb-3 text-center text-lg">
          {view.is_subject ? (
            <>Ти — герой раунду! Обери чесно 🤫</>
          ) : (
            <>
              Що обрав(ла) <b>{subject?.emoji} {subject?.name}</b>?
            </>
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {pair.map((option, i) => (
            <button
              key={option}
              onClick={() => act({ type: "pick", choice: i })}
              className={`rounded-3xl border-2 px-3 py-8 text-xl font-black transition active:scale-95 ${
                view.my_answer === i
                  ? "border-yellow bg-yellow/20"
                  : i === 0
                    ? "border-blue/50 bg-blue/15"
                    : "border-yellow/40 bg-yellow/10"
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
        <PhaseHeader title={`${subject?.emoji} ${subject?.name}`} deadline={view.deadline} offset={offset} />
        {choice === null ? (
          <Waiting>Герой не встиг обрати 🙈</Waiting>
        ) : (
          <Big>
            <p className="text-sm uppercase tracking-wider text-slate-300">Обрав(ла)</p>
            <div className="mt-1 text-4xl font-black">{pair[choice]}</div>
            <p className="mt-2 text-slate-300">
              Вгадали: {(view.last.right as string[]).map((id) => byId[id]?.name).filter(Boolean).join(", ") || "ніхто 😅"}
            </p>
          </Big>
        )}
        <NextButton act={act} />
      </div>
    );
  }

  return (
    <Big>
      <div className="text-2xl font-black">Гру завершено! 💛</div>
    </Big>
  );
}
