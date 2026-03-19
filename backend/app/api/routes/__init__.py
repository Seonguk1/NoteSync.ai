from .boards import router as boards_router
from .files import router as files_router
from .folders import router as folders_router

__all__ = ["folders_router", "boards_router", "files_router"]