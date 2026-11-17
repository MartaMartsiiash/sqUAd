// Typed client for the sqUAd backend (PROJECT.md, section 6).

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type PlayerPublic = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  is_host: boolean;
  online: boolean;
};

export type GameMeta = {
  id: string;
  title: string;
  description: string;
  rules: string;
  tag: string;
  min_players: number;
  locked: boolean;
};

// Every game sends its own view; the game screens know its shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GameView = Record<string, any> & { phase: string; deadline?: number };

export type RoomView = {
  code: string;
  version: number;
  server_time: number;
  me: PlayerPublic;
  players: PlayerPublic[];
  scores: Record<string, number>;
  leaderboard: { player_id: string; points: number }[];
  history: { game_id: string; title: string; points: Record<string, number>; at: number }[];
  premium: boolean;
  free_games: number;
  /** free games left in this room; null once a donation unlocked unlimited games */
  free_left: number | null;
  premium_price_uah: number;
  jar_url: string;
  games: GameMeta[];
  game: null | {
    id: string;
    title: string;
    tag: string;
    rules: string;
    player_ids: string[];
    view: GameView;
  };
};

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string; auth?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.token) headers["X-Player-Token"] = init.token;
  if (init.auth) headers["Authorization"] = `Bearer ${init.auth}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "network", "Немає зв'язку з сервером");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.code ?? "error", err.message ?? "Щось пішло не так");
  }
  return body as T;
}

type Joined = { code: string; player_id: string; token: string };

export const api = {
  games: () => request<GameMeta[]>("/api/games"),
  createRoom: (auth: string, name: string, emoji?: string) =>
    request<Joined>("/api/rooms", { method: "POST", auth, body: JSON.stringify({ name, emoji }) }),
  join: (code: string, name: string, emoji?: string) =>
    request<Joined>(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ name, emoji }),
    }),
  room: (code: string, token: string) => request<RoomView>(`/api/rooms/${code}`, { token }),
  startGame: (code: string, token: string, game_id: string, settings: object = {}) =>
    request<RoomView>(`/api/rooms/${code}/games`, {
      method: "POST",
      token,
      body: JSON.stringify({ game_id, settings }),
    }),
  stopGame: (code: string, token: string) =>
    request<RoomView>(`/api/rooms/${code}/games/stop`, { method: "POST", token }),
  act: (code: string, token: string, action: object) =>
    request<RoomView>(`/api/rooms/${code}/actions`, { method: "POST", token, body: JSON.stringify(action) }),
  kick: (code: string, token: string, playerId: string) =>
    request<RoomView>(`/api/rooms/${code}/players/${playerId}`, { method: "DELETE", token }),
};

// The player's token for a room lives in this browser, so a reload brings them back.
const key = (code: string) => `squad:room:${code.toUpperCase()}`;
export const session = {
  get: (code: string): string | null => {
    try {
      return localStorage.getItem(key(code));
    } catch {
      return null;
    }
  },
  set: (code: string, token: string) => {
    try {
      localStorage.setItem(key(code), token);
    } catch {
      /* private mode: the session lasts until the tab closes */
    }
  },
  clear: (code: string) => {
    try {
      localStorage.removeItem(key(code));
    } catch {
      /* ignore */
    }
  },
};
