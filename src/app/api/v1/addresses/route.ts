import { NextResponse } from "next/server";
import { listAddresses, removeAddress, saveAddress, setDefault } from "@/lib/mobile-account";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  const u = await userFromRequest(req);
  return u ? NextResponse.json({ items: await listAddresses(u.id) }) : unauthorized();
}

// Création, ou mise à jour si « id » est fourni.
export async function POST(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const r = await saveAddress(u.id, (await req.json().catch(() => ({}))) as Record<string, unknown>);
  return "error" in r ? NextResponse.json(r, { status: r.error === "not_found" ? 404 : 400 }) : NextResponse.json({ ...r, items: await listAddresses(u.id) }, { status: 201 });
}

// Adresse par défaut : { id }.
export async function PATCH(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof b.id !== "string" || !(await setDefault(u.id, b.id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ items: await listAddresses(u.id) });
}

export async function DELETE(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!(await removeAddress(u.id, id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ items: await listAddresses(u.id) });
}
