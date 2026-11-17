"""RoomService: the platform's use cases.

Every change to a room goes through `_mutate`: load the room, change it in
memory, save it with a conditional write. If two phones acted at the same
moment and the other one saved first, we reload and apply our change again
(PROJECT.md, section 6, "Concurrency").
"""

from __future__ import annotations

import json
import random
import time
from collections.abc import Callable
from typing import Any

from app.config import Settings
from app.domain.room import DomainError, Room, new_room_code, normalize_code
from app.games.registry import all_games, get_game
from app.repositories.base import RoomRepository, VersionConflict

MAX_RETRIES = 4
TOUCH_EVERY_SECONDS = 10


class RoomService:
    def __init__(
        self,
        repo: RoomRepository,
        settings: Settings,
        clock: Callable[[], float] = time.time,
        rng: random.Random | None = None,
    ) -> None:
        self.repo = repo
        self.settings = settings
        self.clock = clock
        self.rng = rng or random.SystemRandom()

    # ----- helpers -------------------------------------------------------

    def _load(self, code: str) -> Room:
        room = self.repo.get(normalize_code(code))
        if room is None or room.expires_at < self.clock():
            raise DomainError("room_not_found", "Кімнату з таким кодом не знайдено", 404)
        return room

    def _mutate(self, code: str, change: Callable[[Room], Any]) -> tuple[Room, Any]:
        for _ in range(MAX_RETRIES):
            room = self._load(code)
            expected = room.version
            result = change(room)
            try:
                self.repo.save(room, expected)
                return room, result
            except VersionConflict:
                continue
        raise DomainError("busy", "Забагато одночасних дій, спробуйте ще раз", 409)

    def _advance_game(self, room: Room) -> None:
        """Run timers and, if the game just ended, add its points to the scoreboard."""
        if not room.game_id or room.game_state is None:
            return
        game = get_game(room.game_id)
        now = self.clock()
        room.game_state = game.tick(room.game_state, now)
        if not room.game_state.get("_awarded"):
            points = game.result(room.game_state)
            if points is not None:
                room.award(game.id, game.title, points, now)
                room.game_state["_awarded"] = True

    def _require_host(self, room: Room, token: str | None) -> None:
        if not room.player_by_token(token).is_host:
            raise DomainError("host_only", "Це може зробити лише ведучий", 403)

    # ----- use cases -----------------------------------------------------

    def create_room(self, host_sub: str, host_name: str, emoji: str | None = None) -> tuple[Room, Any]:
        now = self.clock()
        for _ in range(10):
            room = Room(
                code=new_room_code(),
                host_sub=host_sub,
                created_at=now,
                expires_at=now + self.settings.room_ttl_hours * 3600,
            )
            host = room.add_player(host_name, emoji, now, is_host=True)
            if self.repo.create(room):
                return room, host
        raise DomainError("no_code", "Не вдалося створити кімнату, спробуйте ще раз", 500)

    def join(self, code: str, name: str, emoji: str | None = None):
        def change(room: Room):
            return room.add_player(name, emoji, self.clock())

        room, player = self._mutate(code, change)
        return room, player

    def view(self, code: str, token: str | None) -> dict[str, Any]:
        room = self._load(code)
        me = room.player_by_token(token)
        before = json.dumps(room.game_state, sort_keys=True, default=str)
        self._advance_game(room)
        changed = json.dumps(room.game_state, sort_keys=True, default=str) != before
        stale = self.clock() - room.player(me.id).last_seen > TOUCH_EVERY_SECONDS
        if changed or stale:

            def change(r: Room):
                self._advance_game(r)
                r.player(me.id).last_seen = self.clock()

            try:
                room, _ = self._mutate(code, change)
            except DomainError:
                pass  # a read must not fail because a write was busy; next poll catches up
        return self._render(room, room.player(me.id).id)

    def start_game(
        self, code: str, token: str | None, game_id: str, settings: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        game = get_game(game_id)

        def change(room: Room):
            self._require_host(room, token)
            if game.premium and not room.premium:
                raise DomainError("premium_locked", "Ця гра відкривається донатом", 402)
            if len(room.players) < game.min_players:
                raise DomainError(
                    "not_enough_players", f"Для цієї гри потрібно щонайменше {game.min_players} гравці"
                )
            players = [{"id": p.id, "name": p.name} for p in room.players]
            room.game_id = game.id
            room.game_state = game.start(players, settings or {}, self.rng, self.clock())

        room, _ = self._mutate(code, change)
        return self._render(room, room.player_by_token(token).id)

    def act(self, code: str, token: str | None, action: dict[str, Any]) -> dict[str, Any]:
        def change(room: Room):
            me = room.player_by_token(token)
            if not room.game_id or room.game_state is None:
                raise DomainError("no_game", "Зараз немає гри")
            self._advance_game(room)
            game = get_game(room.game_id)
            room.game_state = game.act(room.game_state, me.id, action, self.clock())
            self._advance_game(room)
            me.last_seen = self.clock()
            return me.id

        room, me_id = self._mutate(code, change)
        return self._render(room, me_id)

    def stop_game(self, code: str, token: str | None) -> dict[str, Any]:
        """Back to the lobby. Points of an unfinished game are not counted."""

        def change(room: Room):
            self._require_host(room, token)
            room.game_id = None
            room.game_state = None

        room, _ = self._mutate(code, change)
        return self._render(room, room.player_by_token(token).id)

    def kick(self, code: str, token: str | None, player_id: str) -> dict[str, Any]:
        def change(room: Room):
            self._require_host(room, token)
            room.remove_player(player_id)

        room, _ = self._mutate(code, change)
        return self._render(room, room.player_by_token(token).id)

    def unlock_premium(self, code: str) -> bool:
        try:
            self._mutate(code, lambda room: setattr(room, "premium", True))
            return True
        except DomainError:
            return False

    # ----- what one phone sees -------------------------------------------

    def _render(self, room: Room, me_id: str) -> dict[str, Any]:
        now = self.clock()
        me = room.player(me_id)
        game = None
        if room.game_id and room.game_state is not None:
            g = get_game(room.game_id)
            state = room.game_state
            game = {
                "id": g.id,
                "title": g.title,
                "emoji": g.emoji,
                "rules": g.rules,
                "player_ids": state.get("player_ids", []),
                "view": g.view(state, me_id)
                if me_id in state.get("player_ids", [])
                else {"phase": state.get("phase"), "spectator": True},
            }
        games = [{**meta, "locked": meta["premium"] and not room.premium} for meta in all_games()]
        return {
            "code": room.code,
            "version": room.version,
            "server_time": now,
            "me": {**me.public(now), "id": me.id},
            "players": [p.public(now) for p in room.players],
            "scores": room.scores,
            "leaderboard": room.leaderboard(),
            "history": room.history,
            "premium": room.premium,
            "premium_price_uah": self.settings.premium_price_uah,
            "jar_url": self.settings.mono_jar_url,
            "games": games,
            "game": game,
        }
