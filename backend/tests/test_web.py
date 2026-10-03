from fastapi.testclient import TestClient
from pathlib import Path
import pytest

pytestmark = pytest.mark.skipif(
    not (Path(__file__).resolve().parents[2] / 'frontend' / 'dist' / 'index.html').exists(),
    reason='Execute npm run build para testar o frontend compilado.',
)


def test_production_routes():
    from app.web import app
    with TestClient(app) as client:
        for route in ['/', '/login', '/register', '/collection', '/profile', '/games/1']:
            response = client.get(route)
            assert response.status_code == 200
            assert '<div id="root"></div>' in response.text
        assert client.get('/favicon.svg').status_code == 200
        assert client.get('/covers/elden-ring.jpg').status_code == 200
        for route in ['/api/not-found', '/.env', '/app/database.py', '/games/invalid']:
            assert client.get(route).status_code == 404