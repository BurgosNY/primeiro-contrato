const COOKIE = "pc_profile_session";

export function sessionFromRequest(request: Request) {
  const found = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`));
  if (found) return { sessionId: decodeURIComponent(found.slice(COOKIE.length + 1)), setCookie: null as string | null };
  const sessionId = crypto.randomUUID();
  return { sessionId, setCookie: `${COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` };
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Origem inválida.");
}
