/** TMDb IDs are unique within a media type, not across movies and TV shows. */
export function selectTitles(items, limit = 5) {
  const seen = new Set();
  const selected = [];
  for (const item of items) {
    if (!item || !Number.isInteger(item.id) || item.id <= 0) continue;
    const mediaType = item.media_type || (item.title ? 'movie' : item.name ? 'tv' : null);
    if (mediaType !== 'movie' && mediaType !== 'tv') continue;
    const key = `${mediaType}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push({ ...item, media_type: mediaType });
    if (selected.length >= limit) break;
  }
  return selected;
}
