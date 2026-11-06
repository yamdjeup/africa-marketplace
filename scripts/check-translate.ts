import http from "node:http";
import { translateTexts, translationConfigured } from "../src/lib/translate";

let fails = 0;
const ok = (c: boolean, m: string) => {
  console.log(`${c ? "OK  " : "FAIL"} ${m}`);
  if (!c) fails++;
};

async function main() {
  delete process.env.TRANSLATE_PROVIDER;
  ok(!translationConfigured() && (await translateTexts(["Bonjour"], "fr", "en")) === null, "sans clé : null (repli « traduction à venir »)");

  const srv = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      if (req.url?.startsWith("/fail")) return void res.writeHead(500).end();
      const { text } = JSON.parse(b) as { text: string[] };
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ translations: text.map((t) => ({ text: `[EN] ${t}` })) }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, r));
  const port = (srv.address() as { port: number }).port;
  process.env.TRANSLATE_PROVIDER = "deepl";
  process.env.DEEPL_API_KEY = "test";
  process.env.DEEPL_API_URL = `http://127.0.0.1:${port}`;
  const out = await translateTexts(["Masque", "Beau masque"], "fr", "en");
  ok(out?.[0] === "[EN] Masque" && out?.[1] === "[EN] Beau masque", "provider DeepL (mock) : traduit titre + description");
  process.env.DEEPL_API_URL = `http://127.0.0.1:${port}/fail`;
  process.env.DEEPL_API_URL = `http://127.0.0.1:${port}`;
  srv.close();
  ok((await translateTexts(["x"], "fr", "en")) === null, "provider injoignable : null, sans exception");
  process.exit(fails ? 1 : 0);
}
main();
