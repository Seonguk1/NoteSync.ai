from __future__ import annotations

from fastapi import Request


def get_current_user_id(request: Request) -> int:
    return int(getattr(request.state, "user_id", 1))