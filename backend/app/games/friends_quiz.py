"""Квіз про друзів (premium): how well do you know your friends?

Each round one player is the subject. The subject secretly picks one of two
options ("Море чи гори?"); everyone else guesses what they picked.
Phases per round: pick -> reveal. Then the next round or finished.
"""

from __future__ import annotations

from app.domain.room import DomainError
from app.games.base import Game, add_points, require_phase, require_player
from app.games.content import FRIENDS_QUIZ_PAIRS

PICK_SECONDS = 30
REVEAL_SECONDS = 10


class FriendsQuiz(Game):
    id = "friends_quiz"
    title = "Квіз про друзів"
    emoji = "💛"
    description = "Наскільки добре ти знаєш свою компанію?"
    rules = (
        "Кожного раунду один гравець — «герой». Він таємно обирає: море чи гори, кава чи "
        "чай... Інші вгадують його вибір. Правильна відповідь — 1 бал. Герой отримує 1 бал, "
        "якщо його вибір вгадала хоча б половина компанії."
    )
    min_players = 3
    premium = True

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        subjects = ids[:]
        rng.shuffle(subjects)
        subjects = subjects[: min(len(subjects), 8)]
        return {
            "phase": "pick",
            "player_ids": ids,
            "subjects": subjects,
            "pairs": [list(p) for p in rng.sample(FRIENDS_QUIZ_PAIRS, len(subjects))],
            "round": 0,
            "choice": None,
            "guesses": {},
            "last": None,
            "deadline": now + PICK_SECONDS,
            "points": {pid: 0 for pid in ids},
        }

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        kind = action.get("type")
        subject = state["subjects"][state["round"]] if state["phase"] != "finished" else None
        if kind == "pick":
            require_phase(state, "pick")
            if action.get("choice") not in (0, 1):
                raise DomainError("bad_choice", "Оберіть один з двох варіантів")
            if player_id == subject:
                state["choice"] = action["choice"]
            else:
                state["guesses"][player_id] = action["choice"]
            if state["choice"] is not None and len(state["guesses"]) == len(state["player_ids"]) - 1:
                self._reveal(state, now)
        elif kind == "next":
            require_phase(state, "reveal")
            self._next(state, now)
        else:
            raise DomainError("bad_action", "Невідома дія")
        return state

    def tick(self, state, now):
        if now >= state["deadline"]:
            if state["phase"] == "pick":
                self._reveal(state, now)
            elif state["phase"] == "reveal":
                self._next(state, now)
        return state

    def _reveal(self, state, now):
        subject = state["subjects"][state["round"]]
        choice = state["choice"]
        right = [pid for pid, g in state["guesses"].items() if choice is not None and g == choice]
        for pid in right:
            add_points(state, pid, 1)
        others = len(state["player_ids"]) - 1
        if choice is not None and others and len(right) * 2 >= others:
            add_points(state, subject, 1)
        state["last"] = {"subject": subject, "choice": choice, "guesses": state["guesses"], "right": right}
        state["phase"] = "reveal"
        state["deadline"] = now + REVEAL_SECONDS

    def _next(self, state, now):
        state["round"] += 1
        state["choice"] = None
        state["guesses"] = {}
        if state["round"] >= len(state["subjects"]):
            state["phase"] = "finished"
        else:
            state["phase"] = "pick"
            state["deadline"] = now + PICK_SECONDS

    def view(self, state, player_id):
        idx = min(state["round"], len(state["subjects"]) - 1)
        subject = state["subjects"][idx]
        return {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "round": idx + 1,
            "rounds": len(state["subjects"]),
            "subject": subject,
            "pair": state["pairs"][idx],
            "is_subject": player_id == subject,
            "answered": sorted(state["guesses"].keys()) + ([subject] if state["choice"] is not None else []),
            "my_answer": state["choice"] if player_id == subject else state["guesses"].get(player_id),
            "last": state["last"] if state["phase"] != "pick" else None,
            "points": state["points"],
        }
