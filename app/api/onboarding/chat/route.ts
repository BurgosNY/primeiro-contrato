import { NextResponse } from "next/server";

import type { OnboardingChatRequest } from "@/lib/onboarding-contract";
import { runOnboardingChat } from "@/lib/onboarding-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<OnboardingChatRequest>;
    if (typeof body.message !== "string" || !body.message.trim()) return NextResponse.json({ error: "Escreva uma mensagem para continuar." }, { status: 400 });
    if (!body.stage || !Array.isArray(body.history) || !body.context) return NextResponse.json({ error: "O contexto da conversa está incompleto. Recarregue e tente novamente." }, { status: 400 });

    const reply = await runOnboardingChat({ ...body as OnboardingChatRequest, message: body.message.trim(), history: body.history.slice(-10) });
    return NextResponse.json(reply, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada";
    console.error("[onboarding-chat]", message);
    return NextResponse.json({ error: "Não consegui consultar a IA agora. Sua conversa foi preservada; tente novamente em instantes." }, { status: 502 });
  }
}
