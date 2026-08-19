import { getD1 } from "@/db";
import { sessionFromRequest } from "@/app/itapoa/session";
import { buildState } from "@/app/itapoa/store";

export async function GET(request: Request) {
  try {
    const session = sessionFromRequest(request); const state = await buildState(getD1(), session.sessionId);
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    if (session.setCookie) headers.set("Set-Cookie", session.setCookie);
    return new Response(JSON.stringify(state), { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha ao carregar o estado." }, { status: 500 }); }
}
