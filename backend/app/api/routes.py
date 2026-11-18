"""HTTP routes (PROJECT.md, section 6). Thin: validate input, call a service."""

from __future__ import annotations

import secrets
from typing import Any

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, Field

from app.api.deps import get_payment_service, get_room_service
from app.auth import Host, current_host
from app.config import Settings, get_settings
from app.domain.room import DomainError
from app.games.registry import all_games
from app.services.payment_service import PaymentService
from app.services.room_service import RoomService

router = APIRouter(prefix="/api")


class CreateRoomIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    color: str | None = None


class JoinIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    color: str | None = None


class StartGameIn(BaseModel):
    game_id: str
    settings: dict[str, Any] = Field(default_factory=dict)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/games")
def games() -> list[dict[str, Any]]:
    return all_games()


@router.post("/rooms", status_code=201)
def create_room(
    body: CreateRoomIn, host: Host = Depends(current_host), rooms: RoomService = Depends(get_room_service)
) -> dict[str, Any]:
    room, player = rooms.create_room(host.sub, body.name, body.color)
    return {"code": room.code, "player_id": player.id, "token": player.token}


@router.post("/rooms/{code}/join", status_code=201)
def join_room(code: str, body: JoinIn, rooms: RoomService = Depends(get_room_service)) -> dict[str, Any]:
    room, player = rooms.join(code, body.name, body.color)
    return {"code": room.code, "player_id": player.id, "token": player.token}


@router.get("/rooms/{code}")
def room_view(
    code: str,
    x_player_token: str | None = Header(default=None),
    rooms: RoomService = Depends(get_room_service),
) -> dict[str, Any]:
    return rooms.view(code, x_player_token)


@router.post("/rooms/{code}/games")
def start_game(
    code: str,
    body: StartGameIn,
    x_player_token: str | None = Header(default=None),
    rooms: RoomService = Depends(get_room_service),
) -> dict[str, Any]:
    return rooms.start_game(code, x_player_token, body.game_id, body.settings)


@router.post("/rooms/{code}/games/stop")
def stop_game(
    code: str,
    x_player_token: str | None = Header(default=None),
    rooms: RoomService = Depends(get_room_service),
) -> dict[str, Any]:
    return rooms.stop_game(code, x_player_token)


@router.post("/rooms/{code}/actions")
def act(
    code: str,
    action: dict[str, Any],
    x_player_token: str | None = Header(default=None),
    rooms: RoomService = Depends(get_room_service),
) -> dict[str, Any]:
    return rooms.act(code, x_player_token, action)


@router.post("/rooms/{code}/leave")
def leave(
    code: str,
    x_player_token: str | None = Header(default=None),
    rooms: RoomService = Depends(get_room_service),
) -> dict[str, str]:
    rooms.leave(code, x_player_token)
    return {"status": "left"}


@router.delete("/rooms/{code}/players/{player_id}")
def kick(
    code: str,
    player_id: str,
    x_player_token: str | None = Header(default=None),
    rooms: RoomService = Depends(get_room_service),
) -> dict[str, Any]:
    return rooms.kick(code, x_player_token, player_id)


# ----- payments (monobank webhook) -----------------------------------------


def _check_secret(secret: str, settings: Settings) -> None:
    if not secrets.compare_digest(secret, settings.mono_webhook_secret):
        raise DomainError("not_found", "Not found", 404)


@router.get("/payments/monobank/{secret}")
def mono_check(secret: str, settings: Settings = Depends(get_settings)) -> dict[str, str]:
    """monobank calls this once with GET when the webhook is registered; it must return 200."""
    _check_secret(secret, settings)
    return {"status": "ok"}


@router.post("/payments/monobank/{secret}")
async def mono_webhook(
    secret: str,
    request: Request,
    settings: Settings = Depends(get_settings),
    payments: PaymentService = Depends(get_payment_service),
) -> dict[str, Any]:
    _check_secret(secret, settings)
    try:
        body = await request.json()
    except ValueError:
        return {"status": "ignored", "reason": "not json"}
    # Always answer 200 quickly: monobank retries and finally disables a failing webhook.
    return payments.handle_webhook(body if isinstance(body, dict) else {})


@router.post("/payments/monobank/{secret}/unlock/{code}")
def mono_manual_unlock(
    secret: str,
    code: str,
    settings: Settings = Depends(get_settings),
    rooms: RoomService = Depends(get_room_service),
) -> dict[str, Any]:
    """For the owner: unlock a room by hand, e.g. when a donor mistyped the code."""
    _check_secret(secret, settings)
    return {"room_code": code.upper(), "unlocked": rooms.unlock_premium(code)}


@router.get("/payments/monobank/{secret}/summary")
def mono_summary(
    secret: str,
    settings: Settings = Depends(get_settings),
    payments: PaymentService = Depends(get_payment_service),
) -> dict[str, Any]:
    """Every tracked donation: for the demo report. Only whoever knows the secret can read it."""
    _check_secret(secret, settings)
    return payments.summary()
