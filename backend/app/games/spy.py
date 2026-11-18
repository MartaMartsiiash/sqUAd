"""Шпигун: everyone sees the same place, except one player who is the spy.

Phases: discuss -> vote -> (spy_guess) -> finished.
"""

from __future__ import annotations

from collections import Counter

from app.domain.room import DomainError
from app.games.base import Game, add_points, pick, require_phase, require_player
from app.games.content import SPY_LOCATIONS

DISCUSS_SECONDS = 5 * 60
VOTE_SECONDS = 60
GUESS_SECONDS = 40
GUESS_OPTIONS = 10


class Spy(Game):
    id = "spy"
    title = "Шпигун"
    tag = "дедукція · блеф"
    description = "Усі знають, де ви. Крім одного."
    rules = (
        "Кожен бачить локацію, а шпигун — ні. По черзі ставте одне одному питання про "
        "місце, щоб вирахувати шпигуна, але не видати локацію. Потім голосуєте. Якщо шпигуна "
        "впіймали — кожен інший гравець отримує 1 бал, а шпигун може вгадати локацію "
        "і забрати 2 бали. Якщо не впіймали — шпигун отримує 3 бали."
    )
    min_players = 3

    def start(self, players, settings, rng, now):
        ids = [p["id"] for p in players]
        location = pick(SPY_LOCATIONS, 1, set(settings.get("_used", [])), rng)[0]
        others = [loc for loc in SPY_LOCATIONS if loc != location]
        options = rng.sample(others, GUESS_OPTIONS - 1) + [location]
        rng.shuffle(options)
        minutes = int(settings.get("minutes", DISCUSS_SECONDS // 60))
        return {
            "phase": "discuss",
            "player_ids": ids,
            "spy": rng.choice(ids),
            "location": location,
            "options": options,
            "first_asker": rng.choice(ids),
            "deadline": now + max(1, min(minutes, 15)) * 60,
            "ready": [],
            "votes": {},
            "accused": None,
            "spy_guess": None,
            "points": {pid: 0 for pid in ids},
            "_used": [location],
        }

    def act(self, state, player_id, action, now):
        require_player(state, player_id)
        kind = action.get("type")
        if kind == "ready_to_vote":
            require_phase(state, "discuss")
            if player_id not in state["ready"]:
                state["ready"].append(player_id)
            if len(state["ready"]) * 2 > len(state["player_ids"]):
                self._open_vote(state, now)
        elif kind == "vote":
            require_phase(state, "vote")
            target = action.get("target")
            if target not in state["player_ids"] or target == player_id:
                raise DomainError("bad_vote", "За себе голосувати не можна")
            state["votes"][player_id] = target
            if len(state["votes"]) == len(state["player_ids"]):
                self._count_votes(state, now)
        elif kind == "guess":
            require_phase(state, "spy_guess")
            if player_id != state["spy"]:
                raise DomainError("not_spy", "Вгадувати може тільки шпигун")
            guess = action.get("location")
            if guess not in state["options"]:
                raise DomainError("bad_guess", "Оберіть локацію зі списку")
            state["spy_guess"] = guess
            if guess == state["location"]:
                add_points(state, state["spy"], 2)
            state["phase"] = "finished"
        else:
            raise DomainError("bad_action", "Невідома дія")
        return state

    def tick(self, state, now):
        if state["phase"] == "discuss" and now >= state["deadline"]:
            self._open_vote(state, now)
        elif state["phase"] == "vote" and now >= state["deadline"]:
            self._count_votes(state, now)
        elif state["phase"] == "spy_guess" and now >= state["deadline"]:
            state["phase"] = "finished"
        return state

    def _open_vote(self, state, now):
        state["phase"] = "vote"
        state["deadline"] = now + VOTE_SECONDS

    def _count_votes(self, state, now):
        counts = Counter(state["votes"].values())
        top = counts.most_common(2)
        accused = None
        if top and (len(top) == 1 or top[0][1] > top[1][1]):
            accused = top[0][0]
        state["accused"] = accused
        if accused == state["spy"]:
            for pid in state["player_ids"]:
                if pid != state["spy"]:
                    add_points(state, pid, 1)
            state["phase"] = "spy_guess"
            state["deadline"] = now + GUESS_SECONDS
        else:
            add_points(state, state["spy"], 3)
            state["phase"] = "finished"

    def view(self, state, player_id):
        is_spy = player_id == state["spy"]
        over = state["phase"] == "finished"
        out = {
            "phase": state["phase"],
            "deadline": state["deadline"],
            "is_spy": is_spy,
            "location": None if (is_spy and not over) else state["location"],
            "first_asker": state["first_asker"],
            "ready_count": len(state["ready"]),
            "voted": sorted(state["votes"].keys()),
            "my_vote": state["votes"].get(player_id),
            "options": state["options"] if (is_spy and state["phase"] == "spy_guess") else None,
        }
        if over or state["phase"] == "spy_guess":
            out.update(
                spy=state["spy"],
                accused=state["accused"],
                votes=state["votes"],
            )
        if over:
            out.update(spy_guess=state["spy_guess"], points=state["points"])
        return out
