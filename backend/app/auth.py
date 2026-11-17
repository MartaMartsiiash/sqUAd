"""Host sign-in: check the Cognito token sent as `Authorization: Bearer <token>`.

Only creating a room needs an account. The signature is checked against
Cognito's public keys (JWKS), which are downloaded once and cached.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, Header

from app.config import Settings, get_settings
from app.domain.room import DomainError


@dataclass
class Host:
    sub: str
    email: str


@lru_cache
def _jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_keys=True)


def verify_token(token: str, settings: Settings) -> Host:
    if settings.auth_dev_mode and token.startswith("dev:"):
        email = token[4:] or "dev@local"
        return Host(sub=f"dev-{email}", email=email)
    if not settings.cognito_user_pool_id:
        raise DomainError("auth_not_configured", "Вхід не налаштований", 500)
    issuer = f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/{settings.cognito_user_pool_id}"
    try:
        key = _jwks_client(f"{issuer}/.well-known/jwks.json").get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token, key.key, algorithms=["RS256"], issuer=issuer, options={"verify_aud": False}
        )
    except jwt.PyJWTError as err:
        raise DomainError("bad_token", "Сесія завершилась, увійдіть ще раз", 401) from err
    # An access token names the app client in `client_id`, an ID token in `aud`.
    client = claims.get("client_id") or claims.get("aud")
    if client != settings.cognito_client_id:
        raise DomainError("bad_token", "Токен не для цього застосунку", 401)
    return Host(sub=claims["sub"], email=claims.get("email") or claims.get("username", ""))


def current_host(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> Host:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise DomainError("sign_in_required", "Щоб створити кімнату, увійдіть", 401)
    return verify_token(authorization[7:].strip(), settings)
