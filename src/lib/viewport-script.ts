// iPhone en « site pour ordinateur » : Safari envoie un UA Macintosh mais l'écran reste < 600 px (un vrai Mac ou un iPad ne l'est jamais).
// On force alors un viewport de 980 px, comme Chrome Android. Appliqué tôt puis ré-appliqué (iOS peut réécrire la meta).
export const DESKTOP_VIEWPORT_SCRIPT = `(function(){try{
var ua=navigator.userAgent||"";
var side=Math.min(screen.width,screen.height);
if(!(/Macintosh/.test(ua)&&side<600))return;
function apply(){
var c="width=980, initial-scale="+(side/980).toFixed(3)+", minimum-scale="+(side/980).toFixed(3);
var ms=document.querySelectorAll('meta[name="viewport"]');
if(!ms.length){var m=document.createElement("meta");m.name="viewport";(document.head||document.documentElement).appendChild(m);ms=[m];}
for(var i=0;i<ms.length;i++){if(ms[i].getAttribute("content")!==c)ms[i].setAttribute("content",c);}
}
apply();
try{new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["content"]});}catch(e){}
document.addEventListener("DOMContentLoaded",apply);
window.addEventListener("load",apply);
window.addEventListener("pageshow",apply);
window.addEventListener("resize",apply);
window.addEventListener("orientationchange",apply);
}catch(e){}})();`;
