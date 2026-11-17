import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, session, type GameMeta, type RoomView } from "../api/client";
import { Avatar, ErrorNote, Page, PlayerChip, Waiting } from "../components/ui";
import Associations from "../games/Associations";
import { GamePoints } from "../games/common";
import FriendsQuiz from "../games/FriendsQuiz";
import Spy from "../games/Spy";
import TwoTruths from "../games/TwoTruths";
import type { GameProps } from "../games/types";
import WhoAmI from "../games/WhoAmI";
import WhoOfUs from "../games/WhoOfUs";

const SCREENS: Record<string, ComponentType<GameProps>> = {
  spy: Spy,
  who_of_us: WhoOfUs,
  associations: Associations,
  two_truths: TwoTruths,
  who_am_i: WhoAmI,
  friends_quiz: FriendsQuiz,
};

const POLL_MS = 1500;

/** Keeps the room fresh: asks the server every 1.5 s while the tab is visible. */
function useRoom(code: string, token: string | null) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const latest = useRef(0);

  const apply = useCallback((r: RoomView) => {
    // Ignore an older response that arrives after a newer one.
    if (r.version < latest.current) return;
    latest.current = r.version;
    setOffset(r.server_time - Date.now() / 1000);
    setRoom(r);
    setError(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stop) return;
      if (document.visibilityState === "visible") {
        try {
          apply(await api.room(code, token));
        } catch (e) {
          if (e instanceof ApiError) setError(e);
        }
      }
      timer = setTimeout(tick, POLL_MS);
    };
    tick();
    const wake = () => document.visibilityState === "visible" && api.room(code, token).then(apply).catch(() => {});
    document.addEventListener("visibilitychange", wake);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [code, token, apply]);

  return { room, offset, error, apply };
}

export default function Room() {
  const { code = "" } = useParams();
  const upper = code.toUpperCase();
  const token = session.get(upper);
  const navigate = useNavigate();
  const { room, offset, error, apply } = useRoom(upper, token);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<"game" | "score">("game");

  useEffect(() => {
    if (!token) navigate(`/join/${upper}`, { replace: true });
  }, [token, upper, navigate]);

  // Removed by the host, or the room expired: forget this room on this phone.
  useEffect(() => {
    if (error && (error.status === 403 || error.status === 404)) session.clear(upper);
  }, [error, upper]);

  const run = useCallback(
    async (call: () => Promise<RoomView>) => {
      setActionError(null);
      try {
        apply(await call());
      } catch (e) {
        setActionError(e instanceof ApiError ? e.message : "Щось пішло не так");
      }
    },
    [apply],
  );

  const byId = useMemo(() => Object.fromEntries((room?.players ?? []).map((p) => [p.id, p])), [room]);

  if (error && (error.status === 403 || error.status === 404)) {
    return (
      <Page>
        <ErrorNote text={error.status === 404 ? "Кімнату не знайдено або вона вже закрилась." : error.message} />
        <Link to="/" className="btn-ghost mt-4 w-full">
          На головну
        </Link>
      </Page>
    );
  }
  if (!room || !token) {
    return (
      <Page>
        <Waiting>Заходимо в кімнату...</Waiting>
      </Page>
    );
  }

  const isHost = room.me.is_host;
  const game = room.game;
  const Screen = game ? SCREENS[game.id] : null;
  const act = (action: object) => run(() => api.act(upper, token, action));

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Кімната</p>
          <p className="font-mono text-2xl font-black tracking-[0.25em] text-yellow">{room.code}</p>
        </div>
        <div className="flex rounded-2xl bg-ink/60 p-1 text-sm font-semibold">
          <button
            className={`rounded-xl px-3 py-2 ${tab === "game" ? "bg-card text-white" : "text-slate-400"}`}
            onClick={() => setTab("game")}
          >
            {game ? `${game.emoji} Гра` : "🏠 Лобі"}
          </button>
          <button
            className={`rounded-xl px-3 py-2 ${tab === "score" ? "bg-card text-white" : "text-slate-400"}`}
            onClick={() => setTab("score")}
          >
            🏆 Табло
          </button>
        </div>
      </div>

      {tab === "score" ? (
        <Scoreboard room={room} byId={byId} />
      ) : game && Screen ? (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-black">
              {game.emoji} {game.title}
            </h1>
            <Rules text={game.rules} />
          </div>
          {game.view.spectator ? (
            <Waiting>Гра вже йде. Ти приєднаєшся до наступної 🙂</Waiting>
          ) : (
            <Screen room={room} view={game.view} me={room.me} isHost={isHost} byId={byId} offset={offset} act={act} />
          )}
          {game.view.phase === "finished" && game.view.points && (
            <>
              <h3 className="mt-6 font-bold text-slate-300">Бали за гру</h3>
              <GamePoints points={game.view.points} byId={byId} />
            </>
          )}
          {isHost && (
            <button
              className={`${game.view.phase === "finished" ? "btn-primary" : "btn-ghost text-sm"} mt-5 w-full`}
              onClick={() => run(() => api.stopGame(upper, token))}
            >
              {game.view.phase === "finished" ? "🏠 До вибору гри" : "Зупинити гру"}
            </button>
          )}
          {!isHost && game.view.phase === "finished" && (
            <div className="mt-4">
              <Waiting>Ведучий обирає наступну гру...</Waiting>
            </div>
          )}
        </div>
      ) : (
        <Lobby room={room} token={token} isHost={isHost} run={run} />
      )}
      <ErrorNote text={actionError} />
    </Page>
  );
}

