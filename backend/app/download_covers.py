"""Manutenção opcional: salva capas localmente. Não é usado pela aplicação."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from .catalog import GAMES

def download(row):
    slug, *_, app_id = row
    path = Path(__file__).resolve().parents[2] / 'frontend' / 'public' / 'covers' / f'{slug}.jpg'
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        return
    try:
        request = Request(f'https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg', headers={'User-Agent':'GameShelf local catalog'})
        with urlopen(request, timeout=30) as response:
            data = response.read()
        if not data.startswith(b'\xff\xd8'):
            raise ValueError('Formato inesperado')
        path.write_bytes(data)
        print(f'Capa salva: {slug}')
    except Exception:
        print(f'Fallback visual disponível: {slug}')

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(download, GAMES))
