"""RoomRepository: how rooms and payments are stored.

The services depend on this interface, not on DynamoDB. Tests and a quick
local run use the in-memory version; AWS uses the DynamoDB version.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.domain.room import Room


class VersionConflict(Exception):
    """Someone else saved the room first. Reload and try again."""


class RoomRepository(ABC):
    @abstractmethod
    def get(self, code: str) -> Room | None: ...

    @abstractmethod
    def create(self, room: Room) -> bool:
        """Save a new room. False if the code is already taken."""

    @abstractmethod
    def save(self, room: Room, expected_version: int) -> None:
        """Save only if the stored version is still `expected_version`; bumps the version.
        Raises VersionConflict otherwise."""

    @abstractmethod
    def add_payment(self, payment: dict[str, Any]) -> bool:
        """Store a payment once. False if this payment id was already stored."""

    @abstractmethod
    def list_payments(self) -> list[dict[str, Any]]: ...
