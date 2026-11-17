import type { GameView, PlayerPublic, RoomView } from "../api/client";

export type GameProps = {
  room: RoomView;
  view: GameView;
  me: PlayerPublic;
  isHost: boolean;
  /** player id -> player */
  byId: Record<string, PlayerPublic>;
  /** server clock minus this phone's clock, in seconds */
  offset: number;
  act: (action: object) => Promise<void>;
};
