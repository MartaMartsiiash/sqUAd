"""Each game played end to end through the HTTP API."""


def H(token):
    return {"X-Player-Token": token}


def ids_by_name(client, code, token):
    view = client.get(f"/api/rooms/{code}", headers=H(token)).json()
    return {p["name"]: p["id"] for p in view["players"]}


def view(client, code, token):
    return client.get(f"/api/rooms/{code}", headers=H(token)).json()


def act(client, code, token, **action):
    r = client.post(f"/api/rooms/{code}/actions", json=action, headers=H(token))
    assert r.status_code == 200, r.text
    return r.json()


def start(client, code, token, game_id, **settings):
    r = client.post(
        f"/api/rooms/{code}/games", json={"game_id": game_id, "settings": settings}, headers=H(token)
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_spy_caught_and_secret_hidden(client, room_with_players):
    code, t = room_with_players
    ids = ids_by_name(client, code, t["Марта"])
    names = {v: k for k, v in ids.items()}
    start(client, code, t["Марта"], "spy")
    views = {n: view(client, code, tok)["game"]["view"] for n, tok in t.items()}
    spies = [n for n, v in views.items() if v["is_spy"]]
    assert len(spies) == 1
    spy = spies[0]
    assert views[spy]["location"] is None  # the spy never receives the place
    assert len({v["location"] for n, v in views.items() if n != spy}) == 1

    for name in t:
        act(client, code, t[name], type="ready_to_vote")  # majority moves to the vote
        if view(client, code, t[name])["game"]["view"]["phase"] == "vote":
            break
    for name, tok in t.items():
        target = ids[spy] if name != spy else next(i for i in ids.values() if i != ids[spy])
        act(client, code, tok, type="vote", target=target)
    v = view(client, code, t[spy])["game"]["view"]
    assert v["phase"] == "spy_guess"
    assert v["options"]
    act(client, code, t[spy], type="guess", location=v["options"][0])
    final = view(client, code, t["Марта"])
    assert final["game"]["view"]["phase"] == "finished"
    for pid, pts in final["scores"].items():
        if names[pid] != spy:
            assert pts == 1
    assert len(final["history"]) == 1


def test_who_of_us_majority_scores(client, room_with_players, clock):
    code, t = room_with_players
    ids = ids_by_name(client, code, t["Марта"])
    start(client, code, t["Марта"], "who_of_us", rounds=1)
    act(client, code, t["Марта"], type="vote", target=ids["Олег"])
    act(client, code, t["Вероніка"], type="vote", target=ids["Олег"])
    act(client, code, t["Олег"], type="vote", target=ids["Олег"])
    v = act(client, code, t["Іра"], type="vote", target=ids["Марта"])
    assert v["game"]["view"]["phase"] == "reveal"
    clock.advance(50)
    final = view(client, code, t["Марта"])
    assert final["game"]["view"]["phase"] == "finished"
    assert final["scores"][ids["Марта"]] == 1
    assert final["scores"][ids["Іра"]] == 0


def test_associations_matching_words(client, room_with_players):
    code, t = room_with_players
    ids = ids_by_name(client, code, t["Марта"])
    start(client, code, t["Марта"], "associations", rounds=1)
    act(client, code, t["Марта"], type="answer", text="Сонце")
    act(client, code, t["Вероніка"], type="answer", text="сонце!")
    act(client, code, t["Олег"], type="answer", text="Сонце")
    v = act(client, code, t["Іра"], type="answer", text="Пиво")
    assert v["game"]["view"]["phase"] == "reveal"
    r = client.post(f"/api/rooms/{code}/actions", json={"type": "next"}, headers=H(t["Іра"]))
    assert r.status_code == 403  # only the host moves on to the next round
    v = act(client, code, t["Марта"], type="next")
    assert v["game"]["view"]["phase"] == "finished"
    assert v["scores"][ids["Марта"]] == 2 and v["scores"][ids["Іра"]] == 0


def test_two_truths_hides_the_lie_until_reveal(client, room_with_players):
    code, t = room_with_players
    start(client, code, t["Марта"], "two_truths")
    for i, (_, tok) in enumerate(t.items()):
        act(client, code, tok, type="submit", facts=["a", "b", "c"], lie=i % 3)
    v = view(client, code, t["Олег"])["game"]["view"]
    assert v["phase"] == "guess" and "lie" not in str(v.get("facts"))
    assert "last" not in v


def test_points_of_a_stopped_game_do_not_count(client, room_with_players):
    code, t = room_with_players
    start(client, code, t["Марта"], "who_of_us", rounds=1)
    r = client.post(f"/api/rooms/{code}/games/stop", headers=H(t["Марта"]))
    assert r.json()["game"] is None
    assert all(p == 0 for p in r.json()["scores"].values())


def test_timer_moves_the_game_on(client, room_with_players, clock):
    code, t = room_with_players
    start(client, code, t["Марта"], "associations", rounds=2)
    clock.advance(31)
    assert view(client, code, t["Олег"])["game"]["view"]["phase"] == "reveal"
    clock.advance(46)
    v = view(client, code, t["Олег"])["game"]["view"]
    assert v["phase"] == "write" and v["round"] == 2


def test_ni_tak_ni_ni_caught_and_timeout(client, room_with_players, clock):
    code, t = room_with_players
    ids = ids_by_name(client, code, t["Марта"])
    names = {v: k for k, v in ids.items()}
    v = start(client, code, t["Марта"], "ni_tak_ni_ni", turns=2)["game"]["view"]
    hot = names[v["hot"]]
    hot_view = view(client, code, t[hot])["game"]["view"]
    assert hot_view["questions"] is None and "так" in hot_view["forbidden"]
    act(client, code, t[hot], type="begin")
    clock.advance(65)
    catcher = next(n for n in t if n != hot)
    v = act(client, code, t[catcher], type="caught")["game"]["view"]
    assert v["phase"] == "result" and v["last"]["survived"] == 65 and v["last"]["earned"] == 2
    act(client, code, t["Марта"], type="next")
    hot2 = names[view(client, code, t["Марта"])["game"]["view"]["hot"]]
    act(client, code, t[hot2], type="begin")
    clock.advance(121)
    final = view(client, code, t["Марта"])
    assert final["game"]["view"]["last"]["survived"] == 120
    clock.advance(50)
    final = view(client, code, t["Марта"])
    assert final["game"]["view"]["phase"] == "finished"
    assert final["scores"][ids[hot]] == 2 and final["scores"][ids[hot2]] >= 4


def test_forgotten_words_bluff(client, room_with_players, rooms):
    code, t = room_with_players
    rooms.unlock_premium(code)
    start(client, code, t["Марта"], "forgotten_words", rounds=1)
    for i, tok in enumerate(t.values()):
        act(client, code, tok, type="fake", text=f"вигадка {i % 2}")
    v = view(client, code, t["Олег"])["game"]["view"]
    assert v["phase"] == "vote"
    assert len(v["options"]) == 3  # the real one + two different fakes
    assert all("authors" not in o for o in v["options"])
    for tok in t.values():
        mine = view(client, code, tok)["game"]["view"]["options"]
        choice = next(o["id"] for o in mine if not o["mine"])
        act(client, code, tok, type="vote", option=choice)
    v = view(client, code, t["Марта"])["game"]["view"]
    assert v["phase"] == "reveal" and v["last"]["real_id"]


def test_a_second_round_brings_new_questions(client, room_with_players, clock):
    code, t = room_with_players
    seen = set()
    for _ in range(5):
        start(client, code, t["Марта"], "who_of_us", rounds=10)
        questions = set()
        for _ in range(10):
            g = view(client, code, t["Марта"])["game"]["view"]
            questions.add(g["question"])
            clock.advance(41)
            view(client, code, t["Марта"])
            clock.advance(46)
        assert not (questions & seen), "a question came back before the pool ran out"
        seen |= questions
        client.post(f"/api/rooms/{code}/games/stop", headers=H(t["Марта"]))
        client.post(f"/api/payments/monobank/s3cret/unlock/{code}")


def test_answers_are_written_the_same_way_as_the_real_one():
    from app.games.base import tidy_answer

    assert tidy_answer("Стара Сковорідка.") == "стара сковорідка"
    assert tidy_answer("ЛАВА!") == "лава"
