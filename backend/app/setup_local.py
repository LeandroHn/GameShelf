"""Cria configuração local sem sobrescrever um .env existente."""
from pathlib import Path
import secrets

def main():
    path = Path('.env')
    if path.exists():
        print('.env já existe; configuração preservada.')
        return
    template = Path('.env.example').read_text(encoding='utf-8')
    path.write_text(template.replace('DEMO_PASSWORD=\n', f'DEMO_PASSWORD={secrets.token_urlsafe(18)}\n'), encoding='utf-8')
    print('Configuração criada. Consulte DEMO_EMAIL e DEMO_PASSWORD no arquivo backend/.env para entrar.')

if __name__ == '__main__':
    main()
