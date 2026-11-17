"""DynamoDB RoomRepository (PROJECT.md, section 8).

One table. A room is one item: pk = "ROOM#<code>", sk = "ROOM". The room is
kept as a JSON string in `data`, next to `version` (for conditional writes)
and `expires_at` (DynamoDB's TTL deletes old rooms for free).
"""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

import boto3
from botocore.exceptions import ClientError

from app.domain.room import Room
from app.repositories.base import RoomRepository, VersionConflict


def _conditional_failed(err: ClientError) -> bool:
    return err.response["Error"]["Code"] == "ConditionalCheckFailedException"


class DynamoRoomRepository(RoomRepository):
    def __init__(self, table_name: str, region: str, endpoint_url: str | None = None) -> None:
        resource = boto3.resource("dynamodb", region_name=region, endpoint_url=endpoint_url)
        self.table = resource.Table(table_name)

    def get(self, code: str) -> Room | None:
        item = self.table.get_item(Key={"pk": f"ROOM#{code}", "sk": "ROOM"}, ConsistentRead=True).get("Item")
        if not item:
            return None
        room = Room.from_dict(json.loads(item["data"]))
        room.version = int(item["version"])
        return room

    def _item(self, room: Room) -> dict[str, Any]:
        return {
            "pk": f"ROOM#{room.code}",
            "sk": "ROOM",
            "data": json.dumps(room.to_dict(), ensure_ascii=False),
            "version": room.version,
            "expires_at": int(room.expires_at),
        }

    def create(self, room: Room) -> bool:
        try:
            self.table.put_item(Item=self._item(room), ConditionExpression="attribute_not_exists(pk)")
            return True
        except ClientError as err:
            if _conditional_failed(err):
                return False
            raise

    def save(self, room: Room, expected_version: int) -> None:
        room.version = expected_version + 1
        try:
            self.table.put_item(
                Item=self._item(room),
                ConditionExpression="#v = :expected",
                ExpressionAttributeNames={"#v": "version"},
                ExpressionAttributeValues={":expected": expected_version},
            )
        except ClientError as err:
            room.version = expected_version
            if _conditional_failed(err):
                raise VersionConflict(room.code) from err
            raise

    def add_payment(self, payment: dict[str, Any]) -> bool:
        item = {"pk": f"PAY#{payment['id']}", "sk": "PAY", "kind": "payment"}
        for key, value in payment.items():
            item[key] = Decimal(str(value)) if isinstance(value, float) else value
        try:
            self.table.put_item(Item=item, ConditionExpression="attribute_not_exists(pk)")
            return True
        except ClientError as err:
            if _conditional_failed(err):
                return False
            raise

    def list_payments(self) -> list[dict[str, Any]]:
        # A small scan is fine here: payments are few, and this is read by the owner only.
        items: list[dict[str, Any]] = []
        kwargs: dict[str, Any] = {
            "FilterExpression": "#k = :pay",
            "ExpressionAttributeNames": {"#k": "kind"},
            "ExpressionAttributeValues": {":pay": "payment"},
        }
        while True:
            page = self.table.scan(**kwargs)
            items.extend(page.get("Items", []))
            if "LastEvaluatedKey" not in page:
                break
            kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]
        clean = [
            {
                k: ((int(v) if v == v.to_integral_value() else float(v)) if isinstance(v, Decimal) else v)
                for k, v in it.items()
                if k not in ("pk", "sk", "kind")
            }
            for it in items
        ]
        return sorted(clean, key=lambda p: p.get("time", 0), reverse=True)
