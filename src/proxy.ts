import { NextResponse, type NextRequest } from "next/server";

const locales = ["fr", "en"];

// Toute URL sans préfixe de langue valide est redirigée vers /fr (langue par défaut).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (locales.includes(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/fr${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|images|favicon.ico|.*\\..*).*)"],
};
