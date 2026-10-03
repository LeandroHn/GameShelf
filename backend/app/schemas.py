from typing import Literal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

class Register(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)

    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        if len(value.strip()) < 2:
            raise ValueError('Informe um nome com pelo menos 2 caracteres.')
        return value.strip()

class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str

class GameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    title: str
    description: str
    genre: str
    platforms: str
    year: int
    studio: str
    color: str
    cover: str

class EntryInput(BaseModel):
    status: Literal['wishlist', 'playing', 'completed', 'dropped'] = 'wishlist'
    rating: int | None = Field(default=None, ge=1, le=5, strict=True)
    review: str = Field(default='', max_length=4000)

class EntryOut(EntryInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    game_id: int
    added_at: datetime
    game: GameOut
