from app.domain.room import CODE_ALPHABET, CODE_LENGTH


def H(token):
    return {"X-Player-Token": token}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_creating_a_room_needs_sign_in(client):
    r = client.post("/api/rooms", json={"name": "Марта"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "sign_in_required"


def test_room_code_is_five_easy_characters(room_with_players):
    code, _ = room_with_players
    assert len(code) == CODE_LENGTH
    assert all(c in CODE_ALPHABET for c in code)


def test_join_with_lowercase_code_and_see_lobby(client, room_with_players):
    code, tokens = room_with_players
    r = client.post(f"/api/rooms/{code.lower()}/join", json={"name": "Тарас"})
    assert r.status_code == 201
    view = client.get(f"/api/rooms/{code}", headers=H(r.json()["token"])).json()
    assert [p["name"] for p in view["players"]] == ["Марта", "Вероніка", "Олег", "Іра", "Тарас"]
    assert view["me"]["name"] == "Тарас"
    assert view["game"] is None
    assert "token" not in str(view["players"])


def test_same_name_twice_is_refused(client, room_with_players):
    code, _ = room_with_players
    r = client.post(f"/api/rooms/{code}/join", json={"name": "олег"})
    assert r.status_code == 409


def test_unknown_room(client):
    r = client.post("/api/rooms/ZZZZZ/join", json={"name": "X"})
    assert r.status_code == 404


def test_view_needs_a_player_token(client, room_with_players):
    code, _ = room_with_players
    assert client.get(f"/api/rooms/{code}").status_code == 403
    assert client.get(f"/api/rooms/{code}", headers=H("wrong")).status_code == 403


def test_only_host_starts_games_and_kicks(client, room_with_players):
    code, t = room_with_players
    r = client.post(f"/api/rooms/{code}/games", json={"game_id": "spy"}, headers=H(t["Олег"]))
    assert r.status_code == 403
    view = client.get(f"/api/rooms/{code}", headers=H(t["Марта"])).json()
    ira = next(p["id"] for p in view["players"] if p["name"] == "Іра")
    assert client.delete(f"/api/rooms/{code}/players/{ira}", headers=H(t["Олег"])).status_code == 403
    r = client.delete(f"/api/rooms/{code}/players/{ira}", headers=H(t["Марта"]))
    assert r.status_code == 200
    assert client.get(f"/api/rooms/{code}", headers=H(t["Іра"])).status_code == 403


def test_premium_game_is_locked_until_paid(client, room_with_players):
    code, t = room_with_players
    r = client.post(f"/api/rooms/{code}/games", json={"game_id": "who_am_i"}, headers=H(t["Марта"]))
    assert r.status_code == 402
    games = client.get(f"/api/rooms/{code}", headers=H(t["Марта"])).json()["games"]
    assert {g["id"]: g["locked"] for g in games}["who_am_i"] is True


def test_reconnect_with_the_same_token(client, room_with_players):
    code, t = room_with_players
    first = client.get(f"/api/rooms/{code}", headers=H(t["Олег"])).json()["me"]
    again = client.get(f"/api/rooms/{code}", headers=H(t["Олег"])).json()["me"]
    assert first["id"] == again["id"]
