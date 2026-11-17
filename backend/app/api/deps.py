"""Wiring: which repository and services the HTTP layer uses.

Built once per process (one Lambda container keeps them between requests).
Tests replace them with `app.dependency_overrides`.
"""

from functools import lru_cache

from app.config import get_settings
from app.repositories.base import RoomRepository
from app.repositories.memory import MemoryRoomRepository
from app.services.payment_service import PaymentService
from app.services.room_service import RoomService


@lru_cache
def get_repo() -> RoomRepository:
    settings = get_settings()
    if settings.storage == "dynamodb":
        from app.repositories.dynamodb import DynamoRoomRepository

        return DynamoRoomRepository(settings.table_name, settings.aws_region, settings.dynamodb_endpoint)
    return MemoryRoomRepository()


@lru_cache
def get_room_service() -> RoomService:
    return RoomService(get_repo(), get_settings())


@lru_cache
def get_payment_service() -> PaymentService:
    return PaymentService(get_repo(), get_room_service(), get_settings())
