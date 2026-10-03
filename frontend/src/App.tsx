import {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
  type FormEvent,
  type CSSProperties,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Library,
  Compass,
  Search,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Check,
  Star,
  LogOut,
  UserRound,
  Gamepad2,
  LoaderCircle,
  AlertCircle,
  X,
  Trash2,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import {
  api,
  ApiError,
  statuses,
  type User,
  type Game,
  type Entry,
  type Status,
} from "./api";

type Context = {
  user: User | null;
  entries: Entry[];
  refresh: () => Promise<void>;
  authenticate: (user: User) => Promise<void>;
  notify: (message: string) => void;
};
const SessionContext = createContext<Context>(null!);
const useSession = () => useContext(SessionContext);
function Loading() {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="spin" />
      <p>Preparando sua próxima aventura…</p>
    </div>
  );
}
function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error" role="alert">
      <AlertCircle size={19} />
      <span>{message}</span>
      {retry && <button onClick={retry}>Tentar novamente</button>}
    </div>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Library size={38} />
      <h3>{title}</h3>
      <div className="empty-description">{children}</div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [entries, setEntries] = useState<Entry[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const navigate = useNavigate();
  async function refresh() {
    try {
      setEntries(await api<Entry[]>("/collection"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setEntries([]);
      }
      throw e;
    }
  }
  async function initialize() {
    setError("");
    setReady(false);
    try {
      const u = await api<User>("/auth/me");
      setUser(u);
      setEntries(await api<Entry[]>("/collection"));
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void initialize();
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function authenticate(u: User) {
    setUser(u);
    await refresh();
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setEntries([]);
      navigate("/");
      setToast("Você saiu da sua conta.");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  return (
    <SessionContext.Provider
      value={{ user, entries, refresh, authenticate, notify: setToast }}
    >
      <header className="header">
        <div className="nav-shell">
          <Link className="brand" to="/">
            <span className="brand-icon">
              <Library size={22} />
            </span>
            game<span>shelf</span>
            <i>●</i>
          </Link>
          <nav aria-label="Navegação principal">
            <NavLink to="/" end>
              <Compass size={17} />
              Explorar
            </NavLink>
            <NavLink to="/collection">
              <Library size={17} />
              Minha coleção
            </NavLink>
          </nav>
          <div className="account">
            {user ? (
              <>
                <Link className="avatar-link" to="/profile">
                  <span className="avatar">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="user-name">{user.name}</span>
                </Link>
                <button
                  className="icon-button"
                  onClick={logout}
                  aria-label="Sair da conta"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="button small" to="/login">
                Entrar <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main>
        {!ready ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} retry={() => void initialize()} />
        ) : (
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/games/:id" element={<Details />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/profile" element={<Collection profile />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth register />} />
            <Route
              path="*"
              element={
                <Empty title="Esse caminho ainda não foi explorado.">
                  <Link to="/">Voltar ao catálogo</Link>
                </Empty>
              }
            />
          </Routes>
        )}
      </main>
      <footer>
        <Link className="brand" to="/">
          <Library size={18} />
          gameshelf
        </Link>
        <span>Todo jogo tem uma história. A próxima é sua.</span>
        <span className="footer-end">FEITO PARA QUEM JOGA</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </SessionContext.Provider>
  );
}

function Cover({ game, hero = false }: { game: Game; hero?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`cover ${hero ? "hero-cover" : ""}`}
      style={{ "--cover-color": game.color } as CSSProperties}
    >
      {!failed && game.cover ? (
        <img
          src={game.cover}
          alt={`Capa de ${game.title}`}
          loading={hero ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-fallback">
          <Gamepad2 size={42} />
          <span>{game.title}</span>
          <small>{game.studio}</small>
        </div>
      )}
      <div className="cover-shade" />
    </div>
  );
}

function GameCard({ game, entry }: { game: Game; entry?: Entry }) {
  const { user, refresh, notify } = useSession(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false);
  async function add() {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      await api(`/collection/${game.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "wishlist" }),
      });
      await refresh();
      notify("Jogo adicionado à sua coleção.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="game-card">
      <div className="card-art">
        <Link to={`/games/${game.id}`} aria-label={`Ver ${game.title}`}>
          <Cover game={game} />
        </Link>
        <span className="card-genre">{game.genre}</span>
        {entry ? (
          <Link
            className="card-add added"
            to={`/games/${game.id}`}
            aria-label={`Editar ${game.title}`}
          >
            <Check size={19} />
          </Link>
        ) : (
          <button
            disabled={busy}
            className="card-add"
            onClick={add}
            aria-label={`Adicionar ${game.title} à coleção`}
          >
            {busy ? (
              <LoaderCircle className="spin" size={19} />
            ) : (
              <Plus size={19} />
            )}
          </button>
        )}
        {entry && (
          <span className={`status-ribbon ${entry.status}`}>
            <span /> {statuses[entry.status]}
          </span>
        )}
      </div>
      <Link className="card-title" to={`/games/${game.id}`}>
        {game.title}
      </Link>
      <div className="card-meta">
        <span>
          {game.year} <b>·</b> {game.platforms.split(",")[0]}
        </span>
        {entry?.rating ? (
          <span className="rating">
            <Star size={12} fill="currentColor" />
            {entry.rating.toFixed(1)}
          </span>
        ) : (
          <span>{game.genre}</span>
        )}
      </div>
    </article>
  );
}

function Catalog() {
  const { entries } = useSession(),
    [games, setGames] = useState<Game[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [genre, setGenre] = useState(""),
    [platform, setPlatform] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setGames(await api<Game[]>("/games"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const filtered = games.filter(
    (g) =>
      g.title
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (!genre || g.genre === genre) &&
      (!platform || g.platforms.split(",").includes(platform)),
  );
  const featured = games[0];
  return (
    <>
      <div className="eyebrow intro-label">
        <span /> SEU PRÓXIMO MUNDO ESTÁ AQUI
      </div>
      <section className="intro">
        <div>
          <h1>
            Sua vida <em>em jogos.</em>
          </h1>
          <p>
            Descubra novos mundos. Organize os seus favoritos.
            <br className="desktop-break" /> Guarde cada aventura em uma só
            estante.
          </p>
        </div>
        <div className="intro-note">
          <span className="mini-line" />
          <span>
            MAIS QUE UM BACKLOG.
            <br />
            <strong>Uma história para contar.</strong>
          </span>
        </div>
      </section>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} retry={() => void load()} />
      ) : (
        <>
          {featured && (
            <section className="featured">
              <Cover game={featured} hero />
              <div className="featured-content">
                <span className="feature-tag">
                  <span /> EM DESTAQUE
                </span>
                <p className="feature-kicker">UM MUNDO QUE NÃO SE ESQUECE</p>
                <h2>{featured.title}</h2>
                <p className="feature-description">{featured.description}</p>
                <div className="feature-meta">
                  <span>{featured.genre}</span>
                  <span>{featured.year}</span>
                  <span>{featured.studio}</span>
                </div>
                <Link className="button" to={`/games/${featured.id}`}>
                  Explorar este mundo <ArrowUpRight size={18} />
                </Link>
              </div>
              <div className="feature-index">
                <span>01</span> / 20
              </div>
            </section>
          )}
          <section className="catalog-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ESCOLHA SUA PRÓXIMA AVENTURA</span>
                <h2>
                  Explore o catálogo
                  <span className="count">{games.length}</span>
                </h2>
              </div>
              <span className="curated">
                Uma seleção para todos os seus moods.
              </span>
            </div>
            <div className="filters">
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Buscar jogos"
                  placeholder="Qual vai ser o próximo jogo?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => setQuery("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
              <div className="filter-select">
                <SlidersHorizontal size={15} />
                <select
                  aria-label="Filtrar por gênero"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  <option value="">Todos os gêneros</option>
                  {[...new Set(games.map((g) => g.genre))].sort().map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <select
                aria-label="Filtrar por plataforma"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="">Todas as plataformas</option>
                {["PC", "PlayStation", "Xbox", "Switch"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="results-label">
              <span>{filtered.length} jogos para descobrir</span>
              <span>
                Curadoria GameShelf <span className="purple-dot">●</span>
              </span>
            </div>
            {filtered.length ? (
              <div className="game-grid">
                {filtered.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    entry={entries.find((e) => e.game_id === g.id)}
                  />
                ))}
              </div>
            ) : (
              <Empty title="Nenhum jogo por aqui.">
                Tente outro nome ou{" "}
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery("");
                    setGenre("");
                    setPlatform("");
                  }}
                >
                  limpe os filtros
                </button>
                .
              </Empty>
            )}
          </section>
          <section className="bottom-note">
            <Library size={28} />
            <div>
              <h3>Seu próximo favorito merece um lugar aqui.</h3>
              <p>Do primeiro play aos créditos finais, construa sua coleção.</p>
            </div>
            <Link to="/collection">
              Abrir minha estante <ArrowRight size={18} />
            </Link>
          </section>
        </>
      )}
    </>
  );
}

function Auth({ register = false }: { register?: boolean }) {
  const { user, authenticate } = useSession(),
    navigate = useNavigate(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setError("");
  }, [register]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const u = await api<User>(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await authenticate(u);
      navigate("/collection");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (user)
    return (
      <Empty title={`Você já está em casa, ${user.name}.`}>
        <Link to="/collection">Abrir minha coleção</Link>
      </Empty>
    );
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <span className="eyebrow">CADA PLAY CONTA</span>
        <h1>
          Grandes jogos.
          <br />
          Boas memórias.
          <br />
          <em>Sua estante.</em>
        </h1>
        <p>
          Um lugar para os mundos que você já explorou.
          <br />E para todos os que ainda esperam por você.
        </p>
        <div className="auth-decoration">
          <Library size={100} strokeWidth={1} />
        </div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <span className="form-icon">
          <Gamepad2 />
        </span>
        <h2>{register ? "Comece sua coleção" : "Bom ter você de volta."}</h2>
        <p>
          {register
            ? "Crie sua conta e dê um lugar às suas aventuras."
            : "Entre para continuar de onde parou."}
        </p>
        {error && <ErrorBox message={error} />}{" "}
        {register && (
          <label>
            Seu nome
            <input
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={60}
              required
              placeholder="Como podemos chamar você?"
            />
          </label>
        )}
        <label>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@exemplo.com"
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            minLength={register ? 10 : 1}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
            required
            placeholder={register ? "Pelo menos 10 caracteres" : "Sua senha"}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              {register ? "Criar minha conta" : "Entrar na minha estante"}
              <ArrowRight size={18} />
            </>
          )}
        </button>
        <p className="auth-switch">
          {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Entrar" : "Criar conta"}
          </Link>
        </p>
        <div className="private-note">
          Sua coleção, suas notas, suas opiniões.
          <br />
          Tudo pessoal, do seu jeito.
        </div>
      </form>
    </div>
  );
}

function Collection({ profile = false }: { profile?: boolean }) {
  const { user, entries } = useSession(),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("date"),
    [query, setQuery] = useState("");
  if (!user)
    return (
      <Empty title="Sua estante começa com você.">
        <p>Entre para organizar seus jogos e registrar cada experiência.</p>
        <Link className="button" to="/login">
          Entrar na minha conta <ArrowRight size={17} />
        </Link>
      </Empty>
    );
  const rated = entries.filter((e) => e.rating !== null),
    average = rated.length
      ? (rated.reduce((s, e) => s + e.rating!, 0) / rated.length).toFixed(1)
      : "—";
  const filtered = entries
    .filter(
      (e) =>
        (!status || e.status === status) &&
        e.game.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.game.title.localeCompare(b.game.title)
        : sort === "rating"
          ? (b.rating ?? 0) - (a.rating ?? 0)
          : b.added_at.localeCompare(a.added_at),
    );
  return (
    <>
      <section className="collection-intro">
        <span className="eyebrow">
          {profile ? "PERFIL DO JOGADOR" : "SEU UNIVERSO PARTICULAR"}
        </span>
        <div className="collection-heading">
          <div>
            <h1>
              {profile ? user.name : "Minha coleção"}
              <span className="purple-dot">.</span>
            </h1>
            <p>
              {profile
                ? "Cada aventura deixa uma marca. Estas são as suas."
                : "Alguns mundos a gente nunca deixa para trás."}
            </p>
          </div>
          <Link className="button secondary" to="/">
            <Plus size={17} />
            Descobrir jogos
          </Link>
        </div>
      </section>
      <div className="stats">
        {[
          [Library, entries.length, "Na coleção"],
          [
            Trophy,
            entries.filter((e) => e.status === "completed").length,
            "Jogos zerados",
          ],
          [
            Gamepad2,
            entries.filter((e) => e.status === "playing").length,
            "Jogando agora",
          ],
          [Star, average, "Sua média"],
        ].map(([Icon, value, label]) => {
          const I = Icon as typeof Library;
          return (
            <div className="stat" key={String(label)}>
              <I size={20} />
              <strong>{String(value)}</strong>
              <span>{String(label)}</span>
            </div>
          );
        })}
      </div>
      <div className="collection-tools">
        <div className="tabs" aria-label="Estado dos jogos">
          <button
            className={!status ? "active" : ""}
            onClick={() => setStatus("")}
          >
            Todos <span>{entries.length}</span>
          </button>
          {Object.entries(statuses).map(([key, label]) => (
            <button
              key={key}
              className={status === key ? "active" : ""}
              onClick={() => setStatus(key)}
            >
              {label}
              <span>{entries.filter((e) => e.status === key).length}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar na coleção"
              placeholder="Encontre na sua estante…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Ordenar coleção"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date">Adicionados recentemente</option>
            <option value="title">Título: A–Z</option>
            <option value="rating">Maior nota primeiro</option>
          </select>
        </div>
      </div>
      {filtered.length ? (
        <div className="game-grid">
          {filtered.map((e) => (
            <GameCard key={e.id} game={e.game} entry={e} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            entries.length
              ? "Nenhum jogo neste filtro."
              : "Uma estante cheia de possibilidades."
          }
        >
          {entries.length ? (
            "Escolha outro estado ou busque por outro nome."
          ) : (
            <>
              <p>Encontre seu primeiro jogo e adicione à coleção.</p>
              <Link className="button" to="/">
                Explorar catálogo <ArrowRight size={17} />
              </Link>
            </>
          )}
        </Empty>
      )}
    </>
  );
}

function Details() {
  const { id } = useParams(),
    { user, entries, refresh, notify } = useSession(),
    [game, setGame] = useState<Game | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setGame(await api<Game>(`/games/${id}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} retry={() => void load()} />;
  if (!game) return null;
  return (
    <>
      <Link className="back-link" to="/">
        ← Voltar ao catálogo
      </Link>
      <div className="detail-layout">
        <div className="detail-art">
          <Cover game={game} />
        </div>
        <div className="detail-main">
          <span className="eyebrow">
            {game.genre} <b> / </b> {game.year}
          </span>
          <h1>{game.title}</h1>
          <p className="studio">Uma experiência de {game.studio}</p>
          <p className="description">{game.description}</p>
          <div className="platforms">
            {game.platforms.split(",").map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
          <div className="divider" />
          {user ? (
            <EntryEditor
              key={`${game.id}-${entries.find((e) => e.game_id === game.id)?.id ?? "new"}`}
              game={game}
              entry={entries.find((e) => e.game_id === game.id)}
              refresh={refresh}
              notify={notify}
            />
          ) : (
            <div className="signin-callout">
              <Library />
              <h3>Qual é a sua história com este jogo?</h3>
              <p>Adicione à coleção, dê sua nota e registre suas impressões.</p>
              <Link className="button" to="/login">
                Entre para adicionar <Plus size={18} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EntryEditor({
  game,
  entry,
  refresh,
  notify,
}: {
  game: Game;
  entry?: Entry;
  refresh: () => Promise<void>;
  notify: (m: string) => void;
}) {
  const [status, setStatus] = useState<Status>(entry?.status ?? "wishlist"),
    [rating, setRating] = useState<number | null>(entry?.rating ?? null),
    [review, setReview] = useState(entry?.review ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/collection/${game.id}`, {
        method: "PUT",
        body: JSON.stringify({ status, rating, review }),
      });
      await refresh();
      notify("Sua coleção foi atualizada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/collection/${game.id}`, { method: "DELETE" });
      await refresh();
      notify("Jogo removido da coleção.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  return (
    <form className="entry-form" onSubmit={save}>
      <div className="editor-title">
        <h2>{entry ? "Na sua estante" : "Dê um lugar na sua estante"}</h2>
        <span>
          <UserRound size={13} /> Só você pode ver
        </span>
      </div>
      {error && <ErrorBox message={error} />}
      <label>
        Sua jornada
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          {Object.entries(statuses).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="rating-row">
        <span>Sua nota</span>
        <div className="stars" role="group" aria-label="Avaliação pessoal">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
            >
              <Star
                size={27}
                className={rating !== null && n <= rating ? "filled" : ""}
              />
            </button>
          ))}
        </div>
        {rating && (
          <button
            className="text-button"
            type="button"
            onClick={() => setRating(null)}
          >
            Limpar
          </button>
        )}
      </div>
      <label>
        Suas impressões <span className="optional">opcional</span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={4000}
          rows={5}
          placeholder="O que ficou com você depois do último play?"
        />
      </label>
      <span className="char-count">{review.length}/4.000</span>
      <div className="editor-actions">
        <button className="button" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : entry ? (
            <Check size={17} />
          ) : (
            <Plus size={17} />
          )}{" "}
          {entry ? "Salvar alterações" : "Adicionar à coleção"}
        </button>
        {entry && (
          <button
            className="icon-button danger"
            aria-label="Remover da coleção"
            type="button"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={19} />
          </button>
        )}
      </div>
      {confirm && (
        <div className="confirm" role="alert">
          <p>Remover este jogo? A nota e a review também serão apagadas.</p>
          <button type="button" disabled={busy} onClick={remove}>
            Sim, remover
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}
