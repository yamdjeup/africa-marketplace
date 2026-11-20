import { CARRIERS } from "./carriers-data";

export const OTHER_CARRIER = "Autre";
const POPULAR = ["DHL", "UPS", "Colissimo", "La Poste", "FedEx", "Chronopost"];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export type CarrierOption = { id: string; label: string };

// Popular carriers first, then the rest alphabetically, "Autre" last.
export function buildCarrierOptions(list: [string, string][] = CARRIERS): CarrierOption[] {
  const popular: CarrierOption[] = [];
  for (const p of POPULAR) {
    const hit = list.find(([, n]) => norm(n) === norm(p)) ?? list.find(([, n]) => norm(n).startsWith(norm(p)));
    popular.push({ id: hit ? hit[1] : p, label: hit ? hit[1] : p });
  }
  const ids = new Set(popular.map((o) => norm(o.id)));
  const rest = list.filter(([, n]) => !ids.has(norm(n))).map(([, n]) => ({ id: n, label: n }));
  return [...popular, ...rest, { id: OTHER_CARRIER, label: OTHER_CARRIER }];
}

export function filterCarriers(options: CarrierOption[], query: string, limit = 50): CarrierOption[] {
  const q = norm(query);
  if (!q) return options.slice(0, limit);
  const starts = options.filter((o) => norm(o.label).startsWith(q));
  const contains = options.filter((o) => !norm(o.label).startsWith(q) && norm(o.label).includes(q));
  const res = [...starts, ...contains].slice(0, limit);
  return res.some((o) => o.id === OTHER_CARRIER) ? res : [...res, { id: OTHER_CARRIER, label: OTHER_CARRIER }];
}
