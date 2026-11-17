"""The contract every game follows (PROJECT.md, section 5).

The platform (rooms, players, polling, scoreboard) knows nothing about the
rules of a game, and a game knows nothing about HTTP or the database. A game
gets plain data in and returns plain data out; its whole state is a
JSON-friendly dict, so it can be stored inside the room item in DynamoDB.
"""

from __future__ import annotations

import random
from abc import ABC, abstractmethod
from typing import Any

from app.domain.room import DomainError

State = dict[str, Any]
PlayerInfo = dict[str, str]  # {"id": ..., "name": ...}


class Game(ABC):
    id: str = ""
    title: str = ""
    description: str = ""
    rules: str = ""
    tag: str = ""
    min_players: int = 3
    premium: bool = False

    def meta(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "rules": self.rules,
            "tag": self.tag,
            "min_players": self.min_players,
            "premium": self.premium,
        }

    @abstractmethod
    def start(
        self, players: list[PlayerInfo], settings: dict[str, Any], rng: random.Random, now: float
    ) -> State:
        """Deal roles, pick words, set the first phase."""

    @abstractmethod
    def act(self, state: State, player_id: str, action: dict[str, Any], now: float) -> State:
        """A player did something. Must check the action is allowed right now."""

    def tick(self, state: State, now: float) -> State:
        """Move on when a timer runs out. Called on every read. Default: nothing."""
        return state

    @abstractmethod
    def view(self, state: State, player_id: str) -> dict[str, Any]:
        """What this one phone may see. Secrets of other players are never included."""

    def result(self, state: State) -> dict[str, int] | None:
        """Points per player once the game is over, otherwise None."""
        if state.get("phase") == "finished":
            return dict(state.get("points", {}))
        return None


# ----- small helpers shared by the games ------------------------------------


def require_phase(state: State, *phases: str) -> None:
    if state.get("phase") not in phases:
        raise DomainError("wrong_phase", "Зараз цього зробити не можна")


def require_player(state: State, player_id: str) -> None:
    if player_id not in state.get("player_ids", []):
        raise DomainError("not_playing", "Ви не берете участі в цій грі")


def clean_text(value: Any, limit: int = 120) -> str:
    text = " ".join(str(value or "").split())[:limit]
    if not text:
        raise DomainError("empty_answer", "Відповідь не може бути порожньою")
    return text


def add_points(state: State, player_id: str, points: int) -> None:
    state["points"][player_id] = state["points"].get(player_id, 0) + points
