export function streamlitURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.streamlit.app') || url.username || url.password || url.port) {
    throw new Error('Use a public HTTPS dashboard URL ending in .streamlit.app.');
  }
  return url.href;
}
export function imageURL(value) {
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
}
export function validCard(input) {
  const title = input.title.trim();
  const records = Number(input.records);
  const date = input.dataset_published.trim();
  if (!title || title.length > 120) throw new Error('Enter a title of up to 120 characters.');
  if (String(input.records).trim() === '' || !Number.isInteger(records) || records < 0 || records > 2147483647) throw new Error('Enter a valid whole-number record count.');
  if (!date || date.length > 40) throw new Error('Enter the original dataset publication date or “Not reported”.');
  return { title, records, dataset_published: date, url: streamlitURL(input.url), description: (input.description || '').trim().slice(0, 240) };
}
export function filterCards(cards, query, sort) {
  const q = query.trim().toLowerCase();
  return cards.filter(c => `${c.title} ${c.description || ''}`.toLowerCase().includes(q)).sort((a,b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'records') return b.records - a.records;
    const diff = Date.parse(b.created_at) - Date.parse(a.created_at);
    return sort === 'oldest' ? -diff : diff;
  });
}
