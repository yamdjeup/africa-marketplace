import { API_URL } from "./config";

export async function authed<T>(token: string | null, method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: ctl.signal,
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
  } catch {
    return { ok: false, status: 0, data: {} as T };
  } finally {
    clearTimeout(timer);
  }
}
