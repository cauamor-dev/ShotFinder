import React, { useState, useRef } from 'react';
import './App.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const texts = {
  pt: {
    title: 'ShotFinder',
    label: 'Descreva a cena ou digite o nome do filme/série:',
    placeholder: 'Ex: Um homem com capa preta luta contra vilões em uma cidade escura.',
    buscar: 'Buscar filme/série',
    buscando: 'Buscando...',
    elenco: 'Elenco',
    sinopse: 'Sinopse',
    ondeAssistir: 'Onde assistir',
    nenhumResultado: 'Nenhum resultado encontrado.',
    dicas: 'Dicas para melhorar sua busca:',
    dicasList: [
      'Use nomes de personagens, frases marcantes ou o nome do filme/série.',
      'Experimente uma descrição mais detalhada da cena.',
      'Evite termos muito genéricos ou curtos.'
    ],
    erroConexao: 'Erro de conexão com o servidor.',
    erroInesperado: 'Erro inesperado ao buscar resultados.'
  },
  en: {
    title: 'ShotFinder',
    label: 'Describe the scene or type the name of the movie/series:',
    placeholder: 'Ex: A man in a black cape fights villains in a dark city.',
    buscar: 'Search movie/series',
    buscando: 'Searching...',
    elenco: 'Cast',
    sinopse: 'Overview',
    ondeAssistir: 'Where to watch',
    nenhumResultado: 'No results found.',
    dicas: 'Tips to improve your search:',
    dicasList: [
      'Use character names, famous quotes or the movie/series name.',
      'Try a more detailed description of the scene.',
      'Avoid very generic or short terms.'
    ],
    erroConexao: 'Connection error with the server.',
    erroInesperado: 'Unexpected error while searching.'
  }
};

