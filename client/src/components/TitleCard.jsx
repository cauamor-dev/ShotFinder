import { useState } from "react";
import Icon from "./Icon.jsx";
export default function TitleCard({ item, saved, onSave, onOpen, t }) {
  const [failed, setFailed] = useState(false);
  return (
    <article className="title-card">
      <div className="poster-wrap">
        <button
          className="poster-button"
          onClick={() => onOpen(item)}
          aria-label={`${t.details}: ${item.title}`}
        >
          {item.poster && !failed ? (
            <img
              src={item.poster}
              alt=""
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="poster-empty">
              <Icon name="film" size={40} />
              <span>{item.title}</span>
            </div>
          )}
          <span className="poster-cta">
            {t.details}
            <Icon name="arrow" size={18} />
          </span>
        </button>
        <button
          className={`save-button ${saved ? "is-saved" : ""}`}
          onClick={() => onSave(item)}
          aria-label={`${saved ? t.remove : t.save}: ${item.title}`}
          aria-pressed={saved}
        >
          <Icon name="bookmark" />
        </button>
        {item.rating > 0 && item.votes > 0 && (
          <span className="rating">
            <Icon name="star" size={13} />
            {item.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="title-meta">
        <span>{item.media_type === "tv" ? t.series : t.movies}</span>
        <span>{item.year || "—"}</span>
      </div>
      <h3>
        <button onClick={() => onOpen(item)}>{item.title}</button>
      </h3>
    </article>
  );
}