function Rules({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="rounded-full bg-ink/60 px-3 py-1 text-sm text-slate-300" onClick={() => setOpen(!open)}>
        {open ? "✕" : "Правила"}
      </button>
      {open && (
        <div className="fixed inset-x-4 top-20 z-10 mx-auto max-w-md rounded-3xl border border-line bg-card p-5 shadow-2xl">
          <p className="leading-relaxed text-slate-200">{text}</p>
          <button className="btn-ghost mt-4 w-full" onClick={() => setOpen(false)}>
            Зрозуміло
          </button>
        </div>
      )}
    </>
  );
}

function Lobby({ room, token, isHost, run }: {
  room: RoomView; token: string; isHost: boolean; run: (c: () => Promise<RoomView>) => Promise<void>;
}) {
  const joinUrl = `${window.location.origin}/join/${room.code}`;
  const [showQr, setShowQr] = useState(isHost);

  const share = async () => {
    const text = `Заходь у sqUAd! Код кімнати: ${room.code}`;
    if (navigator.share) await navigator.share({ title: "sqUAd", text, url: joinUrl }).catch(() => {});
    else await navigator.clipboard?.writeText(`${text} ${joinUrl}`);
  };

  return (
    <div className="space-y-4">
      <div className="card text-center">
        {showQr ? (
          <div className="pop mx-auto w-fit rounded-3xl bg-white p-4">
            <QRCodeSVG value={joinUrl} size={200} />
          </div>
        ) : null}
        <p className="mt-3 text-slate-300">
          Скануйте QR або вводьте код <b className="font-mono text-yellow">{room.code}</b> на сайті
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-ghost text-sm" onClick={() => setShowQr(!showQr)}>
            {showQr ? "Сховати QR" : "Показати QR"}
          </button>
          <button className="btn-ghost text-sm" onClick={share}>
            📤 Поділитися
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-bold text-slate-300">Гравці · {room.players.length}</h2>
        <div className="flex flex-wrap gap-2">
          {room.players.map((p) => (
            <PlayerChip
              key={p.id}
              p={p}
              me={p.id === room.me.id}
              extra={
                isHost && !p.is_host ? (
                  <button
                    className="ml-1 text-slate-500 hover:text-red-300"
                    aria-label={`Видалити ${p.name}`}
                    onClick={() => confirm(`Видалити ${p.name}?`) && run(() => api.kick(room.code, token, p.id))}
                  >
                    ✕
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-bold text-slate-300">{isHost ? "Обери гру" : "Ігри вечора"}</h2>
        <div className="grid grid-cols-1 gap-2">
          {room.games.map((g) => (
            <GameCard
              key={g.id}
              g={g}
              isHost={isHost}
              enough={room.players.length >= g.min_players}
              onStart={() => run(() => api.startGame(room.code, token, g.id))}
            />
          ))}
        </div>
        {!isHost && <p className="mt-3 text-center text-sm text-slate-400">Гру запускає ведучий 👑</p>}
      </div>

      {!room.premium && <Premium room={room} />}
    </div>
  );
}

function GameCard({ g, isHost, enough, onStart }: {
  g: GameMeta; isHost: boolean; enough: boolean; onStart: () => void;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-ink/50 p-3 ${g.locked ? "opacity-70" : ""}`}>
      <span className="text-3xl">{g.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="font-bold">
          {g.title} {g.premium && <span className="ml-1 rounded-full bg-yellow/20 px-2 py-0.5 text-xs text-yellow">💛 premium</span>}
        </div>
        <div className="truncate text-sm text-slate-400">{g.description}</div>
      </div>
      {isHost &&
        (g.locked ? (
          <span className="text-xl" title="Відкривається донатом">🔒</span>
        ) : (
          <button className="btn-primary px-4 py-2 text-sm" disabled={!enough} onClick={onStart}
            title={enough ? "" : `Потрібно ${g.min_players}+ гравців`}>
            Грати
          </button>
        ))}
    </div>
  );
}

function Premium({ room }: { room: RoomView }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card border-yellow/40 bg-gradient-to-b from-yellow/10 to-transparent">
      <h2 className="text-lg font-black">💛 Відкрийте premium-ігри</h2>
      <p className="mt-1 text-sm text-slate-300">
        Задонать від <b>{room.premium_price_uah} грн</b> на банку і напиши в коментарі код кімнати. Ігри
        відкриються для всіх у кімнаті автоматично, за кілька секунд.
      </p>
      <button
        className="mt-3 w-full rounded-2xl border border-dashed border-yellow/60 py-3 font-mono text-2xl font-black tracking-[0.3em] text-yellow"
        onClick={() => {
          navigator.clipboard?.writeText(room.code);
          setCopied(true);
        }}
      >
        {room.code} <span className="text-sm font-sans tracking-normal">{copied ? "скопійовано ✓" : "📋"}</span>
      </button>
      {room.jar_url ? (
        <a className="btn-primary mt-3 w-full" href={room.jar_url} target="_blank" rel="noreferrer">
          🫙 Відкрити банку monobank
        </a>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Банка ще не налаштована.</p>
      )}
    </div>
  );
}

function Scoreboard({ room, byId }: { room: RoomView; byId: GameProps["byId"] }) {
  const rows = room.leaderboard.filter((r) => byId[r.player_id]);
  const leader = rows[0] && rows[0].points > 0 ? byId[rows[0].player_id] : null;

  const share = async () => {
    if (!leader) return;
    const text = `🏆 MVP вечора в sqUAd — ${leader.name} (${rows[0].points} балів)! Ігор зіграно: ${room.history.length}`;
    if (navigator.share) await navigator.share({ title: "sqUAd", text, url: window.location.origin }).catch(() => {});
    else await navigator.clipboard?.writeText(text);
  };

  return (
    <div className="space-y-4">
      {leader && (
        <div className="pop card border-yellow/50 bg-gradient-to-br from-yellow/25 via-card to-blue/25 text-center">
          <p className="text-sm uppercase tracking-wider text-slate-300">MVP вечора</p>
          <div className="mt-2 flex justify-center">
            <Avatar p={leader} size="h-20 w-20 text-5xl" />
          </div>
          <p className="mt-2 text-3xl font-black">{leader.name}</p>
          <p className="font-mono text-yellow">{rows[0].points} балів</p>
          <button className="btn-ghost mt-3 text-sm" onClick={share}>
            📤 Поділитися
          </button>
        </div>
      )}
      <div className="card">
        <h2 className="mb-3 font-bold text-slate-300">Загальне табло</h2>
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.player_id} className="flex items-center gap-3 rounded-2xl bg-ink/50 px-3 py-2">
              <span className="w-6 text-center text-lg">{(r.points > 0 && ["🥇", "🥈", "🥉"][i]) || i + 1}</span>
              <Avatar p={byId[r.player_id]} size="h-9 w-9 text-lg" />
              <span className="flex-1 truncate font-semibold">{byId[r.player_id].name}</span>
              <span className="font-mono text-lg font-bold text-yellow">{r.points}</span>
            </li>
          ))}
        </ol>
        {room.history.length > 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Зіграно: {room.history.map((h) => h.title).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
