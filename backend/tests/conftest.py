import random

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_payment_service, get_room_service
from app.config import Settings, get_settings
from app.main import create_app
from app.repositories.memory import MemoryRoomRepository
from app.services.payment_service import PaymentService
from app.services.room_service import RoomService


class Clock:
    def __init__(self, now: float = 1_800_000_000.0):
        self.now = now

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def settings():
    return Settings(storage="memory", auth_dev_mode=True, mono_webhook_secret="s3cret", premium_price_uah=20)


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def repo():
    return MemoryRoomRepository()


@pytest.fixture
def rooms(repo, settings, clock):
    return RoomService(repo, settings, clock=clock, rng=random.Random(7))


@pytest.fixture
def payments(repo, rooms, settings):
    return PaymentService(repo, rooms, settings)


@pytest.fixture
def client(settings, rooms, payments):
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_room_service] = lambda: rooms
    app.dependency_overrides[get_payment_service] = lambda: payments
    return TestClient(app)


@pytest.fixture
def room_with_players(client):
    """A room with a host and three players. Returns (code, {name: token})."""
    r = client.post(
        "/api/rooms", json={"name": "Марта"}, headers={"Authorization": "Bearer dev:marta@example.com"}
    )
    assert r.status_code == 201, r.text
    code = r.json()["code"]
    tokens = {"Марта": r.json()["token"]}
    for name in ["Вероніка", "Олег", "Іра"]:
        j = client.post(f"/api/rooms/{code}/join", json={"name": name})
        assert j.status_code == 201, j.text
        tokens[name] = j.json()["token"]
    return code, tokens
