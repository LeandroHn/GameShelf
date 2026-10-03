from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = 'sqlite:///./gameshelf.db'
    session_hours: int = 24
    cookie_secure: bool = False
    allowed_origins: str = 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173'
    demo_email: str = 'demo@example.com'
    demo_password: str = ''
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()
engine = create_engine(settings.database_url, connect_args={'check_same_thread': False})

@event.listens_for(engine, 'connect')
def enable_foreign_keys(connection, _):
    connection.execute('PRAGMA foreign_keys=ON')

SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    with SessionLocal() as db:
        yield db
