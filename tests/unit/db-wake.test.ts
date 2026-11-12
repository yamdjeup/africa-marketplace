import { describe, expect, it, vi } from "vitest";
import { createServer } from "node:net";
import { isUnreachable, retry, tcpProbe, withConnectTimeout } from "../../scripts/db-wake";

describe("réveil de la base de test", () => {
  it("ajoute connect_timeout seulement s'il est absent", () => {
    expect(withConnectTimeout("postgresql://u:p@h/db_test?sslmode=require")).toBe("postgresql://u:p@h/db_test?sslmode=require&connect_timeout=30");
    expect(withConnectTimeout("postgresql://u:p@h/db_test")).toBe("postgresql://u:p@h/db_test?connect_timeout=30");
    expect(withConnectTimeout("postgresql://u:p@h/db_test?connect_timeout=5")).toContain("connect_timeout=5");
  });
  it("détecte P1001", () => {
    expect(isUnreachable("Error: P1001: Can't reach database server at x")).toBe(true);
    expect(isUnreachable("syntax error")).toBe(false);
  });
  it("réessaie sur P1001 puis réussit", async () => {
    let n = 0;
    const sleep = vi.fn(async () => undefined);
    const r = await retry(async () => { if (++n < 3) throw new Error("P1001 Can't reach database server"); return "ok"; }, { sleep });
    expect(r).toBe("ok");
    expect(n).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
  it("abandonne après les délais, et immédiatement sur une autre erreur", async () => {
    const sleep = vi.fn(async () => undefined);
    let n = 0;
    await expect(retry(async () => { n++; throw new Error("P1001"); }, { delaysMs: [1, 1], sleep })).rejects.toThrow("P1001");
    expect(n).toBe(3);
    let m = 0;
    await expect(retry(async () => { m++; throw new Error("autre"); }, { sleep })).rejects.toThrow("autre");
    expect(m).toBe(1);
  });

  it("tcpProbe : réussit sur un port ouvert, échoue (retryable) sur un port fermé, sans client Prisma", async () => {
    const srv = createServer((s) => s.end());
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    const port = (srv.address() as { port: number }).port;
    await expect(tcpProbe(`postgresql://u:p@127.0.0.1:${port}/db_test`)).resolves.toBeUndefined();
    await new Promise((r) => srv.close(r));
    const err = (await tcpProbe(`postgresql://u:p@127.0.0.1:${port}/db_test`).catch((e) => e as Error)) as Error;
    expect(isUnreachable(err.message)).toBe(true);
  });
});
