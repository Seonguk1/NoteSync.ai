from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.material import Material


class Annotation(SQLModel, table=True):
    __tablename__ = "annotation"

    id: Optional[int] = Field(default=None, primary_key=True)
    material_id: int = Field(foreign_key="material.id", index=True)
    page: int = Field(default=1, index=True)
    x_rel: float = Field(default=0.0)
    y_rel: float = Field(default=0.0)
    w_rel: Optional[float] = None
    h_rel: Optional[float] = None
    text: str = Field(default="")
    type: str = Field(default="comment")
    author_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    material: Optional["Material"] = Relationship(back_populates="annotations")
