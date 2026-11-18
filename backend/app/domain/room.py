"""Room and Player: the platform's domain model.

Plain classes with no HTTP and no database, so the rules here are tested
directly. A room is stored as one JSON document (see PROJECT.md, section 8),
which is why every class has to_dict / from_dict.
"""

from __future__ import annotations

import secrets
from dataclasses import asdict, dataclass, field
from typing import Any

# No 0/O and 1/I: the code is read aloud and typed on a phone.
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 5
MAX_PLAYERS = 16
MAX_NAME_LENGTH = 20

# Avatar colours: a chrome mannequin head in each (frontend/public/heads/<name>.png).
OFFLINE_AFTER_SECONDS = 15

AVATAR_COLORS = ["silver", "cherry", "rose", "violet", "gold", "ice", "graphite", "mint"]


class DomainError(Exception):
    """A rule was broken. `code` is stable and safe to show to the client."""

    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def new_room_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def normalize_code(code: str) -> str:
    """Phones type lowercase and add spaces; the stored code is uppercase."""
    return "".join(code.split()).upper()


@dataclass
class Player:
    id: str
    name: str
    color: str
    token: str
    joined_at: float
    last_seen: float
    is_host: bool = False
    emoji: str = ""  # unused since avatars became chrome heads; kept so old rooms still load

    def public(self, now: float) -> dict[str, Any]:
        """What other phones may see: never the token."""
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "is_host": self.is_host,
            "online": now - self.last_seen < OFFLINE_AFTER_SECONDS,
        }


@dataclass
class Room:
    code: str
    host_sub: str  # Cognito user id of the host
    created_at: float
    expires_at: float
    players: list[Player] = field(default_factory=list)
    scores: dict[str, int] = field(default_factory=dict)  # player id -> points tonight
    history: list[dict[str, Any]] = field(default_factory=list)  # finished games
    used: dict[str, list[str]] = field(default_factory=dict)  # game id -> content already played
    game_id: str | None = None
    game_state: dict[str, Any] | None = None
    premium: bool = False  # unlimited games, after a donation
    games_started: int = 0
    games_played: int = 0  # finished games: only these use up the free ones
    version: int = 0

    # ----- players -------------------------------------------------------

    def player(self, player_id: str) -> Player:
        for p in self.players:
            if p.id == player_id:
                return p
        raise DomainError("player_not_found", "Такого гравця немає в кімнаті", 404)

    def player_by_token(self, token: str | None) -> Player:
        if token:
            for p in self.players:
                if secrets.compare_digest(p.token, token):
                    return p
        raise DomainError("not_in_room", "Ви не в цій кімнаті. Приєднайтеся за кодом", 403)

    def host(self) -> Player:
        for p in self.players:
            if p.is_host:
                return p
        raise DomainError("no_host", "У кімнати немає ведучого", 500)

    def add_player(self, name: str, color: str | None, now: float, is_host: bool = False) -> Player:
        name = " ".join(name.split())[:MAX_NAME_LENGTH]
        if not name:
            raise DomainError("bad_name", "Введіть ім'я")
        same = next((p for p in self.players if p.name.casefold() == name.casefold()), None)
        if same is not None:
            # Coming back from another browser (a link opened in Telegram, then Safari):
            # each browser keeps its own session, so the old one is lost. If that player
            # is offline, hand their seat, score and game role to the new browser.
            if same.is_host or now - same.last_seen < OFFLINE_AFTER_SECONDS:
                raise DomainError(
                    "name_taken",
                    "Гравець з цим ім'ям зараз онлайн. Якщо це ви, закрийте стару вкладку "
                    "і спробуйте за 15 секунд",
                    409,
                )
            same.token = secrets.token_urlsafe(24)
            same.last_seen = now
            if color in AVATAR_COLORS:
                same.color = color
            return same
        if len(self.players) >= MAX_PLAYERS:
            raise DomainError("room_full", f"У кімнаті вже {MAX_PLAYERS} гравців")
        taken = [p.color for p in self.players]
        if color not in AVATAR_COLORS:
            free = [c for c in AVATAR_COLORS if c not in taken]
            color = free[0] if free else AVATAR_COLORS[len(self.players) % len(AVATAR_COLORS)]
        player = Player(
            id=secrets.token_hex(4),
            name=name,
            color=color,
            token=secrets.token_urlsafe(24),
            joined_at=now,
            last_seen=now,
            is_host=is_host,
        )
        self.players.append(player)
        self.scores.setdefault(player.id, 0)
        return player

    def remove_player(self, player_id: str) -> None:
        player = self.player(player_id)
        if player.is_host:
            raise DomainError("cannot_kick_host", "Ведучого не можна видалити")
        self.players = [p for p in self.players if p.id != player_id]

    def leave(self, player_id: str) -> None:
        """A player leaves on their own. If the host leaves, the next player becomes host."""
        player = self.player(player_id)
        self.players = [p for p in self.players if p.id != player_id]
        if player.is_host and self.players:
            self.players[0].is_host = True

    # ----- scores --------------------------------------------------------

    def award(self, game_id: str, title: str, points: dict[str, int], now: float) -> None:
        """Add a finished game's points to tonight's scoreboard."""
        for pid, pts in points.items():
            if pid in self.scores:
                self.scores[pid] += pts
        self.history.append({"game_id": game_id, "title": title, "points": points, "at": now})
        self.games_played += 1

    def leaderboard(self) -> list[dict[str, Any]]:
        rows = [{"player_id": p.id, "points": self.scores.get(p.id, 0)} for p in self.players]
        return sorted(rows, key=lambda r: -r["points"])

    # ----- storage -------------------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Room:
        data = dict(data)
        data["players"] = [Player(**p) for p in data.get("players", [])]
        return cls(**data)
