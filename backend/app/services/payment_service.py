"""PaymentService: track monobank donations and unlock unlimited games for a room.

monobank's personal API sends every new transaction on the owner's cards and
jars to our webhook (PROJECT.md, section 7). The body looks like:

    {"type": "StatementItem",
     "data": {"account": "<card or jar id>",
              "statementItem": {"id": "...", "time": 1700000000, "amount": 5000,
                                "description": "...", "comment": "K7Q2M", ...}}}

`amount` is in kopiyky (5000 = 50 UAH); incoming money is positive.
"""

from __future__ import annotations

import json
import re
from typing import Any

from app.config import Settings
from app.domain.room import CODE_ALPHABET, CODE_LENGTH
from app.repositories.base import RoomRepository
from app.services.room_service import RoomService

CODE_RE = re.compile(rf"(?<![A-Z0-9])[{CODE_ALPHABET}]{{{CODE_LENGTH}}}(?![A-Z0-9])")


# People often type the code on a Ukrainian keyboard: "МРК7С" looks like MPK7C
# but uses Cyrillic letters. Map the look-alikes to Latin before searching.
LOOKALIKES = str.maketrans("АВЕКМНОРСТХУІЗ", "ABEKMHOPCTXYI3")


def find_codes(text: str) -> list[str]:
    return CODE_RE.findall(text.upper().translate(LOOKALIKES))


class PaymentService:
    def __init__(self, repo: RoomRepository, rooms: RoomService, settings: Settings) -> None:
        self.repo = repo
        self.rooms = rooms
        self.settings = settings

    def handle_webhook(self, body: dict[str, Any]) -> dict[str, Any]:
        result = self._handle(body)
        item = (body.get("data") or {}).get("statementItem") or {}
        # One log line per webhook call: `make logs` shows what monobank sent and what we did.
        print(
            json.dumps(
                {
                    "event": "mono_webhook",
                    "amount": item.get("amount"),
                    "comment": item.get("comment"),
                    "description": item.get("description"),
                    "result": result,
                },
                ensure_ascii=False,
            )
        )
        return result

    def _handle(self, body: dict[str, Any]) -> dict[str, Any]:
        if body.get("type") != "StatementItem":
            return {"status": "ignored", "reason": "not a statement item"}
        data = body.get("data") or {}
        item = data.get("statementItem") or {}
        amount = int(item.get("amount", 0))
        if amount <= 0 or not item.get("id"):
            return {"status": "ignored", "reason": "not an incoming payment"}

        text = f"{item.get('comment', '')} {item.get('description', '')}"
        room_code = None
        unlocked = False
        enough = amount >= self.settings.premium_price_uah * 100
        for code in find_codes(text):
            if self.repo.get(code) is not None:
                room_code = code
                break

        # Unlocking twice is harmless, so unlock first and record the payment after.
        if room_code and enough:
            unlocked = self.rooms.unlock_premium(room_code)
        payment = {
            "id": str(item["id"]),
            "time": int(item.get("time", 0)),
            "amount_uah": round(amount / 100, 2),
            "comment": str(item.get("comment", ""))[:200],
            "room_code": room_code or "",
            "unlocked": unlocked,
        }
        if not self.repo.add_payment(payment):
            return {"status": "duplicate"}  # monobank retried; already counted
        return {"status": "ok", "room_code": room_code, "unlocked": unlocked}

    def summary(self) -> dict[str, Any]:
        payments = self.repo.list_payments()
        return {
            "count": len(payments),
            "total_uah": round(sum(p["amount_uah"] for p in payments), 2),
            "payments": payments,
        }
