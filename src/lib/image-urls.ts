// Sépare les URL d'images soumises : /api/media/<id> (à vérifier en base) et images déjà attachées à l'œuvre (conservées telles quelles, quelle que soit leur forme).
export function splitImageUrls(raw: string, max: number, keep: string[] = []) {
  let list: unknown = [];
  try {
    list = JSON.parse(raw);
  } catch {}
  const urls = (Array.isArray(list) ? list : []).map(String).slice(0, max);
  const kept = urls.filter((u) => keep.includes(u));
  const media = urls.filter((u) => !keep.includes(u) && /^\/api\/media\/[\w-]+$/.test(u));
  return { urls: urls.filter((u) => kept.includes(u) || media.includes(u)), media, kept };
}
