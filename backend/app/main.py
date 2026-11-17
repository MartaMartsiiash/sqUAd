"""The FastAPI app: CORS, one error shape, the routes."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import get_settings
from app.domain.room import DomainError


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="sqUAd API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Player-Token"],
    )

    @app.exception_handler(DomainError)
    async def domain_error(_: Request, err: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=err.status, content={"error": {"code": err.code, "message": err.message}}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, err: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "invalid_input",
                    "message": "Перевірте введені дані",
                    "details": err.errors(),
                }
            },
        )

    app.include_router(router)
    return app


app = create_app()
