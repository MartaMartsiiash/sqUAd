"""Забуті слова: old and regional Ukrainian words, and a bluffing game.

Everyone sees a forgotten word and writes a believable fake meaning. Then all
the meanings, the real one among them, are shown and everyone votes for the
one they think is real. Phases per round: write -> vote -> reveal.
"""

from __future__ import annotations

import secrets

from app.domain.room import DomainError
from app.games.base import Game, add_points, clean_text, pick, require_phase, require_player, tidy_answer
from app.games.content import FORGOTTEN_WORDS

WRITE_SECONDS = 75
VOTE_SECONDS = 40
REVEAL_SECONDS = 45
REAL = "real"


def _norm(text: str) -> str:
    return " ".join(text.casefold().split()).strip(" .!,")


class ForgottenWords(Game):
    id = "forgotten_words"
    title = "Забуті слова"
    tag = "блеф · мова"
    description = "Старі й регіональні українські слова. Вигадай значення, яке всі приймуть за справжнє."
    rules = (
        "На екрані старе чи регіональне українське слово. Кожен вигадує йому правдоподібне "
        "значення. Потім усі значення, разом зі справжнім, перемішуються, і кожен голосує, "
        "яке справжнє. Вгадав — 2 бали. За кожного, хто повірив твоїй вигадці, — 1 бал."
    )
    min_players = 3

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        rounds = max(1, min(int(settings.get("rounds", 4)), 8))
        return {
            "phase": "write",
            "player_ids": ids,
            "words": (
                words := [
                    list(w)
                    for w in pick(
                        FORGOTTEN_WORDS, rounds, set(settings.get("_used", [])), rng, key=lambda w: w[0]
                    )
                ]
            ),
            "_used": [w[0] for w in words],
            "round": 0,
            "fakes": {},
            "options": [],
            "votes": {},
            "last": None,
            "deadline": now + WRITE_SECONDS,
            "points": {pid: 0 for pid in ids},
        }

    def _word(self, state):
        return state["words"][state["round"]]

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        kind = action.get("type")
        if kind == "fake":
            require_phase(state, "write")
            text = tidy_answer(clean_text(action.get("text"), 90))
            if _norm(text) == _norm(self._word(state)[1]):
                raise DomainError("too_true", "Це і є справжнє значення! Вигадай інше")
            state["fakes"][player_id] = text
            if len(state["fakes"]) == len(state["player_ids"]):
                self._open_vote(state, now)
        elif kind == "vote":
            require_phase(state, "vote")
            option = next((o for o in state["options"] if o["id"] == action.get("option")), None)
            if option is None:
                raise DomainError("bad_vote", "Оберіть один із варіантів")
            if player_id in option["authors"]:
                raise DomainError("own_option", "За свій варіант голосувати не можна")
            state["votes"][player_id] = option["id"]
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
            if state["phase"] == "write":
                self._open_vote(state, now)
            elif state["phase"] == "vote":
                self._reveal(state, now)
            elif state["phase"] == "reveal":
                self._next(state, now)
        return state

    def _open_vote(self, state, now):
        # Identical fakes become one option with several authors.
        merged: dict[str, dict] = {}
        for pid, text in state["fakes"].items():
            key = _norm(text)
            merged.setdefault(key, {"text": text, "authors": []})["authors"].append(pid)
        options = [{"id": REAL, "text": self._word(state)[1], "authors": []}]
        options += list(merged.values())
        # Random ids, so the id of the real meaning does not give it away.
        for o in options:
            o["key"] = o.get("id", "")
            o["id"] = secrets.token_hex(3)
        order = sorted(options, key=lambda o: o["id"])
        state["options"] = order
        state["phase"] = "vote"
        state["deadline"] = now + VOTE_SECONDS

    def _reveal(self, state, now):
        real_id = next(o["id"] for o in state["options"] if o["key"] == REAL)
        for voter, opt_id in state["votes"].items():
            if opt_id == real_id:
                add_points(state, voter, 2)
            else:
                option = next(o for o in state["options"] if o["id"] == opt_id)
                for author in option["authors"]:
                    add_points(state, author, 1)
        state["last"] = {
            "real_id": real_id,
            "votes": state["votes"],
            "options": [{k: o[k] for k in ("id", "text", "authors")} for o in state["options"]],
        }
        state["phase"] = "reveal"
        state["deadline"] = now + REVEAL_SECONDS

    def _next(self, state, now):
        state["round"] += 1
        state["fakes"], state["options"], state["votes"] = {}, [], {}
        if state["round"] >= len(state["words"]):
            state["phase"] = "finished"
        else:
            state["phase"] = "write"
            state["deadline"] = now + WRITE_SECONDS

    def view(self, state, player_id):
        idx = min(state["round"], len(state["words"]) - 1)
        out = {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "round": idx + 1,
            "rounds": len(state["words"]),
            "word": state["words"][idx][0],
            "my_fake": state["fakes"].get(player_id),
            "written": sorted(state["fakes"].keys()),
            "voted": sorted(state["votes"].keys()),
            "my_vote": state["votes"].get(player_id),
            "points": state["points"],
        }
        if state["phase"] == "vote":
            # Authors stay hidden; a player only learns which option is their own.
            out["options"] = [
                {"id": o["id"], "text": o["text"], "mine": player_id in o["authors"]}
                for o in state["options"]
            ]
        if state["phase"] in ("reveal", "finished") and state["last"]:
            out["last"] = state["last"]
        return out
