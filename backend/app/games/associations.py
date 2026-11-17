"""Асоціації: everyone writes one word for the prompt; matching words score.

Phases per round: write -> reveal. Then the next round or finished.
"""

from __future__ import annotations

from collections import defaultdict

from app.domain.room import DomainError
from app.games.base import Game, add_points, clean_text, require_phase, require_player
from app.games.content import ASSOCIATION_WORDS

WRITE_SECONDS = 30
REVEAL_SECONDS = 12


def normalize(word: str) -> str:
    return word.casefold().replace("ʼ", "'").replace("’", "'").replace("ё", "е").strip(" .!?,")


class Associations(Game):
    id = "associations"
    title = "Асоціації"
    emoji = "🧠"
    description = "Думай як твоя компанія."
    rules = (
        "З'являється слово. За 30 секунд кожен пише одну асоціацію. За кожного, хто "
        "написав те саме слово, що й ти, отримуєш бал. Перемагає той, хто найкраще "
        "думає як компанія."
    )
    min_players = 3

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        rounds = max(1, min(int(settings.get("rounds", 5)), 10))
        return {
            "phase": "write",
            "player_ids": ids,
            "words": rng.sample(ASSOCIATION_WORDS, rounds),
            "round": 0,
            "answers": {},
            "last": None,
            "deadline": now + WRITE_SECONDS,
            "points": {pid: 0 for pid in ids},
        }

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        kind = action.get("type")
        if kind == "answer":
            require_phase(state, "write")
            state["answers"][player_id] = clean_text(action.get("text"), 30)
            if len(state["answers"]) == len(state["player_ids"]):
                self._reveal(state, now)
        elif kind == "next":
            require_phase(state, "reveal")
            self._next(state, now)
        else:
            raise DomainError("bad_action", "Невідома дія")
        return state

    def tick(self, state, now):
        if now >= state["deadline"]:
            if state["phase"] == "write":
                self._reveal(state, now)
            elif state["phase"] == "reveal":
                self._next(state, now)
        return state

    def _reveal(self, state, now):
        groups: dict[str, list[str]] = defaultdict(list)
        for pid, text in state["answers"].items():
            groups[normalize(text)].append(pid)
        round_points = {}
        for members in groups.values():
            for pid in members:
                round_points[pid] = len(members) - 1
                add_points(state, pid, len(members) - 1)
        state["last"] = {"answers": state["answers"], "round_points": round_points}
        state["phase"] = "reveal"
        state["deadline"] = now + REVEAL_SECONDS

    def _next(self, state, now):
        state["round"] += 1
        state["answers"] = {}
        if state["round"] >= len(state["words"]):
            state["phase"] = "finished"
        else:
            state["phase"] = "write"
            state["deadline"] = now + WRITE_SECONDS

    def view(self, state, player_id):
        idx = min(state["round"], len(state["words"]) - 1)
        return {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "round": idx + 1,
            "rounds": len(state["words"]),
            "word": state["words"][idx],
            "answered": sorted(state["answers"].keys()),
            "my_answer": state["answers"].get(player_id),
            "last": state["last"] if state["phase"] != "write" else None,
            "points": state["points"],
        }
