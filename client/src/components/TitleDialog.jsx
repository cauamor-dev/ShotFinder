import { useEffect, useRef, useState } from "react";
import { request } from "../api.js";
import Icon from "./Icon.jsx";
export default function TitleDialog({ item, lang, t, saved, onSave, onClose }) {
  const dialog = useRef(null);
  const [data, setData] = useState(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement;
    el.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);
    request(`/titles/${item.media_type}/${item.id}?lang=${lang}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [item.id, item.media_type, lang, attempt]);
  const title = data || item;
  return (
    <dialog
      ref={dialog}
      className="title-dialog"
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) {
          const r = dialog.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="dialog-close icon-button"
        onClick={onClose}
        aria-label={t.close}
      >
        <Icon name="close" />
      </button>
      <div className="dialog-layout">
        <div className="dialog-poster">
          {title.poster ? (
            <img
              src={title.poster}
              alt=""
              onError={(e) => {
                e.currentTarget.hidden = true;
              }}
            />
          ) : (
            <Icon name="film" size={60} />
          )}
        </div>
        <div className="dialog-body">
          <div className="eyebrow">
            {title.media_type === "tv" ? t.series : t.movies} <span> / </span>
            {title.year}
          </div>
          <h2 id="dialog-title">{title.title}</h2>
          {title.original_title && title.original_title !== title.title && (
            <p className="original-title">{title.original_title}</p>
          )}
          <div className="detail-meta">
            {title.rating > 0 && title.votes > 0 && (
              <span>
                <Icon name="star" size={15} />
                {title.rating.toFixed(1)} / 10
              </span>
            )}
            {data?.runtime && (
              <span>
                <Icon name="clock" size={15} />
                {data.runtime} {t.runtime}
              </span>
            )}
          </div>
          {data?.genres.length > 0 && (
            <div className="genres">
              {data.genres.map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
          )}
          <button
            className={`list-button ${saved ? "saved" : ""}`}
            onClick={() => onSave(item)}
            aria-pressed={saved}
          >
            <Icon name="bookmark" size={17} />
            {saved ? t.remove : t.save}
          </button>
          <section>
            <h3>{t.overview}</h3>
            <p>{title.overview || t.noOverview}</p>
          </section>
          {!data && !error && (
            <p role="status" className="muted">
              {t.loadingDetails}
            </p>
          )}
          {error && (
            <div role="alert" className="error-box">
              <p>{t.error}</p>
              <button onClick={() => setAttempt((x) => x + 1)}>
                {t.retry}
              </button>
            </div>
          )}
          {data && (
            <>
              <section>
                <h3>{t.cast}</h3>
                <div className="cast-list">
                  {data.cast.length ? (
                    data.cast.map((c) => (
                      <div key={`${c.name}:${c.character}`}>
                        <strong>{c.name}</strong>
                        <span>{c.character}</span>
                      </div>
                    ))
                  ) : (
                    <p>{t.noCast}</p>
                  )}
                </div>
              </section>
              <section className="watch-section">
                <h3>
                  {t.watch}
                  <span className="country-badge">BR</span>
                </h3>
                {data.streaming_status !== "ok" ? (
                  <p role="status">
                    {t[data.streaming_status] || t.unavailable}
                  </p>
                ) : data.streaming.length ? (
                  <div className="providers">
                    {data.streaming.map((s) => (
                      <a
                        href={s.url}
                        key={`${s.name}:${s.type}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>
                          <strong>{s.name}</strong>
                          <small>{t[s.type]}</small>
                        </span>
                        <Icon name="external" size={16} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p>{t.noStreaming}</p>
                )}
                <p className="availability-note">{t.availability}</p>
              </section>
              <a
                className="catalogue-link"
                href={data.tmdb_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.catalogue}
                <Icon name="external" size={14} />
              </a>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
