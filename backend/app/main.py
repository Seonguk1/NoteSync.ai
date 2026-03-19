from __future__ import annotations
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import boards_router, files_router, folders_router
from app.core.exceptions import AppException
from app.db.session import init_db

import logging

def _error_response(status_code: int, code: str, message: str, details: object = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": message,
            "details": details,
        },
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


def create_app(*, initialize_database: bool = True) -> FastAPI:
    app = FastAPI(title="NoteSync API", lifespan=lifespan if initialize_database else None)

    @app.middleware("http")
    async def inject_mock_user(request: Request, call_next):
        request.state.user_id = 1
        return await call_next(request)

    @app.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
        return _error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # detail 전체를 콘솔에 출력
        print("422 Validation Error:", exc.errors())
        print("Request body:", await request.body())
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(folders_router)
    app.include_router(boards_router)
    app.include_router(files_router)
    return app


app = create_app()