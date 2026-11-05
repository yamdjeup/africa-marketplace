import { DESKTOP_VIEWPORT_SCRIPT } from "@/lib/viewport-script";

export const dynamic = "force-dynamic";

// Page de diagnostic (sans données) : affiche ce que voit le navigateur pour calibrer la détection du viewport.
const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Diagnostic viewport</title>
<script>${DESKTOP_VIEWPORT_SCRIPT}</script>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:12px;background:#fff;color:#111}h1{font-size:1.4em}dt{font-weight:700;margin-top:.6em}dd{margin:0;word-break:break-all;font-size:1.2em;font-family:ui-monospace,monospace}</style></head>
<body><h1>Diagnostic viewport</h1><dl id="o"></dl>
<script>
function show(){
var m=document.querySelector('meta[name="viewport"]');
var v=window.visualViewport;
var rows=[["userAgent",navigator.userAgent],["platform",navigator.platform],["maxTouchPoints",navigator.maxTouchPoints],["ontouchstart in window","ontouchstart" in window],["screen.width x height",screen.width+" x "+screen.height],["innerWidth / outerWidth",window.innerWidth+" / "+window.outerWidth],["devicePixelRatio",window.devicePixelRatio],["meta viewport",m?m.getAttribute("content"):"(aucune)"],["visualViewport.width",v?v.width:"n/a"],["desktop force (script)",/Macintosh/.test(navigator.userAgent)&&Math.min(screen.width,screen.height)<600]];
document.getElementById("o").innerHTML=rows.map(function(r){var d=document.createElement("div");d.textContent=r[1];return "<dt>"+r[0]+"</dt><dd>"+d.innerHTML+"</dd>";}).join("");
}
show();window.addEventListener("load",show);window.addEventListener("resize",show);
</script></body></html>`;

export function GET() {
  return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}
