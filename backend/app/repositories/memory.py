"""In-memory RoomRepository for tests and `STORAGE=memory` local runs."""

from __future__ import annotations

import copy
import threading
from typing import Any

from app.domain.room import Room
from app.repositories.base import RoomRepository, VersionConflict


class MemoryRoomRepository(RoomRepository):
    def __init__(self) -> None:
        self._rooms: dict[str, dict[str, Any]] = {}
        self._payments: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def get(self, code: str) -> Room | None:
        data = self._rooms.get(code)
        return Room.from_dict(copy.deepcopy(data)) if data else None

    def create(self, room: Room) -> bool:
        with self._lock:
            if room.code in self._rooms:
                return False
            self._rooms[room.code] = copy.deepcopy(room.to_dict())
            return True

    def save(self, room: Room, expected_version: int) -> None:
        with self._lock:
            stored = self._rooms.get(room.code)
            if stored is None or stored["version"] != expected_version:
                raise VersionConflict(room.code)
            room.version = expected_version + 1
            self._rooms[room.code] = copy.deepcopy(room.to_dict())

    def add_payment(self, payment: dict[str, Any]) -> bool:
        with self._lock:
            if payment["id"] in self._payments:
                return False
            self._payments[payment["id"]] = dict(payment)
            return True

    def list_payments(self) -> list[dict[str, Any]]:
        return sorted(self._payments.values(), key=lambda p: p.get("time", 0), reverse=True)
