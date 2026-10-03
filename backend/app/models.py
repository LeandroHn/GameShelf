from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, UniqueConstraint, CheckConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))

class Session(Base):
    __tablename__ = 'sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    expires_at: Mapped[datetime]

class Game(Base):
    __tablename__ = 'games'
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str]
    description: Mapped[str] = mapped_column(Text)
    genre: Mapped[str]
    platforms: Mapped[str]
    year: Mapped[int]
    studio: Mapped[str]
    color: Mapped[str]
    cover: Mapped[str] = mapped_column(default='')

class Entry(Base):
    __tablename__ = 'entries'
    __table_args__ = (UniqueConstraint('user_id', 'game_id'), CheckConstraint('rating IS NULL OR (rating >= 1 AND rating <= 5)'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    game_id: Mapped[int] = mapped_column(ForeignKey('games.id'))
    status: Mapped[str] = mapped_column(default='wishlist')
    rating: Mapped[int | None]
    review: Mapped[str] = mapped_column(Text, default='')
    added_at: Mapped[datetime] = mapped_column(default=now)
    game: Mapped[Game] = relationship()
