import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_S,
  ACCESS_PATH,
  accessPageHtml,
  accessPassword,
  checkPassword,
  createToken,
  safeNext,
  verifyToken,
} from "@/lib/site-access";

const locales = ["fr", "en"];

// Manifeste et icônes d'installation : le navigateur les récupère sans cookie, ils doivent rester publics (aucune œuvre).
const PUBLIC_PWA = /^\/(manifest\.webmanifest|icons\/[\w-]+\.png|sw\.js)$/;

// Liens des e-mails d'alertes (désinscription) et cron : publics, protégés par jeton signé / CRON_SECRET.
const PUBLIC_ALERTS = /^\/(api\/(alerts\/(run|unsubscribe)|push\/test)|(fr|en)\/alertes\/desinscription)$/;

const htmlHeaders = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

function pickLocale(request: NextRequest, next: string): "fr" | "en" {
  const asked = request.nextUrl.searchParams.get("lang");
  if (asked === "fr" || asked === "en") return asked;
  const fromPath = next.split("/")[1];
  if (fromPath === "fr" || fromPath === "en") return fromPath;
  return request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "fr";
}

async function handleAccess(request: NextRequest) {
  let next = safeNext(request.nextUrl.searchParams.get("next"));
  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    next = safeNext(String(form?.get("next") ?? ""));
    const candidate = String(form?.get("password") ?? "");
    if (await checkPassword(candidate)) {
      const response = NextResponse.redirect(new URL(next, request.url), 303);
      const secure = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
      response.cookies.set(ACCESS_COOKIE, await createToken(), {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: ACCESS_MAX_AGE_S,
      });
      response.headers.set("cache-control", "no-store");
      return response;
    }
    return new NextResponse(accessPageHtml(pickLocale(request, next), next, true), { status: 401, headers: htmlHeaders });
  }
  return new NextResponse(accessPageHtml(pickLocale(request, next), next, false), { headers: htmlHeaders });
}

// Retourne une réponse si l'accès est refusé ; null si le visiteur peut passer.
async function guard(request: NextRequest): Promise<NextResponse | null> {
  if (!accessPassword()) return null;
  const { pathname, search } = request.nextUrl;
  if (pathname === ACCESS_PATH) return handleAccess(request);
  if (PUBLIC_PWA.test(pathname) || PUBLIC_ALERTS.test(pathname)) return null;
  if (await verifyToken(request.cookies.get(ACCESS_COOKIE)?.value)) return null;
  const wantsPage = request.method === "GET" && !pathname.startsWith("/api/") && !/\.[a-z0-9]+$/i.test(pathname);
  if (!wantsPage) return new NextResponse("Unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
  const url = request.nextUrl.clone();
  url.pathname = ACCESS_PATH;
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

// Toute URL sans préfixe de langue valide est redirigée vers /fr (langue par défaut).
export async function proxy(request: NextRequest) {
  const denied = await guard(request);
  if (denied) return denied;
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  const isAsset = first === "api" || first === "images" || pathname === ACCESS_PATH || /\.[a-z0-9]+$/i.test(pathname);
  if (isAsset || locales.includes(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/fr${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // /_next, favicon et robots.txt restent publics ; images et API passent par le mur.
  matcher: ["/((?!_next/|favicon.ico|robots.txt).*)"],
};