function App() {
  const [sceneText, setSceneText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('pt');
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('shotfinder_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef();
  const [theme, setTheme] = useState(() => localStorage.getItem('shotfinder_theme') || 'dark');

  const t = texts[lang];

  React.useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('shotfinder_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const saveHistory = (text, lang) => {
    if (!text.trim()) return;
    const newEntry = { text, lang };
    let newHistory = [newEntry, ...history.filter(h => h.text !== text || h.lang !== lang)];
    if (newHistory.length > 7) newHistory = newHistory.slice(0, 7);
    setHistory(newHistory);
    localStorage.setItem('shotfinder_history', JSON.stringify(newHistory));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    saveHistory(sceneText, lang);
    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sceneText, lang })
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setResults(data);
      } else if (data && data.error) {
        setError(data.error);
      } else {
        setError(t.erroInesperado);
      }
    } catch (err) {
      setError(t.erroConexao);
    }
    setLoading(false);
  };

  const handleHistoryClick = (entry) => {
    setSceneText(entry.text);
    setLang(entry.lang);
    setResults(null);
    setError('');
  };

  // Buscar sugestões na TMDb
  const fetchSuggestions = async (query, lang) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const url = `${API_BASE_URL}/suggestions?text=${encodeURIComponent(query)}&lang=${lang}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setSuggestions(data);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    setSceneText(e.target.value);
    setShowSuggestions(true);
    fetchSuggestions(e.target.value, lang);
  };

  const handleSuggestionClick = (s) => {
    setSceneText(s.title || s.name);
    setShowSuggestions(false);
    inputRef.current.blur();
  };

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="logo-shotfinder">
          <span role="img" aria-label="clapper">🎬</span> ShotFinder
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 22,
              marginRight: 2,
              color: 'var(--primary)',
              padding: 0,
              lineHeight: 1
            }}
            title={theme === 'dark' ? (lang === 'pt' ? 'Tema claro' : 'Light theme') : (lang === 'pt' ? 'Tema escuro' : 'Dark theme')}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ borderRadius: 6, padding: '4px 8px', fontWeight: 600 }}>
            <option value="pt">PT</option>
            <option value="en">EN</option>
          </select>
        </div>
      </div>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={{ marginBottom: 18, position: 'relative' }}>
          <label>{t.label}</label><br />
          <textarea
            ref={inputRef}
            rows={4}
            value={sceneText}
            onChange={handleInputChange}
            placeholder={t.placeholder}
            onFocus={() => sceneText.length > 1 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              zIndex: 10,
              boxShadow: '0 2px 12px 0 rgba(30,41,59,0.18)',
              marginTop: 2,
              maxHeight: 220,
              overflowY: 'auto',
            }}>
              {suggestions.map((s, i) => (
                <div
                  key={s.id + (s.title || s.name)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    color: '#f1f5f9',
                    borderBottom: i !== suggestions.length - 1 ? '1px solid #334155' : 'none',
                    fontWeight: 500,
                  }}
                  onMouseDown={() => handleSuggestionClick(s)}
                >
                  {s.title || s.name} {s.release_date || s.first_air_date ? <span style={{ color: '#38bdf8', fontWeight: 400, fontSize: '0.97em' }}>({(s.release_date || s.first_air_date || '').slice(0, 4)})</span> : ''}
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={!sceneText || loading} style={{ width: '100%' }}>
          {loading ? t.buscando : t.buscar}
        </button>
      </form>
      {history.length > 0 && (
        <div style={{ margin: '18px 0 0 0' }}>
          <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: 6, fontSize: '1rem' }}>
            {lang === 'pt' ? 'Histórico de buscas:' : 'Search history:'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {history.map((h, i) => (
              <button
                key={h.text + h.lang + i}
                style={{
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.97rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: h.text === sceneText && h.lang === lang ? 0.7 : 1
                }}
                onClick={() => handleHistoryClick(h)}
                disabled={h.text === sceneText && h.lang === lang}
                title={h.text}
              >
                {h.text.length > 32 ? h.text.slice(0, 32) + '...' : h.text} {h.lang === 'en' ? '🇺🇸' : '🇧🇷'}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <div style={{ color: '#f87171', background: '#1e293b', borderRadius: 8, padding: 12, marginTop: 24, textAlign: 'center', fontWeight: 500 }}>
          {error}
        </div>
      )}
      {loading && (
        <div className="spinner">
          <div className="spinner-circle"></div>
        </div>
      )}
      {results && (
        <div className="resultados">
          <h2 style={{ textAlign: 'center', color: '#f1f5f9', fontSize: '1.3rem', marginBottom: 18 }}>{t.title} {t.ondeAssistir}</h2>
          {results.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <p>{t.nenhumResultado}</p>
              <div style={{
                background: '#334155',
                color: '#38bdf8',
                borderRadius: 8,
                padding: 14,
                margin: '18px auto 0 auto',
                maxWidth: 340,
                fontSize: '0.98rem',
                lineHeight: 1.5
              }}>
                <strong>{t.dicas}</strong>
                <ul style={{ textAlign: 'left', margin: '10px 0 0 18px', padding: 0 }}>
                  {t.dicasList.map((dica, i) => <li key={i}>{dica}</li>)}
                </ul>
              </div>
            </div>
          )}
          {results.map((item) => (
            <div key={`${item.media_type}:${item.id}`} className="result-card">
              <img src={item.poster} alt={item.title} />
              <div className="result-info">
                <h3>{item.title} {item.year && <span style={{ color: '#64748b', fontWeight: 400 }}>({item.year})</span>}</h3>
                <p><strong>{t.sinopse}:</strong> {item.overview}</p>
                <p><strong>{t.elenco}:</strong> {item.cast}</p>
                <p><strong>{t.ondeAssistir}:</strong> {item.streaming && item.streaming.length > 0 ? (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {item.streaming.map((s, idx) => (
                      <a
                        key={s.name + idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#38bdf8',
                          color: '#fff',
                          borderRadius: 6,
                          padding: '6px 12px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '0.97rem',
                          marginRight: 4,
                          marginBottom: 4,
                          display: 'inline-block',
                          transition: 'background 0.2s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#0ea5e9'}
                        onMouseOut={e => e.currentTarget.style.background = '#38bdf8'}
                      >
                        {s.name}
                      </a>
                    ))}
                  </span>
                ) : 'Não encontrado'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App; 
