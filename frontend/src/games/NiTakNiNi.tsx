import { useState } from "react";
import { Num, useCountdown, Waiting } from "../components/ui";
import { NextButton, PhaseHeader, Spotlight } from "./common";
import type { GameProps } from "./types";

function Forbidden({ words, big = false }: { words: string[]; big?: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {words.map((w) => (
        <span
          key={w}
          className={`rounded-full border border-red/60 bg-red/10 font-mono uppercase text-red line-through decoration-2 ${
            big ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-[0.65rem]"
          }`}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

/** A ring that empties as the 2 minutes run out. */
function Clock({ deadline, total, offset }: { deadline: number; total: number; offset: number }) {
  const left = useCountdown(deadline, offset) ?? 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="var(--red)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - left / total)}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-semibold tabular-nums">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </span>
        <span className="label">тримається</span>
      </div>
    </div>
  );
}

export default function NiTakNiNi({ view, byId, offset, act }: GameProps) {
  const [asked, setAsked] = useState<number[]>([]);
  const hot = byId[view.hot];
  const forbidden = view.forbidden as string[];

  if (view.phase === "ready") {
    return (
      <div>
        <PhaseHeader title={`Гравець ${view.turn} / ${view.turns}`} right={<span />} offset={offset} />
        <Spotlight>
          <p className="label text-fg">На гарячому кріслі</p>
          <p className="display mt-3 text-3xl">{view.is_hot ? "Ти" : hot?.name}</p>
        </Spotlight>
        <p className="label mb-3 mt-5 text-center">Заборонені слова</p>
        <Forbidden words={forbidden} big={view.is_hot} />
        {view.is_hot ? (
          <button className="btn-primary mt-6 w-full" onClick={() => { setAsked([]); act({ type: "begin" }); }}>
            Почати · 2 хвилини
          </button>
        ) : (
          <div className="mt-6">
            <Waiting>Чекаємо, поки {hot?.name} натисне «Почати»</Waiting>
          </div>
        )}
      </div>
    );
  }

  if (view.phase === "turn") {
    if (view.is_hot) {
      return (
        <div>
          <Clock deadline={view.deadline ?? 0} total={view.total_seconds} offset={offset} />
          <p className="display mt-6 text-center text-xl">Не кажи</p>
          <div className="mt-3">
            <Forbidden words={forbidden} big />
          </div>
          <p className="label mt-5 text-center">Відповідай на все, що питають. Повними реченнями</p>
        </div>
      );
    }
    const questions = view.questions as string[];
    return (
      <div>
        <Clock deadline={view.deadline ?? 0} total={view.total_seconds} offset={offset} />
        <button
          className="btn-primary mt-5 w-full py-5 text-base"
          onClick={() => act({ type: "caught" })}
        >
          Попався!
        </button>
        <p className="label mb-2 mt-6">Питай {hot?.name}</p>
        <ol className="divide-y divide-line border-y border-line">
          {questions.map((q, i) => (
            <li key={q}>
              <button
                className={`flex w-full gap-3 py-3 text-left transition ${asked.includes(i) ? "text-muted line-through" : ""}`}
                onClick={() => setAsked(asked.includes(i) ? asked.filter((x) => x !== i) : [...asked, i])}
              >
                <Num n={i + 1} className="pt-0.5 text-xs text-red" />
                <span className="font-semibold">{q}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="label mb-2 mt-5 text-center">Ловимо на словах</p>
        <Forbidden words={forbidden} />
      </div>
    );
  }

  if (view.phase === "result" && view.last) {
    const last = view.last;
    const who = byId[last.player];
    return (
      <div>
        <PhaseHeader title="Результат" deadline={view.deadline} offset={offset} />
        <Spotlight tone={last.caught_by ? "red" : "dark"}>
          <p className="label text-fg">{who?.name}</p>
          <p className="display mt-3 text-5xl">{last.survived}</p>
          <p className="label">секунд</p>
          <p className="mt-3 text-muted">
            {last.caught_by
              ? `Впіймав(ла) ${byId[last.caught_by]?.name ?? ""} · +1`
              : "Протримався(лась) усі 2 хвилини"}
          </p>
          <p className="font-mono mt-2 text-red">+{last.earned} бал(и)</p>
        </Spotlight>
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
