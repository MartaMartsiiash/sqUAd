import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, session, type GameMeta, type RoomView } from "../api/client";
import { Avatar, ErrorNote, Num, Page, PlayerChip, Waiting } from "../components/ui";
import Associations from "../games/Associations";
import { GamePoints } from "../games/common";
import ForgottenWords from "../games/ForgottenWords";
import FriendsQuiz from "../games/FriendsQuiz";
import NiTakNiNi from "../games/NiTakNiNi";
import Spy from "../games/Spy";
import TwoTruths from "../games/TwoTruths";
import type { GameProps } from "../games/types";
import WhoAmI from "../games/WhoAmI";
import WhoOfUs from "../games/WhoOfUs";

const SCREENS: Record<string, ComponentType<GameProps>> = {
  who_of_us: WhoOfUs,
  ni_tak_ni_ni: NiTakNiNi,
  spy: Spy,
  associations: Associations,
  two_truths: TwoTruths,
  forgotten_words: ForgottenWords,
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
    if (r.version < latest.current) return; // an older answer arrived late
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
    const wake = () => {
      if (document.visibilityState === "visible") api.room(code, token).then(apply).catch(() => {});
    };
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
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="label">Кімната</span>
          <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.25em] text-red">{room.code}</p>
        </div>
        <div className="flex rounded-full border border-line p-1">
          {(["game", "score"] as const).map((t) => (
            <button
              key={t}
              className={`rounded-full px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] transition ${
                tab === t ? "bg-fg text-bg" : "text-muted"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "game" ? (game ? "Гра" : "Лобі") : "Табло"}
            </button>
          ))}
        </div>
      </div>

      {tab === "score" ? (
        <Scoreboard room={room} byId={byId} />
      ) : game && Screen ? (
        <div className="card pop">
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-line pb-4">
            <div className="min-w-0">
              <span className="label">{game.tag}</span>
              <h1 className="display mt-1 text-2xl">{game.title}</h1>
            </div>
            <Rules text={game.rules} />
          </div>
          {game.view.spectator ? (
            <Waiting>Гра вже йде. Ти приєднаєшся до наступної</Waiting>
          ) : (
            <Screen room={room} view={game.view} me={room.me} isHost={isHost} byId={byId} offset={offset} act={act} />
          )}
          {game.view.phase === "finished" && game.view.points && (
            <>
              <h3 className="label mt-6">Бали за гру</h3>
              <GamePoints points={game.view.points} byId={byId} />
            </>
          )}
          {isHost && (
            <button
              className={`${game.view.phase === "finished" ? "btn-primary" : "btn-ghost"} mt-6 w-full`}
              onClick={() => run(() => api.stopGame(upper, token))}
            >
              {game.view.phase === "finished" ? "До вибору гри" : "Зупинити гру"}
            </button>
          )}
          {!isHost && game.view.phase === "finished" && (
            <div className="mt-4">
              <Waiting>Ведучий обирає наступну гру</Waiting>
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
      <button className="shrink-0 rounded-full border border-line px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted" onClick={() => setOpen(true)}>
        Правила
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md bg-surface" onClick={(e) => e.stopPropagation()}>
            <span className="label">Правила</span>
            <p className="mt-3 leading-relaxed">{text}</p>
            <button className="btn-ghost mt-5 w-full" onClick={() => setOpen(false)}>
              Зрозуміло
            </button>
          </div>
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
    const text = `Заходь у sqUAd. Код кімнати: ${room.code}`;
    if (navigator.share) await navigator.share({ title: "sqUAd", text, url: joinUrl }).catch(() => {});
    else await navigator.clipboard?.writeText(`${text} ${joinUrl}`);
  };

  return (
    <div className="space-y-4">
      <div className="card pop text-center">
        {showQr && (
          <div className="mx-auto w-fit rounded-[20px] bg-white p-4">
            <QRCodeSVG value={joinUrl} size={196} fgColor="#0a0a0a" />
          </div>
        )}
        <p className="mt-4 text-muted">
          Скануйте QR або введіть код <b className="font-mono text-red">{room.code}</b> на головній
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn-ghost px-3" onClick={() => setShowQr(!showQr)}>
            {showQr ? "Сховати QR" : "Показати QR"}
          </button>
          <button className="btn-ghost px-3" onClick={share}>
            Поділитися
          </button>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="label">Гравці</h2>
          <Num n={room.players.length} className="text-red" />
        </div>
        <div className="flex flex-wrap gap-2">
          {room.players.map((p) => (
            <PlayerChip
              key={p.id}
              p={p}
              me={p.id === room.me.id}
              extra={
                isHost && !p.is_host ? (
                  <button
                    className="ml-1 font-mono text-xs text-muted hover:text-red"
                    aria-label={`Видалити ${p.name}`}
                    onClick={() => confirm(`Видалити ${p.name}?`) && run(() => api.kick(room.code, token, p.id))}
                  >
                    ×
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="label mb-2">{isHost ? "Обери гру" : "Ігри вечора"}</h2>
        <ol className="divide-y divide-line">
          {room.games.map((g, i) => (
            <GameRow
              key={g.id}
              n={i + 1}
              g={g}
              isHost={isHost}
              enough={room.players.length >= g.min_players}
              onStart={() => run(() => api.startGame(room.code, token, g.id))}
            />
          ))}
        </ol>
        {!isHost && <p className="label mt-3 text-center">Гру запускає ведучий</p>}
      </div>

      {!room.premium && <Premium room={room} />}
    </div>
  );
}

function GameRow({ n, g, isHost, enough, onStart }: {
  n: number; g: GameMeta; isHost: boolean; enough: boolean; onStart: () => void;
}) {
  return (
    <li className={`flex items-center gap-3 py-3.5 ${g.locked ? "opacity-60" : ""}`}>
      <Num n={n} className="w-6 shrink-0 self-start pt-1 text-xs text-red" />
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold uppercase">{g.title}</p>
        <p className="text-sm text-muted">{g.description}</p>
        <p className="label mt-1">
          {g.premium && <span className="text-red">premium · </span>}
          {g.tag}
        </p>
      </div>
      {isHost &&
        (g.locked ? (
          <span className="label shrink-0">закрито</span>
        ) : (
          <button
            className="btn-primary shrink-0 px-4 py-2.5 text-xs"
            disabled={!enough}
            onClick={onStart}
            title={enough ? "" : `Потрібно ${g.min_players}+ гравців`}
          >
            Грати
          </button>
        ))}
    </li>
  );
}

function Premium({ room }: { room: RoomView }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card border-red/40 bg-gradient-to-br from-red/15 via-surface/90 to-surface/90">
      <span className="label text-red">premium</span>
      <h2 className="display mt-2 text-2xl">Відкрийте ще 3 ігри</h2>
      <p className="mt-2 text-sm text-muted">
        Задонать від <b className="text-fg">{room.premium_price_uah} грн</b> на банку й напиши в коментарі код
        кімнати. Ігри відкриються для всіх у кімнаті автоматично, за кілька секунд.
      </p>
      <button
        className="mt-4 w-full rounded-2xl border border-dashed border-red/60 py-3 font-mono text-2xl font-semibold tracking-[0.3em] text-red"
        onClick={() => {
          navigator.clipboard?.writeText(room.code);
          setCopied(true);
        }}
      >
        {room.code}
        <span className="label ml-3 tracking-[0.1em]">{copied ? "скопійовано" : "копіювати"}</span>
      </button>
      {room.jar_url ? (
        <a className="btn-primary mt-3 w-full" href={room.jar_url} target="_blank" rel="noreferrer">
          Банка monobank
        </a>
      ) : (
        <p className="label mt-3">Банка ще не налаштована</p>
      )}
    </div>
  );
}

function Scoreboard({ room, byId }: { room: RoomView; byId: GameProps["byId"] }) {
  const rows = room.leaderboard.filter((r) => byId[r.player_id]);
  const leader = rows[0] && rows[0].points > 0 ? byId[rows[0].player_id] : null;

  const share = async () => {
    if (!leader) return;
    const text = `MVP вечора в sqUAd: ${leader.name}, ${rows[0].points} балів. Ігор зіграно: ${room.history.length}`;
    if (navigator.share) await navigator.share({ title: "sqUAd", text, url: window.location.origin }).catch(() => {});
    else await navigator.clipboard?.writeText(text);
  };

  return (
    <div className="space-y-4">
      {leader && (
        <div className="pop card relative overflow-hidden border-red/50 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--glow),transparent_70%)]" />
          <div className="relative">
            <span className="label">MVP вечора</span>
            <div className="mt-4 flex justify-center">
              <Avatar p={leader} size="h-20 w-20 text-3xl" />
            </div>
            <p className="display mt-4 text-3xl">{leader.name}</p>
            <p className="mt-1 font-mono text-red">{rows[0].points} балів</p>
            <button className="btn-ghost mt-4" onClick={share}>
              Поділитися
            </button>
          </div>
        </div>
      )}
      <div className="card">
        <h2 className="label mb-2">Загальне табло</h2>
        <ol className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.player_id} className="flex items-center gap-3 py-3">
              <Num n={i + 1} className={`w-6 text-sm ${i === 0 && r.points > 0 ? "text-red" : "text-muted"}`} />
              <Avatar p={byId[r.player_id]} size="h-9 w-9 text-sm" />
              <span className="flex-1 truncate font-semibold">{byId[r.player_id].name}</span>
              <span className="font-mono text-lg font-semibold">{r.points}</span>
            </li>
          ))}
        </ol>
        {room.history.length > 0 && (
          <p className="label mt-4 leading-relaxed">Зіграно: {room.history.map((h) => h.title).join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
