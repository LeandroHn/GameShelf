from sqlalchemy import select
from pwdlib import PasswordHash
from .database import Base, engine, SessionLocal, settings
from .models import User, Game, Entry
from .catalog import GAMES

def seed():
    if len(settings.demo_password) < 10:
        raise SystemExit('Defina DEMO_PASSWORD no .env com pelo menos 10 caracteres.')
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for slug, title, description, genre, platforms, year, studio, color, _ in GAMES:
            game = db.scalar(select(Game).where(Game.slug == slug))
            if not game:
                db.add(Game(slug=slug, title=title, description=description, genre=genre,
                            platforms=platforms, year=year, studio=studio, color=color, cover=f'/covers/{slug}.jpg'))
        db.flush()
        user = db.scalar(select(User).where(User.email == settings.demo_email.lower()))
        if not user:
            user = User(name='Alex', email=settings.demo_email.lower(), password_hash=PasswordHash.recommended().hash(settings.demo_password))
            db.add(user)
            db.flush()
            for slug, status, rating, review in [('elden-ring','playing',5,'Cada caminho guarda uma surpresa.'), ('hades','completed',5,'Sempre existe um motivo para mais uma tentativa.'), ('hollow-knight','wishlist',None,''), ('stardew-valley','playing',4,'Meu lugar para desacelerar.')]:
                game = db.scalar(select(Game).where(Game.slug == slug))
                db.add(Entry(user_id=user.id, game_id=game.id, status=status, rating=rating, review=review))
        db.commit()
    print('Banco pronto: 20 jogos e conta de demonstração. Registros existentes preservados.')

if __name__ == '__main__':
    seed()
