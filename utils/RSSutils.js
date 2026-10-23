export function cleanText(item) {
  return `${item.title || ""} ${item.contentSnippet || ""}`.trim();
}

export function isFresh(item, maxMinutes = 30) {
  const now = Date.now();
  const published = new Date(item.isoDate).getTime();
  const diffMinutes = (now - published) / 1000 / 60;
  return diffMinutes <= maxMinutes;
}