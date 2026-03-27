from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    url: HttpUrl | None = None
    category: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    url: HttpUrl | None = None
    category: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ProductOut(ProductBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
