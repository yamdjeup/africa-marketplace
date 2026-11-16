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

// Manifeste et icÃ´nes d'installation : le navigateur les rÃ©cupÃ¨re sans cookie, ils doivent rester publics (aucune Å“uvre).
const PUBLIC_PWA = /^\/(manifest\.webmanifest|icons\/[\w-]+\.png|sw\.js|debug-viewport)$/;

// Liens des e-mails d'alertes (dÃ©sinscription), cron et webhook Stripe et photos /api/media/[id] (images des e-mails) : publics, protÃ©gÃ©s par jeton signÃ© / CRON_SECRET / signature Stripe ; les mÃ©dias privÃ©s se protÃ¨gent eux-mÃªmes.
const PUBLIC_ALERTS = /^\/(api\/(v1\/(home|creators\/[\w-]+|favorites|alerts\/(prefs|test)|addresses|orders(\/(cancel|return))?|checkout\/(create|confirm|cancel)|products(\/[\w-]+)?|search\/(suggest|extras)|support(\/[\w-]+)?|catalog\/count|auth\/(login|register|refresh|forgot|me|google))|alerts\/(run|unsubscribe)|tila|address\/(check|suggest)|push\/test|stripe\/webhook|media\/[\w-]+)|tila-avatar\.jpeg|videos\/(posters\/)?[\w.-]+\.(mp4|jpg)|images\/(artworks|examples)\/[\w.-]+\.(jpg|jpeg|png|webp)|mediapipe\/(wasm|models)\/[\w.-]+|(fr|en)\/produits\/[\w-]+\/essayage|(fr|en)\/alertes\/desinscription)$/;

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

// Retourne une rÃ©ponse si l'accÃ¨s est refusÃ© ; null si le visiteur peut passer.
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

// Toute URL sans prÃ©fixe de langue valide est redirigÃ©e vers /fr (langue par dÃ©faut).
export async function proxy(request: NextRequest) {
  const denied = await guard(request);
  if (denied) return denied;
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  const isAsset = first === "api" || first === "debug-viewport" || first === "images" || pathname === ACCESS_PATH || /\.[a-z0-9]+$/i.test(pathname);
  if (isAsset || locales.includes(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/fr${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // /_next, favicon et robots.txt restent publics ; images et API passent par le mur.
  matcher: ["/((?!_next/|favicon.ico|robots.txt).*)"],
};
