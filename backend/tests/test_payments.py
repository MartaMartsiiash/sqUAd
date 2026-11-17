import boto3
from moto import mock_aws

from app.domain.room import Room
from app.repositories.base import VersionConflict
from app.repositories.dynamodb import DynamoRoomRepository
from app.services.payment_service import find_codes


def H(token):
    return {"X-Player-Token": token}


def webhook(client, item, secret="s3cret"):
    body = {"type": "StatementItem", "data": {"account": "jar", "statementItem": item}}
    return client.post(f"/api/payments/monobank/{secret}", json=body)


def test_find_codes():
    assert "K7Q2M" in find_codes("на sqUAd: k7q2m дякую")
    assert find_codes("ABCDEFG") == []


def test_wrong_secret_is_404(client):
    assert client.get("/api/payments/monobank/nope").status_code == 404
    assert client.get("/api/payments/monobank/s3cret").status_code == 200


def test_donation_unlocks_premium_once(client, room_with_players):
    code, t = room_with_players
    item = {"id": "tx1", "time": 1, "amount": 5000, "comment": f"для {code.lower()}"}
    r = webhook(client, item)
    assert r.json() == {"status": "ok", "room_code": code, "unlocked": True}
    assert webhook(client, item).json()["status"] == "duplicate"
    view = client.get(f"/api/rooms/{code}", headers=H(t["Олег"])).json()
    assert view["premium"] is True
    r = client.post(f"/api/rooms/{code}/games", json={"game_id": "who_am_i"}, headers=H(t["Марта"]))
    assert r.status_code == 200
    summary = client.get("/api/payments/monobank/s3cret/summary").json()
    assert summary["count"] == 1 and summary["total_uah"] == 50


def test_too_small_or_outgoing_does_not_unlock(client, room_with_players):
    code, _ = room_with_players
    assert webhook(client, {"id": "a", "amount": 500, "comment": code}).json()["unlocked"] is False
    assert webhook(client, {"id": "b", "amount": -9000, "comment": code}).json()["status"] == "ignored"


@mock_aws
def test_dynamodb_repository_conditional_writes():
    boto3.client("dynamodb", region_name="us-east-1").create_table(
        TableName="squad",
        KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
        AttributeDefinitions=[
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "sk", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    repo = DynamoRoomRepository("squad", "us-east-1")
    room = Room(code="ABCDE", host_sub="h", created_at=1.0, expires_at=2.0)
    room.add_player("Марта", None, 1.0, is_host=True)
    assert repo.create(room) is True
    assert repo.create(room) is False

    a, b = repo.get("ABCDE"), repo.get("ABCDE")
    a.premium = True
    repo.save(a, 0)
    try:
        repo.save(b, 0)  # b was read before a was saved
        raise AssertionError("expected a conflict")
    except VersionConflict:
        pass
    assert repo.get("ABCDE").premium is True and repo.get("ABCDE").version == 1

    assert repo.add_payment({"id": "x", "time": 5, "amount_uah": 20.5}) is True
    assert repo.add_payment({"id": "x", "time": 5, "amount_uah": 20.5}) is False
    assert repo.list_payments()[0]["amount_uah"] == 20.5
