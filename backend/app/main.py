import hashlib
import logging
import secrets
from datetime import timedelta
from typing import Literal
from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pwdlib import PasswordHash
from sqlalchemy import select, delete, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession
from .database import get_db, settings
from .models import User, Game, Entry, Session, now
from .schemas import Register, Login, UserOut, GameOut, EntryInput, EntryOut

app = FastAPI(title='GameShelf', version='1.0.0')
origins = settings.allowed_origins.split(',')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Content-Type'])
passwords = PasswordHash.recommended()
dummy_hash = passwords.hash(secrets.token_urlsafe(24))

@app.middleware('http')
async def protect_origin(request: Request, call_next):
    if request.method in ('POST', 'PUT', 'DELETE') and request.headers.get('origin') not in [None, *origins]:
        return JSONResponse({'detail': 'Origem não autorizada.'}, status_code=403)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse({'detail': 'Confira os campos: nome (2–60 caracteres), e-mail válido, senha (10–128 no cadastro), nota (1–5) e review (até 4.000).'}, status_code=422)

@app.exception_handler(Exception)
async def internal_error(request, exc):
    logging.exception('Falha na API', exc_info=exc)
    return JSONResponse({'detail': 'Não foi possível concluir. Tente novamente.'}, status_code=500)

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()

def current_user(request: Request, db: DBSession = Depends(get_db)):
    session = db.get(Session, digest(request.cookies.get('gameshelf_session', '')))
    if not session or session.expires_at <= now():
        raise HTTPException(401, 'Entre na sua conta para continuar.')
    return db.get(User, session.user_id)

def start_session(user, request, response, db):
    old = request.cookies.get('gameshelf_session')
    if old:
        db.execute(delete(Session).where(Session.token_hash == digest(old)))
    db.execute(delete(Session).where(Session.expires_at <= now()))
    token = secrets.token_urlsafe(32)
    db.add(Session(token_hash=digest(token), user_id=user.id,
                   expires_at=now() + timedelta(hours=settings.session_hours)))
    db.commit()
    response.set_cookie('gameshelf_session', token, httponly=True, secure=settings.cookie_secure,
                        samesite='lax', max_age=settings.session_hours * 3600)

@app.post('/api/auth/register', response_model=UserOut, status_code=201)
def register(data: Register, request: Request, response: Response, db: DBSession = Depends(get_db)):
    user = User(name=data.name, email=str(data.email).lower(), password_hash=passwords.hash(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Este e-mail já está cadastrado.')
    start_session(user, request, response, db)
    return user

@app.post('/api/auth/login', response_model=UserOut)
def login(data: Login, request: Request, response: Response, db: DBSession = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    valid = passwords.verify(data.password, user.password_hash if user else dummy_hash)
    if not user or not valid:
        raise HTTPException(401, 'E-mail ou senha incorretos.')
    start_session(user, request, response, db)
    return user

@app.post('/api/auth/logout', status_code=204)
def logout(request: Request, response: Response, db: DBSession = Depends(get_db)):
    db.execute(delete(Session).where(Session.token_hash == digest(request.cookies.get('gameshelf_session', ''))))
    db.commit()
    response.delete_cookie('gameshelf_session')

@app.get('/api/auth/me', response_model=UserOut)
def me(user=Depends(current_user)):
    return user

@app.get('/api/games', response_model=list[GameOut])
def games(q: str = '', genre: str = '', platform: str = '', db: DBSession = Depends(get_db)):
    query = select(Game)
    if q:
        query = query.where(Game.title.icontains(q, autoescape=True))
    if genre:
        query = query.where(Game.genre == genre)
    if platform:
        query = query.where(Game.platforms.contains(platform, autoescape=True))
    return db.scalars(query.order_by(Game.id)).all()

@app.get('/api/games/{game_id}', response_model=GameOut)
def game(game_id: int, db: DBSession = Depends(get_db)):
    result = db.get(Game, game_id)
    if not result:
        raise HTTPException(404, 'Jogo não encontrado.')
    return result

@app.get('/api/collection', response_model=list[EntryOut])
def collection(sort: Literal['date', 'title', 'rating'] = 'date', user=Depends(current_user), db: DBSession = Depends(get_db)):
    order = {'date': Entry.added_at.desc(), 'title': Game.title.asc(), 'rating': Entry.rating.desc()}[sort]
    return db.scalars(select(Entry).join(Game).where(Entry.user_id == user.id).order_by(order, Entry.id)).all()

@app.put('/api/collection/{game_id}', response_model=EntryOut)
def save_entry(game_id: int, data: EntryInput, user=Depends(current_user), db: DBSession = Depends(get_db)):
    if not db.get(Game, game_id):
        raise HTTPException(404, 'Jogo não encontrado.')
    entry = db.scalar(select(Entry).where(Entry.user_id == user.id, Entry.game_id == game_id))
    if not entry:
        entry = Entry(user_id=user.id, game_id=game_id)
        db.add(entry)
    for key, value in data.model_dump().items():
        setattr(entry, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'A coleção mudou. Atualize e tente novamente.')
    db.refresh(entry)
    return entry

@app.delete('/api/collection/{game_id}', status_code=204)
def remove_entry(game_id: int, user=Depends(current_user), db: DBSession = Depends(get_db)):
    result = db.execute(delete(Entry).where(Entry.user_id == user.id, Entry.game_id == game_id))
    if not result.rowcount:
        raise HTTPException(404, 'Este jogo não está na sua coleção.')
    db.commit()

@app.get('/api/profile/stats')
def stats(user=Depends(current_user), db: DBSession = Depends(get_db)):
    entries = db.scalars(select(Entry).where(Entry.user_id == user.id)).all()
    ratings = [e.rating for e in entries if e.rating is not None]
    return {'total': len(entries), 'completed': sum(e.status == 'completed' for e in entries),
            'playing': sum(e.status == 'playing' for e in entries),
            'average': round(sum(ratings) / len(ratings), 1) if ratings else None}
