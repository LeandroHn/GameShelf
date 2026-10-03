# GameShelf

Sua vida em jogos. Catálogo pessoal full stack em português do Brasil, com React, TypeScript, Vite, Tailwind CSS, FastAPI, SQLAlchemy e SQLite. Sem Docker, serviços pagos ou APIs externas em execução.

## Obter o projeto

```powershell
git clone https://github.com/LeandroHn/GameShelf.git
cd GameShelf
code .
```

O repositório é privado: use uma conta com acesso. Se `code` não estiver no PATH, abra a pasta GameShelf pelo menu **Arquivo → Abrir Pasta** do VS Code.

## Executar no Windows (PowerShell)

Requisitos: Node.js 22+ e Python 3.12+. Abra esta pasta no VS Code. Os comandos abaixo partem da raiz do projeto.

### 1. Preparar o backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.setup_local
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Não é necessário ativar o ambiente virtual nem alterar a política de execução do PowerShell. Se `py` não existir, instale Python 3.12 pelo python.org ou use uv:

```powershell
# Dentro de backend, alternativa à criação e instalação acima:
& "$env:USERPROFILE\.local\bin\uv.exe" venv --python 3.12 .venv
& "$env:USERPROFILE\.local\bin\uv.exe" pip install --python .venv\Scripts\python.exe -r requirements.txt
```

Depois da primeira configuração, inicie o backend diretamente com o comando uvicorn acima; não é necessário recriar o ambiente ou repetir o seed.

### 2. Iniciar o frontend em outro terminal

```powershell
cd frontend
npm ci
npm run dev
```

Abra **http://localhost:5173**. Documentação da API: **http://127.0.0.1:8000/docs**. Use o mesmo host durante a sessão: cookies de localhost e 127.0.0.1 são independentes. O Vite encaminha `/api` ao FastAPI.

Também há tarefas no VS Code: **Terminal → Executar tarefa → GameShelf: backend** e **GameShelf: frontend**. Mantenha ambas em execução; pare com Ctrl+C nos terminais.

### Conta de demonstração

`app.setup_local` cria o arquivo local `backend/.env` a partir de [backend/.env.example](backend/.env.example) e gera uma senha aleatória. Abra esse arquivo e consulte `DEMO_EMAIL` e `DEMO_PASSWORD`. O e-mail padrão é **demo@example.com**. Nenhuma senha é incluída no código ou no frontend.

O seed cria Alex com quatro jogos, notas e reviews. Pode ser repetido sem duplicar registros nem substituir alterações pessoais. Mudar a senha no `.env` depois da criação não muda a senha da conta existente. Também é possível cadastrar sua própria conta na interface.

### Configuração

[backend/.env.example](backend/.env.example) contém todas as opções. Alternativamente, copie-o para `.env`, preencha `DEMO_PASSWORD` com pelo menos dez caracteres e execute o seed. Não compartilhe `.env` ou o banco pessoal.

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | Caminho SQLite relativo à pasta backend |
| `SESSION_HOURS` | Expiração das sessões, padrão 24 horas |
| `COOKIE_SECURE` | `false` para HTTP local; `true` com HTTPS |
| `ALLOWED_ORIGINS` | Origens permitidas separadas por vírgulas |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Credenciais para a primeira criação da conta de demonstração |

O seed cria `backend/gameshelf.db`, persistente entre reinicializações. Para backup, pare a API e copie esse arquivo. Alterações futuras do esquema exigirão migrações: `create_all` não modifica tabelas existentes.

## Funcionalidades

- 20 jogos reais, descrições originais, capas locais e fallback visual.
- Busca, filtros por gênero/plataforma e página de detalhes.
- Cadastro, login, logout com revogação de sessão e perfil pessoal.
- Coleção com Quero jogar, Jogando, Zerado e Abandonado; inclusão, edição e remoção confirmada.
- Notas de 1 a 5, remoção de nota e reviews privadas editáveis de até 4.000 caracteres.
- Estatísticas e ordenação por título, nota ou data de adição.
- Layout responsivo, ícones Lucide, estados de carregamento/erro/vazio, foco por teclado e redução de movimento.

## Organização

```text
backend/
  app/database.py       Configuração e conexão
  app/models.py         Modelos e restrições do banco
  app/schemas.py        Validação e respostas públicas
  app/main.py           API, autenticação e autorização
  app/catalog.py        Conteúdo dos 20 jogos
  app/seed.py           Inicialização idempotente
  app/setup_local.py    Configuração local sem sobrescrita
  tests/test_flows.py   Testes de integração com SQLite isolado
frontend/
  src/App.tsx           Rotas, telas e componentes
  src/api.ts            Cliente HTTP e tipos
  src/styles.css        Tailwind e identidade visual
  public/covers/        Capas locais
```

A API é a fonte dos dados. Busca e ordenação da interface operam sobre o pequeno conjunto carregado do backend; a API também fornece filtros e ordenação. Estatísticas visuais são derivadas da coleção autenticada, com uma rota equivalente no backend.

## Verificações

```powershell
# Na pasta backend
.\.venv\Scripts\python.exe -m pytest -q

# Na pasta frontend
npm run build
npm run preview
```

O preview abre em http://localhost:4173 e precisa da API em execução. Para formatar o frontend: `npx prettier --write src vite.config.ts`.

Os testes cobrem cadastro, duplicidade de e-mail, hash Argon2, login inválido/válido, logout, expiração, quatro estados da coleção, ausência de duplicação, edição/remoção de notas e reviews, estatísticas, ordenação, filtros, validação, origem proibida e isolamento entre usuários. Usam banco em memória e não alteram sua coleção.

