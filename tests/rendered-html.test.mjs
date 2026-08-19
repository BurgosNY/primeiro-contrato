import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function renderedHtml(pathname) {
  const response = await render(pathname);
  assert.equal(response.status, 200, pathname);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, pathname);
  return response.text();
}

test("a raiz pública oferece exatamente os dois usuários pedidos", async () => {
  const html = await renderedHtml("/");

  assert.match(html, /<title>Primeiro Contrato — escolha seu usuário<\/title>/i);
  assert.match(html, /Quem está entrando\?/);
  assert.match(html, /Emprenteiro em Itapoá - SC/);
  assert.match(html, /Novo usuário/);
  assert.match(html, /href="\/itapoa"/);
  assert.match(html, /href="\/novo-usuario"/);
  assert.match(html, /og-user-choice\.png/);
  assert.doesNotMatch(html, /signin-with-chatgpt|codex-preview|Your site is taking shape/i);
});

test("o usuário de Itapoá abre a experiência existente sem regressão", async () => {
  const html = await renderedHtml("/itapoa");

  assert.match(html, /<title>Empreiteiro em Itapoá \| Primeiro Contrato<\/title>/i);
  assert.match(html, /Boas oportunidades encontraram você\./);
  assert.match(html, /Todas as oportunidades/);
  assert.match(html, /Instalação de calhas e rufos/);
  assert.match(html, /JM Reparos/);
  assert.doesNotMatch(html, /og-user-choice\.png|og\.png/);
});

test("novo usuário permanece numa rota separada e honesta", async () => {
  const html = await renderedHtml("/novo-usuario");

  assert.match(html, /<title>Novo usuário \| Primeiro Contrato<\/title>/i);
  assert.match(html, /A próxima experiência começa aqui\./);
  assert.match(html, /Experiência aguardando definição/);
  assert.match(html, /Nenhum perfil foi criado ainda\./);
  assert.doesNotMatch(html, /og-user-choice\.png|og\.png/);
});

test("o card social novo está empacotado sem substituir o original", async () => {
  await Promise.all([
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/og-user-choice.png", import.meta.url)),
  ]);

  const generated = await readFile(new URL("../public/og-user-choice.png", import.meta.url));
  assert.ok(generated.length > 500_000);
  assert.equal(generated.subarray(1, 4).toString("ascii"), "PNG");
});
