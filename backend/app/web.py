"""Serve the production frontend and API from one origin."""
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .main import app

DIST = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'

if not (DIST / 'index.html').is_file():
    raise RuntimeError('Execute npm run build na pasta frontend antes de iniciar app.web.')

app.mount('/assets', StaticFiles(directory=DIST / 'assets'), name='assets')
app.mount('/covers', StaticFiles(directory=DIST / 'covers'), name='covers')

@app.get('/favicon.svg', include_in_schema=False)
def favicon():
    return FileResponse(DIST / 'favicon.svg')

@app.get('/{path:path}', include_in_schema=False)
def frontend(path: str):
    # Only known SPA routes receive HTML; never resolve user paths on disk.
    if path in ('', 'login', 'register', 'collection', 'profile') or (
        path.startswith('games/') and path.removeprefix('games/').isdigit()
    ):
        return FileResponse(DIST / 'index.html')
    raise HTTPException(404, 'Pagina nao encontrada.')