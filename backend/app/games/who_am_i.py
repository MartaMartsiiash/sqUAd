"""Хто я? (premium): you see everyone's character except your own.

Phases: play -> finished. Players ask yes/no questions out loud and press
"I guessed it" (the others confirm out loud). Earlier guesses score more.
"""

from __future__ import annotations

from app.domain.room import DomainError
from app.games.base import Game, add_points, require_phase, require_player
from app.games.content import WHO_AM_I_CHARACTERS

PLAY_SECONDS = 10 * 60


class WhoAmI(Game):
    id = "who_am_i"
    title = "Хто я?"
    emoji = "🎭"
    description = "Бачиш персонажів друзів, але не свого."
    rules = (
        "Кожен отримує персонажа, але на своєму телефоні бачить лише персонажів інших. "
        "По черзі ставте питання, на які можна відповісти «так» чи «ні». Вгадали — тисніть "
        "«Я вгадав(ла)!». Хто раніше вгадав, той більше балів отримав."
    )
    min_players = 3
    premium = True

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        chars = rng.sample(WHO_AM_I_CHARACTERS, len(ids))
        return {
            "phase": "play",
            "player_ids": ids,
            "characters": dict(zip(ids, chars, strict=True)),
            "guessed": [],
            "gave_up": [],
            "deadline": now + PLAY_SECONDS,
            "points": {pid: 0 for pid in ids},
        }

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        require_phase(state, "play")
        done = set(state["guessed"]) | set(state["gave_up"])
        kind = action.get("type")
        if player_id in done:
            raise DomainError("already_done", "Ви вже завершили цю гру")
        if kind == "guessed":
            state["guessed"].append(player_id)
            add_points(state, player_id, max(1, len(state["player_ids"]) - len(state["guessed"]) + 1))
        elif kind == "give_up":
            state["gave_up"].append(player_id)
        else:
            raise DomainError("bad_action", "Невідома дія")
        if len(state["guessed"]) + len(state["gave_up"]) == len(state["player_ids"]):
            state["phase"] = "finished"
        return state

    def tick(self, state, now):
        if state["phase"] == "play" and now >= state["deadline"]:
            state["phase"] = "finished"
        return state

    def view(self, state, player_id):
        over = state["phase"] == "finished"
        mine_known = over or player_id in state["guessed"] or player_id in state["gave_up"]
        return {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "characters": {
                pid: name for pid, name in state["characters"].items() if pid != player_id or mine_known
            },
            "guessed": state["guessed"],
            "gave_up": state["gave_up"],
            "points": state["points"],
        }
