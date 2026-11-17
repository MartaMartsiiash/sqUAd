"""Ні так, ні ні (Ni Oui Ni Non): answer for 2 minutes without saying "yes" or "no".

Each player takes a turn in the hot seat. The others get provocative questions
on their phones and fire them at the player. Anyone who hears a forbidden word
presses "Caught!". Phases per turn: ready -> turn -> result.
"""

from __future__ import annotations

from app.domain.room import DomainError
from app.games.base import Game, add_points, require_phase, require_player
from app.games.content import NI_TAK_FORBIDDEN, NI_TAK_QUESTIONS

TURN_SECONDS = 120
SECONDS_PER_POINT = 30
QUESTIONS_PER_TURN = 10
RESULT_SECONDS = 15


class NiTakNiNi(Game):
    id = "ni_tak_ni_ni"
    title = "Ні так, ні ні"
    tag = "розмовна · на швидкість"
    description = "Дві хвилини без «так» і «ні». Табу на стероїдах."
    rules = (
        "Гравці по черзі сідають на «гаряче крісло». Дві хвилини решта засипає його питаннями "
        "з екрана, а він відповідає, не кажучи «так», «ні» та їхніх замінників (список "
        "заборонених слів підсвічено). Почули заборонене слово — тисніть «Попався!». "
        "Гравець отримує 1 бал за кожні 30 секунд, які протримався, а той, хто впіймав, — 1 бал."
    )
    min_players = 3

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        order = ids[:]
        rng.shuffle(order)
        turns = max(1, min(int(settings.get("turns", len(order))), len(order)))
        return {
            "phase": "ready",
            "player_ids": ids,
            "order": order[:turns],
            "turn": 0,
            "questions": [rng.sample(NI_TAK_QUESTIONS, QUESTIONS_PER_TURN) for _ in range(turns)],
            "started_at": None,
            "deadline": None,
            "last": None,
            "points": {pid: 0 for pid in ids},
        }

    def _hot(self, state) -> str:
        return state["order"][state["turn"]]

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        kind = action.get("type")
        if kind == "begin":
            require_phase(state, "ready")
            state["phase"] = "turn"
            state["started_at"] = now
            state["deadline"] = now + TURN_SECONDS
        elif kind == "caught":
            require_phase(state, "turn")
            if player_id == self._hot(state):
                raise DomainError("own_turn", "Себе впіймати не можна")
            self._finish_turn(state, now, caught_by=player_id)
        elif kind == "next":
            require_phase(state, "result")
            self._next(state, now)
        else:
            raise DomainError("bad_action", "Невідома дія")
        return state

    def tick(self, state, now):
        if state["phase"] == "turn" and now >= state["deadline"]:
            self._finish_turn(state, state["deadline"], caught_by=None)
        elif state["phase"] == "result" and state["deadline"] and now >= state["deadline"]:
            self._next(state, now)
        return state

    def _finish_turn(self, state, at, caught_by):
        hot = self._hot(state)
        survived = int(min(TURN_SECONDS, max(0, at - state["started_at"])))
        earned = survived // SECONDS_PER_POINT
        add_points(state, hot, earned)
        if caught_by:
            add_points(state, caught_by, 1)
        state["last"] = {"player": hot, "survived": survived, "earned": earned, "caught_by": caught_by}
        state["phase"] = "result"
        state["deadline"] = at + RESULT_SECONDS

    def _next(self, state, now):
        state["turn"] += 1
        state["started_at"] = None
        if state["turn"] >= len(state["order"]):
            state["phase"] = "finished"
            state["deadline"] = None
        else:
            state["phase"] = "ready"
            state["deadline"] = None

    def view(self, state, player_id):
        idx = min(state["turn"], len(state["order"]) - 1)
        hot = state["order"][idx]
        is_hot = player_id == hot
        return {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "turn": idx + 1,
            "turns": len(state["order"]),
            "hot": hot,
            "is_hot": is_hot,
            # The player in the hot seat does not see the questions coming.
            "questions": None if is_hot else state["questions"][idx],
            "forbidden": NI_TAK_FORBIDDEN,
            "total_seconds": TURN_SECONDS,
            "last": state["last"] if state["phase"] in ("result", "finished") else None,
            "points": state["points"],
        }
