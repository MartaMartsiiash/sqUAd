"""Хто з нас...?: everyone secretly votes for a friend; agree with the group to score.

Phases per round: vote -> reveal. Then the next round or finished.
"""

from __future__ import annotations

from collections import Counter

from app.domain.room import DomainError
from app.games.base import Game, add_points, require_phase, require_player
from app.games.content import WHO_OF_US_QUESTIONS

VOTE_SECONDS = 40
REVEAL_SECONDS = 12


class WhoOfUs(Game):
    id = "who_of_us"
    title = "Хто з нас...?"
    tag = "таємне голосування"
    description = "Таємне голосування: хто з вас найімовірніше..."
    rules = (
        "На екрані питання на кшталт «Хто з нас проспить першу пару?». Кожен таємно "
        "голосує за когось із компанії (можна і за себе). Бал отримує кожен, хто "
        "проголосував так само, як більшість."
    )
    min_players = 3

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        rounds = max(1, min(int(settings.get("rounds", 5)), 10))
        return {
            "phase": "vote",
            "player_ids": ids,
            "questions": rng.sample(WHO_OF_US_QUESTIONS, rounds),
            "round": 0,
            "votes": {},
            "last": None,
            "deadline": now + VOTE_SECONDS,
            "points": {pid: 0 for pid in ids},
        }

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        kind = action.get("type")
        if kind == "vote":
            require_phase(state, "vote")
            target = action.get("target")
            if target not in state["player_ids"]:
                raise DomainError("bad_vote", "Оберіть гравця")
            state["votes"][player_id] = target
            if len(state["votes"]) == len(state["player_ids"]):
                self._reveal(state, now)
        elif kind == "next":
            require_phase(state, "reveal")
            self._next(state, now)
        else:
            raise DomainError("bad_action", "Невідома дія")
        return state

    def tick(self, state, now):
        if now >= state["deadline"]:
            if state["phase"] == "vote":
                self._reveal(state, now)
            elif state["phase"] == "reveal":
                self._next(state, now)
        return state

    def _reveal(self, state, now):
        counts = Counter(state["votes"].values())
        top = max(counts.values()) if counts else 0
        winners = sorted(pid for pid, n in counts.items() if n == top)
        for voter, target in state["votes"].items():
            if target in winners:
                add_points(state, voter, 1)
        state["last"] = {"counts": dict(counts), "winners": winners, "votes": state["votes"]}
        state["phase"] = "reveal"
        state["deadline"] = now + REVEAL_SECONDS

    def _next(self, state, now):
        state["round"] += 1
        state["votes"] = {}
        if state["round"] >= len(state["questions"]):
            state["phase"] = "finished"
        else:
            state["phase"] = "vote"
            state["deadline"] = now + VOTE_SECONDS

    def view(self, state, player_id):
        idx = min(state["round"], len(state["questions"]) - 1)
        return {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "round": idx + 1,
            "rounds": len(state["questions"]),
            "question": state["questions"][idx],
            "voted": sorted(state["votes"].keys()),
            "my_vote": state["votes"].get(player_id),
            "last": state["last"] if state["phase"] != "vote" else None,
            "points": state["points"],
        }
