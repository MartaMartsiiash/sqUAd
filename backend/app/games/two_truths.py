"""Правда чи брехня: two truths and a lie about yourself; the others find the lie.

Phases: write -> (guess -> reveal) for every author -> finished.
"""

from __future__ import annotations

from app.domain.room import DomainError
from app.games.base import Game, add_points, clean_text, require_phase, require_player

WRITE_SECONDS = 3 * 60
GUESS_SECONDS = 45
REVEAL_SECONDS = 12


class TwoTruths(Game):
    id = "two_truths"
    title = "Правда чи брехня"
    tag = "блеф · про себе"
    description = "Дві правди, одна брехня. Хто кого розкусить?"
    rules = (
        "Кожен пише про себе три факти: два правдиві й один вигаданий, і позначає брехню. "
        "Потім по черзі показуємо факти кожного, а інші вгадують, де брехня. За правильну "
        "відповідь — 1 бал. Автор отримує 1 бал за кожного, кого обдурив."
    )
    min_players = 3

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        return {
            "phase": "write",
            "player_ids": ids,
            "entries": {},  # author -> {"facts": [3 str], "lie": int}
            "order": [],
            "turn": 0,
            "guesses": {},
            "last": None,
            "deadline": now + WRITE_SECONDS,
            "points": {pid: 0 for pid in ids},
        }

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        kind = action.get("type")
        if kind == "submit":
            require_phase(state, "write")
            facts = action.get("facts") or []
            lie = action.get("lie")
            if len(facts) != 3 or lie not in (0, 1, 2):
                raise DomainError("bad_entry", "Потрібно три факти і позначена брехня")
            state["entries"][player_id] = {"facts": [clean_text(f, 100) for f in facts], "lie": lie}
            if len(state["entries"]) == len(state["player_ids"]):
                self._start_guessing(state, now)
        elif kind == "guess":
            require_phase(state, "guess")
            author = state["order"][state["turn"]]
            if player_id == author:
                raise DomainError("own_entry", "Це ваші факти, чекайте")
            if action.get("choice") not in (0, 1, 2):
                raise DomainError("bad_guess", "Оберіть один із трьох фактів")
            state["guesses"][player_id] = action["choice"]
            if len(state["guesses"]) == len(state["player_ids"]) - 1:
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
                self._start_guessing(state, now)
            elif state["phase"] == "guess":
                self._reveal(state, now)
            elif state["phase"] == "reveal":
                self._next(state, now)
        return state

    def _start_guessing(self, state, now):
        order = [pid for pid in state["player_ids"] if pid in state["entries"]]
        state["order"] = order
        state["turn"] = 0
        if not order:
            state["phase"] = "finished"
            return
        state["phase"] = "guess"
        state["guesses"] = {}
        state["deadline"] = now + GUESS_SECONDS

    def _reveal(self, state, now):
        author = state["order"][state["turn"]]
        lie = state["entries"][author]["lie"]
        fooled = 0
        for pid, choice in state["guesses"].items():
            if choice == lie:
                add_points(state, pid, 1)
            else:
                fooled += 1
        add_points(state, author, fooled)
        state["last"] = {"author": author, "lie": lie, "guesses": state["guesses"], "fooled": fooled}
        state["phase"] = "reveal"
        state["deadline"] = now + REVEAL_SECONDS

    def _next(self, state, now):
        state["turn"] += 1
        state["guesses"] = {}
        if state["turn"] >= len(state["order"]):
            state["phase"] = "finished"
        else:
            state["phase"] = "guess"
            state["deadline"] = now + GUESS_SECONDS

    def view(self, state, player_id):
        out = {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "submitted": sorted(state["entries"].keys()),
            "my_entry": state["entries"].get(player_id),
            "points": state["points"],
        }
        if state["phase"] in ("guess", "reveal") and state["order"]:
            author = state["order"][state["turn"]]
            out.update(
                turn=state["turn"] + 1,
                turns=len(state["order"]),
                author=author,
                facts=state["entries"][author]["facts"],  # the lie index stays on the server
                guessed=sorted(state["guesses"].keys()),
                my_guess=state["guesses"].get(player_id),
            )
        if state["phase"] == "reveal":
            out["last"] = state["last"]
        return out
