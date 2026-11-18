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

EMOJIS = ["🦊", "🐸", "🐼", "🦄", "🐙", "🐝", "🦉", "🐯", "🐨", "🐵", "🐧", "🐢", "🦖", "🐳", "🦋", "🐞"]
COLORS = [
    "#d1102f",
    "#f2f2f2",
    "#e05a6f",
    "#9a9a9a",
    "#ff7d8e",
    "#c9c9c9",
    "#a3001b",
    "#7a7a7a",
    "#f4b6bf",
    "#bfbfbf",
    "#e8325a",
    "#dcdcdc",
    "#c2185b",
    "#adadad",
    "#ff4f6a",
    "#e6e6e6",
]


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
    emoji: str
    color: str
    token: str
    joined_at: float
    last_seen: float
    is_host: bool = False

    def public(self, now: float) -> dict[str, Any]:
        """What other phones may see: never the token."""
        return {
            "id": self.id,
            "name": self.name,
            "emoji": self.emoji,
            "color": self.color,
            "is_host": self.is_host,
            "online": now - self.last_seen < 15,
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

    def add_player(self, name: str, emoji: str | None, now: float, is_host: bool = False) -> Player:
        name = " ".join(name.split())[:MAX_NAME_LENGTH]
        if not name:
            raise DomainError("bad_name", "Введіть ім'я")
        if len(self.players) >= MAX_PLAYERS:
            raise DomainError("room_full", f"У кімнаті вже {MAX_PLAYERS} гравців")
        if any(p.name.casefold() == name.casefold() for p in self.players):
            raise DomainError("name_taken", "Це ім'я вже зайняте, оберіть інше", 409)
        used = {p.emoji for p in self.players}
        if not emoji or emoji in used:
            emoji = next((e for e in EMOJIS if e not in used), EMOJIS[len(self.players) % len(EMOJIS)])
        player = Player(
            id=secrets.token_hex(4),
            name=name,
            emoji=emoji,
            color=COLORS[len(self.players) % len(COLORS)],
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
