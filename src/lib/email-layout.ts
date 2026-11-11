import { siteUrl } from "@/lib/alerts-core";

export type EmailLayoutInput = {
  locale: "fr" | "en";
  title: string;
  orderNumber?: string;
  accountUrl?: string;
  /** Paragraphes ; **gras** supporté (le reste est échappé). */
  paragraphs: string[];
  cta?: { label: string; url: string };
  trackLink?: { label: string; url: string };
  deliveryLine?: { label: string; value: string };
  summary?: {
    items: { name: string; detail?: string; priceLabel: string; image?: string | null; url?: string }[];
    rows: { label: string; value: string; bold?: boolean }[];
  };
  address?: { title: string; lines: string[] };
  notice?: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

/** URL absolue (https) d'une image d'œuvre ; chaîne vide si absente. */
export function absoluteImageUrl(src: unknown): string {
  const first = Array.isArray(src) ? src[0] : src;
  if (typeof first !== "string" || !first) return "";
  return /^https?:\/\//.test(first) ? first : `${siteUrl()}${first.startsWith("/") ? "" : "/"}${first}`;
}

const FONT = "Helvetica,Arial,sans-serif";
const GREY = "#767676";
const LINE = "#e5e5e5";

export function renderEmailHtml(o: EmailLayoutInput): string {
  const fr = o.locale === "fr";
  const base = siteUrl();
  const loc = o.locale;
  const t = fr
    ? { view: "Voir mon compte", help: "Besoin d'aide ?", mail: "E-mail", phone: "Téléphone", faq: "FAQ", prefs: "Préférences e-mail", account: "Mon compte", contact: "Contact", legal: "E póm ta’ — place de marché de créateurs africains." }
    : { view: "View my account", help: "Need help?", mail: "Email", phone: "Phone", faq: "FAQ", prefs: "Email preferences", account: "My account", contact: "Contact", legal: "E póm ta’ — marketplace of African makers." };
  const center = `text-align:center;font-family:${FONT};color:#000`;
  const sep = `border-top:1px solid ${LINE}`;

  const head = `<tr><td style="${center};padding:32px 24px 8px;font-size:30px;letter-spacing:4px;font-weight:700;font-family:Georgia,serif">E PÓM TA’</td></tr>
<tr><td style="${center};padding:24px 24px 4px;font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${esc(o.title)}</td></tr>`;
  const num = o.orderNumber
    ? `<tr><td style="${center};padding:0 24px 16px;font-size:13px;color:${GREY}">${esc(fr ? "Commande n°" : "Order no.")} ${esc(o.orderNumber)}${
        o.accountUrl ? ` · <a href="${esc(o.accountUrl)}" style="color:#000;text-decoration:underline">${esc(t.view)}</a>` : ""
      }</td></tr>`
    : "";
  const paras = o.paragraphs.map((p) => `<tr><td style="${center};padding:8px 32px;font-size:14px;line-height:21px">${rich(p)}</td></tr>`).join("");
  const cta = o.cta
    ? `<tr><td align="center" style="padding:20px 24px"><a href="${esc(o.cta.url)}" style="display:inline-block;background:#000;color:#fff;font-family:${FONT};font-size:13px;font-weight:700;text-decoration:none;padding:14px 36px;text-transform:uppercase;letter-spacing:1px">${esc(o.cta.label)}</a></td></tr>`
    : "";
  const track = o.trackLink
    ? `<tr><td style="${center};padding:0 24px 16px;font-size:14px"><a href="${esc(o.trackLink.url)}" style="color:#000;text-decoration:underline;font-weight:700">${esc(o.trackLink.label)}</a></td></tr>`
    : "";
  const del = o.deliveryLine
    ? `<tr><td style="${center};padding:4px 24px 16px;font-size:14px">${esc(o.deliveryLine.label)} <strong>${esc(o.deliveryLine.value)}</strong></td></tr>`
    : "";
  const sum = o.summary
    ? `<tr><td style="padding:16px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT};font-size:14px;color:#000">
<tr><td colspan="2" style="${sep};padding:16px 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px">${esc(fr ? "Récapitulatif" : "Order summary")}</td></tr>
${o.summary.items
  .map(
    (i) =>
      `<tr><td style="${sep};padding:12px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${i.image ? `<td style="padding-right:12px;width:72px"><img src="${esc(i.image)}" alt="${esc(i.name)}" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:cover;border:0"></td>` : ""}<td style="font-family:${FONT};font-size:14px;color:#000"><strong>${i.url ? `<a href="${esc(i.url)}" style="color:#000;text-decoration:underline">${esc(i.name)}</a>` : esc(i.name)}</strong>${i.detail ? `<br><span style="color:${GREY};font-size:13px">${esc(i.detail)}</span>` : ""}</td></tr></table></td><td align="right" style="${sep};padding:12px 0;white-space:nowrap">${esc(i.priceLabel)}</td></tr>`,
  )
  .join("")}
${o.summary.rows
  .map((r, k) => `<tr><td style="${k === 0 ? sep : ""};padding:6px 0;${r.bold ? "font-weight:700" : `color:${GREY}`}">${esc(r.label)}</td><td align="right" style="${k === 0 ? sep : ""};padding:6px 0;${r.bold ? "font-weight:700" : ""}">${esc(r.value)}</td></tr>`)
  .join("")}
</table></td></tr>`
    : "";
  const addr = o.address
    ? `<tr><td style="padding:16px 32px 0;font-family:${FONT};font-size:14px;color:#000"><div style="${sep};padding-top:16px"><strong style="text-transform:uppercase;letter-spacing:1px;font-size:13px">${esc(o.address.title)}</strong><br>${o.address.lines.map(esc).join("<br>")}</div></td></tr>`
    : "";
  const notice = o.notice ? `<tr><td style="padding:20px 32px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${GREY}">${rich(o.notice)}</td></tr>` : "";
  const col = (glyph: string, label: string, href: string) =>
    `<td align="center" width="33%" style="font-family:${FONT};font-size:12px"><a href="${esc(href)}" style="color:#000;text-decoration:none"><span style="display:inline-block;width:40px;height:40px;line-height:40px;border:1px solid #000;border-radius:20px;font-size:16px">${glyph}</span><br>${esc(label)}</a></td>`;
  const helpUrl = `${base}/${loc}/support/contact`;
  const help = `<tr><td style="padding:28px 24px 0"><div style="${sep};padding-top:24px;${center};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px">${esc(t.help)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px"><tr>${col("&#9993;", t.mail, helpUrl)}${col("&#9742;", t.phone, helpUrl)}${col("?", t.faq, `${base}/${loc}/support`)}</tr></table></td></tr>`;
  const foot = `<tr><td style="${center};padding:28px 24px 8px;font-size:12px"><a href="${esc(`${base}/${loc}/account`)}" style="color:#000;text-decoration:underline">${esc(t.prefs)}</a> · <a href="${esc(`${base}/${loc}/account`)}" style="color:#000;text-decoration:underline">${esc(t.account)}</a> · <a href="${esc(helpUrl)}" style="color:#000;text-decoration:underline">${esc(t.contact)}</a></td></tr>
<tr><td style="${center};padding:8px 32px 32px;font-size:11px;line-height:16px;color:${GREY}">${esc(t.legal)}</td></tr>`;

  return `<!DOCTYPE html><html lang="${loc}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff">${head}${num}${paras}${cta}${track}${del}${sum}${addr}${notice}${help}${foot}</table>
</td></tr></table></body></html>`;
}
