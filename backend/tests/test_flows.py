import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app, digest
from app.models import Game, User, Session, now

@pytest.fixture
def clients():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    def database():
        with factory() as db:
            yield db
    app.dependency_overrides[get_db] = database
    with factory() as db:
        db.add(Game(slug='test', title='Elden Ring', description='Um mundo para explorar.', genre='RPG', platforms='PC', year=2022, studio='FromSoftware', color='#aaaaaa'))
        db.commit()
    with TestClient(app) as a, TestClient(app) as b:
        yield a, b, factory
    app.dependency_overrides.clear()
    engine.dispose()

def register(client, email='alex@example.com'):
    return client.post('/api/auth/register', json={'name':'Alex', 'email':email, 'password':'local-test-password'})

def test_authentication(clients):
    a, _, factory = clients
    assert a.get('/api/auth/me').status_code == 401
    result = register(a)
    assert result.status_code == 201
    assert 'password' not in result.text
    assert 'HttpOnly' in result.headers['set-cookie']
    with factory() as db:
        assert db.scalar(select(User)).password_hash.startswith('$argon2')
    assert register(a).status_code == 409
    token = a.cookies.get('gameshelf_session')
    assert a.post('/api/auth/logout').status_code == 204
    a.cookies.set('gameshelf_session', token, domain='testserver.local', path='/')
    assert a.get('/api/auth/me').status_code == 401
    assert a.post('/api/auth/login', json={'email':'alex@example.com','password':'wrong'}).status_code == 401
    assert a.post('/api/auth/login', json={'email':'alex@example.com','password':'local-test-password'}).status_code == 200
    with factory() as db:
        session = db.get(Session, digest(a.cookies.get('gameshelf_session')))
        session.expires_at = now() - timedelta(seconds=1)
        db.commit()
    assert a.get('/api/auth/me').status_code == 401

def test_collection_reviews_and_isolation(clients):
    a, b, _ = clients
    register(a)
    register(b, 'other@example.com')
    for status in ['wishlist','playing','completed','dropped']:
        assert a.put('/api/collection/1', json={'status':status,'rating':5,'review':'Excelente!'}).status_code == 200
    assert len(a.get('/api/collection').json()) == 1
    assert b.get('/api/collection').json() == []
    assert b.delete('/api/collection/1').status_code == 404
    assert b.put('/api/collection/1', json={'rating':1,'review':'Outra opinião'}).status_code == 200
    assert a.get('/api/collection').json()[0]['review'] == 'Excelente!'
    assert a.put('/api/collection/1', json={'status':'completed','rating':4,'review':'Editado'}).status_code == 200
    assert a.get('/api/profile/stats').json() == {'total':1,'completed':1,'playing':0,'average':4.0}
    for sort in ['date','rating','title']:
        assert a.get('/api/collection', params={'sort':sort}).status_code == 200
    assert a.put('/api/collection/1', json={'rating':None,'review':''}).status_code == 200
    assert a.get('/api/profile/stats').json()['average'] is None
    assert a.delete('/api/collection/1').status_code == 204
    assert len(b.get('/api/collection').json()) == 1

def test_validation_catalog_and_csrf(clients):
    a, _, _ = clients
    assert a.put('/api/collection/1', json={}).status_code == 401
    assert a.post('/api/auth/register', json={'name':'A','email':'invalid','password':'short'}).status_code == 422
    register(a)
    for data in [{'rating':0},{'rating':6},{'rating':1.5},{'status':'invalid'},{'review':'a'*4001}]:
        assert a.put('/api/collection/1', json=data).status_code == 422
    assert a.put('/api/collection/999', json={}).status_code == 404
    assert a.get('/api/games/999').status_code == 404
    assert len(a.get('/api/games?q=ELDEN&genre=RPG&platform=PC').json()) == 1
    assert a.get('/api/games?q=missing').json() == []
    assert a.post('/api/auth/logout', headers={'Origin':'https://evil.example'}).status_code == 403