## Segurança e limites

Senhas usam Argon2. O cookie é HttpOnly e SameSite=Lax; tokens aleatórios expiram e somente seus hashes ficam no banco. Logout revoga o token. Consultas pessoais usam o usuário da sessão, nunca um ID fornecido pelo frontend. Uma restrição única impede duplicar jogo por usuário. Erros internos não são retornados ao cliente.

Versão destinada ao uso local. Não inclui recuperação de senha, verificação de e-mail, limite de tentativas de login ou migrações automatizadas. Para exposição pública, adicione HTTPS, cookie Secure, limites de requisições, backups e migrações. Não há funcionalidades sociais nem reviews públicas.

As 20 capas estão incluídas no projeto e não exigem internet em execução. A ferramenta opcional `python -m app.download_covers`, executada no ambiente virtual dentro de backend, pode baixá-las novamente. Direitos e fontes estão em [ATTRIBUTION.md](frontend/public/covers/ATTRIBUTION.md); verifique permissões antes de redistribuição pública.
## Como usar

1. Abra o catálogo e encontre um jogo pela busca ou pelos filtros.
2. Crie uma conta ou entre com as credenciais locais geradas pelo setup.
3. Clique em **+** no card para adicionar aos jogos que quer jogar.
4. Abra os detalhes para mudar o estado, atribuir estrelas e escrever sua review. Clique em **Salvar alterações** para persistir.
5. Consulte **Minha coleção** para filtrar por estado e ordenar a estante. Clique no seu nome no cabeçalho para acessar o perfil e suas estatísticas.
6. Para remover um jogo, use a lixeira nos detalhes e confirme. A remoção também apaga sua nota e review daquele jogo.

## API e persistência

Todas as rotas usam o prefixo `/api`. As rotas pessoais exigem o cookie de sessão obtido no login ou cadastro. O frontend nunca recebe a senha armazenada nem o token por JavaScript.

| Método e rota | Finalidade |
| --- | --- |
| `POST /auth/register` | Criar conta e iniciar sessão |
| `POST /auth/login` | Entrar com e-mail e senha |
| `POST /auth/logout` | Revogar sessão e remover cookie |
| `GET /auth/me` | Consultar usuário autenticado |
| `GET /games` | Catálogo; aceita `q`, `genre` e `platform` |
| `GET /games/{game_id}` | Detalhes de um jogo |
| `GET /collection` | Coleção pessoal; `sort=date`, `title` ou `rating` |
| `PUT /collection/{game_id}` | Adicionar ou substituir estado, nota e review |
| `DELETE /collection/{game_id}` | Remover jogo da coleção pessoal |
| `GET /profile/stats` | Total, zerados, jogando e média das notas |

Exemplo de corpo para salvar um item:

```json
{
  "status": "completed",
  "rating": 5,
  "review": "Uma aventura que ficou na memória."
}
```

Estados da API: `wishlist`, `playing`, `completed` e `dropped`. `rating` pode ser `null` para remover a nota. O `PUT` substitui os três campos; envie o estado completo que deseja manter.

O SQLite contém quatro tabelas: `users`, `sessions`, `games` e `entries`. Nota e review pertencem ao item da coleção; a combinação usuário/jogo é única. A média considera somente jogos avaliados. O catálogo é público, mas coleções, avaliações e reviews são pessoais.

## Solução de problemas

| Sintoma | Como resolver |
| --- | --- |
| `py` não reconhecido | Instale Python 3.12 ou use os comandos alternativos de uv |
| Erro ao ativar ambiente no PowerShell | Use diretamente `.venv\Scripts\python.exe`, conforme os exemplos; ativação é dispensável |
| Catálogo não carrega | Confira se a API está na porta 8000 e se o seed foi executado dentro de `backend` |
| Porta 5173/8000 ocupada | Encerre a instância anterior com Ctrl+C antes de iniciar outra |
| `DEMO_PASSWORD` ausente | Execute `app.setup_local` ou preencha a variável no `.env` existente |
| Login demo falha após mudar `.env` | A senha no banco permanece a da criação; o seed não redefine credenciais |
| Sessão expirada | Faça login novamente; o prazo padrão é 24 horas |
| Origem não autorizada | Use localhost/127.0.0.1 nas portas documentadas ou ajuste `ALLOWED_ORIGINS` e reinicie a API |
| Alterações de configuração sem efeito | Reinicie o backend depois de editar `.env` |

## Validação desta versão

- Build de produção do frontend aprovado.
- Três testes de integração aprovados, cobrindo os fluxos listados na seção de verificações.
- Seed executado repetidamente: 20 jogos, conta demo e quatro itens preservados.
- Cadastro, adição, alteração de estado, avaliação, persistência de review após recarga, remoção e logout verificados no navegador.
- Layout sem rolagem horizontal verificado nas larguras de 390 e 1440 pixels.

## Arquivos locais e distribuição

O repositório inclui código-fonte, lockfile npm, exemplos de configuração, testes e capas. `.env`, bancos SQLite, ambiente virtual, `node_modules` e artefatos de build ficam fora do Git. Cada clone deve preparar seu próprio ambiente e banco seguindo este documento.

Este repositório contém a aplicação; enviar o código ao GitHub não hospeda automaticamente o frontend ou a API. As capas pertencem aos respectivos titulares, conforme as atribuições. Nenhuma licença de redistribuição dessas artes é concedida pelo projeto.