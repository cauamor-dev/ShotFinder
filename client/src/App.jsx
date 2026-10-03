import { useEffect, useRef, useState } from "react";
import { request } from "./api.js";
import { copy } from "./i18n.js";
import { readStorage, writeStorage, validTitles } from "./storage.js";
import Icon from "./components/Icon.jsx";
import TitleCard from "./components/TitleCard.jsx";
import TitleDialog from "./components/TitleDialog.jsx";
import "./App.css";

const titleKey = (item) => `${item.media_type}:${item.id}`;
const examples = ["Interestelar", "Star Wars", "Como Treinar o Seu Dragão"];

export default function App() {
  const [lang, setLang] = useState(() =>
    readStorage("shotfinder_lang", "pt") === "en" ? "en" : "pt",
  );
  const [theme, setTheme] = useState(() =>
    readStorage("shotfinder_theme_v2", "dark") === "light" ? "light" : "dark",
  );
  const [view, setView] = useState("discover"),
    [mode, setMode] = useState("title");
  const [text, setText] = useState(""),
    [query, setQuery] = useState("");
  const [results, setResults] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("relevance");
  const [saved, setSaved] = useState(() =>
    validTitles(readStorage("shotfinder_saved", [])),
  );
  const [history, setHistory] = useState(() => {
    const value = readStorage("shotfinder_history_v2", []);
    return Array.isArray(value)
      ? value
          .filter((x) => typeof x === "string" && x.length <= 500)
          .slice(0, 6)
      : [];
  });
  const [suggestions, setSuggestions] = useState([]),
    [focused, setFocused] = useState(false),
    [active, setActive] = useState(-1);
  const [selected, setSelected] = useState(null);
  const input = useRef(null),
    searchController = useRef(null),
    searchArea = useRef(null);
  const t = copy[lang];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStorage("shotfinder_theme_v2", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    writeStorage("shotfinder_lang", lang);
  }, [lang]);
  useEffect(() => {
    writeStorage("shotfinder_saved", saved);
  }, [saved]);
  useEffect(() => {
    writeStorage("shotfinder_history_v2", history);
  }, [history]);
  useEffect(() => () => searchController.current?.abort(), []);
  useEffect(() => {
    const outside = (event) => {
      if (!searchArea.current?.contains(event.target)) setFocused(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setSuggestions([]);
    setActive(-1);
    if (text.trim().length < 2 || mode !== "title" || !focused)
      return () => controller.abort();
    const timer = setTimeout(() => {
      request(
        `/suggestions?text=${encodeURIComponent(text.trim())}&lang=${lang}`,
        { signal: controller.signal },
      )
        .then((data) => setSuggestions(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, lang, mode, focused]);

  function toggleSaved(item) {
    setSaved((current) =>
      current.some((x) => titleKey(x) === titleKey(item))
        ? current.filter((x) => titleKey(x) !== titleKey(item))
        : [item, ...current].slice(0, 100),
    );
  }
  async function search(value = text, searchMode = mode, searchLang = lang) {
    const next = value.trim();
    if (!next) {
      input.current?.focus();
      return;
    }
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setFocused(false);
    setText(next);
    setQuery(next);
    setView("discover");
    setLoading(true);
    setError("");
    setResults(null);
    setFilter("all");
    setHistory((current) =>
      [next, ...current.filter((x) => x !== next)].slice(0, 6),
    );
    try {
      const data = await request("/search", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          text: next,
          lang: searchLang,
          mode: searchMode,
        }),
      });
      if (!controller.signal.aborted)
        setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.code || "CONNECTION");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function changeLanguage(next) {
    setLang(next);
    if (view === "discover" && (results !== null || loading || error))
      search(query, mode, next);
  }
  function suggestionKey(event) {
    if (event.key === "Escape") {
      setFocused(false);
      return;
    }
    if (!focused || !suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((x) => (x + 1) % suggestions.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((x) => (x <= 0 ? suggestions.length - 1 : x - 1));
    }
    if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      setSelected(suggestions[active]);
      setText(suggestions[active].title);
      setFocused(false);
    }
  }
  const items = view === "saved" ? saved : results || [];
  const visible = items
    .filter((x) => filter === "all" || x.media_type === filter)
    .slice()
    .sort((a, b) =>
      sort === "rating"
        ? b.rating - a.rating
        : sort === "newest"
          ? Number(b.year) - Number(a.year)
          : 0,
    );
  const showList = view === "saved" || results !== null || loading || error;
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => {
            setView("discover");
            input.current?.focus();
          }}
          aria-label="ShotFinder"
        >
          <span className="brand-mark">
            <Icon name="film" size={25} />
          </span>
          <span>
            shotfinder<span className="brand-dot">.</span>
          </span>
        </button>
        <nav
          aria-label={lang === "pt" ? "Navegação principal" : "Main navigation"}
        >
          <button
            className={view === "discover" ? "nav-active" : ""}
            onClick={() => {
              setView("discover");
              setFilter("all");
            }}
          >
            {t.discover}
          </button>
          <button
            className={view === "saved" ? "nav-active" : ""}
            onClick={() => {
              setView("saved");
              setFilter("all");
              setFocused(false);
            }}
          >
            <Icon name="bookmark" size={16} />
            {t.saved}
            <span className="nav-count">{saved.length}</span>
          </button>
        </nav>
        <div className="header-tools">
          <select
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            aria-label={t.changeLanguage}
          >
            <option value="pt">PT</option>
            <option value="en">EN</option>
          </select>
          <span className="tool-divider" />
          <button
            className="icon-button"
            onClick={() => setTheme((x) => (x === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? t.light : t.dark}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
        </div>
      </header>
      <main>
        {view === "discover" ? (
          <section className={`discovery ${showList ? "compact" : ""}`}>
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="status-dot" />
                {t.eyebrow}
              </p>
              <h1>
                {t.heading}
                <br />
                <em>{t.headingEnd}</em>
              </h1>
              <p className="hero-intro">{t.intro}</p>
              <div className="hero-caption">
                <span>01 / DISCOVER</span>
                <span className="caption-line" />
                <Icon name="film" size={16} />
              </div>
            </div>
            <div className="search-panel">
              <div className="mode-tabs" aria-label={t.label}>
                <button
                  aria-pressed={mode === "title"}
                  className={mode === "title" ? "active" : ""}
                  onClick={() => {
                    setMode("title");
                    input.current?.focus();
                  }}
                >
                  {t.titleMode}
                </button>
                <button
                  aria-pressed={mode === "scene"}
                  className={mode === "scene" ? "active" : ""}
                  onClick={() => {
                    setMode("scene");
                    setFocused(false);
                    input.current?.focus();
                  }}
                >
                  {t.sceneMode}
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  search();
                }}
                autoComplete="off"
              >
                <label className="search-label" htmlFor="title-search">
                  {t.label}
                </label>
                <div className="search-field" ref={searchArea}>
                  <Icon name="search" size={22} />
                  <input
                    ref={input}
                    id="title-search"
                    value={text}
                    maxLength={500}
                    placeholder={
                      mode === "scene" ? t.scenePlaceholder : t.placeholder
                    }
                    onChange={(e) => {
                      setText(e.target.value);
                      setFocused(true);
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={(e) => {
                      if (!searchArea.current?.contains(e.relatedTarget))
                        setFocused(false);
                    }}
                    onKeyDown={suggestionKey}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={focused && suggestions.length > 0}
                    aria-controls="title-suggestions"
                    aria-activedescendant={
                      active >= 0 && focused
                        ? `suggestion-${active}`
                        : undefined
                    }
                  />
                  {text && (
                    <button
                      type="button"
                      className="input-clear"
                      onClick={() => {
                        setText("");
                        input.current?.focus();
                      }}
                      aria-label={t.clear}
                    >
                      <Icon name="close" size={17} />
                    </button>
                  )}
                  {focused && suggestions.length > 0 && (
                    <ul
                      className="suggestions"
                      id="title-suggestions"
                      role="listbox"
                      aria-label={t.results}
                    >
                      {suggestions.map((s, i) => (
                        <li
                          key={titleKey(s)}
                          id={`suggestion-${i}`}
                          role="option"
                          aria-selected={i === active}
                          className={i === active ? "active" : ""}
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelected(s);
                            setText(s.title);
                            setFocused(false);
                          }}
                        >
                          <span>
                            <strong>{s.title}</strong>
                            <small>
                              {s.media_type === "tv" ? t.series : t.movies} ·{" "}
                              {s.year || "—"}
                            </small>
                          </span>
                          <Icon name="arrow" size={16} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="search-hint">
                  {mode === "scene" ? t.sceneHint : t.searchHint}
                </p>
                <button
                  className="search-submit"
                  disabled={!text.trim() || loading}
                >
                  {loading ? t.searching : t.search}
                  <Icon name="arrow" size={20} />
                </button>
              </form>
              {!showList && (
                <div className="examples">
                  <span className="section-label">{t.examples}</span>
                  <div>
                    {(lang === "pt"
                      ? examples
                      : [
                          "Interstellar",
                          "Star Wars",
                          "How to Train Your Dragon",
                        ]
                    ).map((example, i) => (
                      <button
                        key={example}
                        onClick={() => {
                          setMode("title");
                          search(example, "title");
                        }}
                      >
                        <span>0{i + 1}</span>
                        {example}
                        <Icon name="arrow" size={15} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="region-label">
                <span className="country-badge">BR</span>
                {t.region}
              </div>
            </div>
          </section>
        ) : (
          <section className="watchlist-heading">
            <p className="eyebrow">02 / WATCHLIST</p>
            <h1>{t.listHeading}</h1>
            <p>{t.listIntro}</p>
          </section>
        )}
        {view === "discover" && history.length > 0 && (
          <div className="history-bar">
            <span>
              <Icon name="clock" size={14} />
              {t.recent}
            </span>
            <div>
              {history.map((h) => (
                <button onClick={() => search(h)} key={h} title={h}>
                  {h}
                </button>
              ))}
            </div>
            <button className="clear-history" onClick={() => setHistory([])}>
              {t.clear}
            </button>
          </div>
        )}
        {showList && (
          <section
            className="results-section"
            aria-label={view === "saved" ? t.saved : t.results}
          >
            <div className="results-header">
              <div>
                <span className="section-label">
                  {view === "saved" ? t.saved : t.resultsFor}
                </span>
                <h2>
                  {view === "saved" ? `${saved.length} ${t.savedCount}` : query}
                  <span className="result-count">{items.length}</span>
                </h2>
              </div>
              <div className="results-controls">
                <div className="filter-tabs">
                  {[
                    ["all", t.all],
                    ["movie", t.movies],
                    ["tv", t.series],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      className={filter === key ? "active" : ""}
                      aria-pressed={filter === key}
                      onClick={() => setFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label={t.sort}
                >
                  <option value="relevance">{t.relevance}</option>
                  <option value="rating">{t.rating}</option>
                  <option value="newest">{t.newest}</option>
                </select>
              </div>
            </div>
            {error ? (
              <div className="empty-state error-box" role="alert">
                <Icon name="search" size={30} />
                <h3>{t.error}</h3>
                <button className="text-button" onClick={() => search(query)}>
                  {t.retry}
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            ) : loading ? (
              <div
                className="loading-grid"
                role="status"
                aria-label={t.searching}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div className="skeleton" key={i}>
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : visible.length > 0 ? (
              <div className="title-grid">
                {visible.map((item) => (
                  <TitleCard
                    key={titleKey(item)}
                    item={item}
                    t={t}
                    saved={saved.some((x) => titleKey(x) === titleKey(item))}
                    onSave={toggleSaved}
                    onOpen={setSelected}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icon
                  name={view === "saved" ? "bookmark" : "search"}
                  size={36}
                />
                <h3>
                  {items.length
                    ? t.emptyFilter
                    : view === "saved"
                      ? t.listEmpty
                      : t.noResults}
                </h3>
                <p>
                  {items.length
                    ? ""
                    : view === "saved"
                      ? t.listEmptyText
                      : t.tryAgain}
                </p>
                {view === "saved" && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setView("discover");
                      setFilter("all");
                    }}
                  >
                    {t.discover}
                    <Icon name="arrow" size={16} />
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <a
            href="https://github.com/cauamor-dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.footer}
            <Icon name="external" size={12} />
          </a>
          <span>2026</span>
        </div>
        <p>
          <a
            className="tmdb-credit"
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="The Movie Database"
          >
            TMDB
          </a>
          {t.disclaimer}
        </p>
      </footer>
      {selected && (
        <TitleDialog
          key={titleKey(selected)}
          item={selected}
          lang={lang}
          t={t}
          onClose={() => setSelected(null)}
          saved={saved.some((x) => titleKey(x) === titleKey(selected))}
          onSave={toggleSaved}
        />
      )}
    </div>
  );
}
