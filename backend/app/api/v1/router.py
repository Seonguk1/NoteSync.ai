from fastapi import APIRouter

# 우리가 만든 개별 라우터들을 가져옵니다.
from app.api.v1 import academic, content
# 메인 API 허브 생성
api_router = APIRouter()

# 1. 학기/강의 관련 API는 '/academic' 이라는 주소 하위에 묶습니다.
api_router.include_router(
    academic.router, 
    prefix="/academic", 
    tags=["Academic (학기 및 강의 관리)"]
)

# 2. 업로드/자막/키워드 관련 API는 '/content' 이라는 주소 하위에 묶습니다.
api_router.include_router(
    content.router, 
    prefix="/content", 
    tags=["Content (자료 및 AI 파이프라인)"]
)