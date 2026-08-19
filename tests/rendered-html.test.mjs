import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function request(pathname = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, init),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function renderedHtml(pathname) {
  const response = await request(pathname, { headers: { accept: "text/html" } });
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

test("o usuário de Itapoá recebe ranking calculado a partir do perfil", async () => {
  const html = await renderedHtml("/itapoa");

  assert.match(html, /<title>Empreiteiro em Itapoá \| Primeiro Contrato<\/title>/i);
  assert.match(html, /2(?:<!-- -->)? oportunidades combinam com o perfil\./);
  assert.match(html, /Todas as oportunidades/);
  assert.match(html, /Instalação de Calhas e Rufos/);
  assert.match(html, /97% compatível/);
  assert.match(html, /90% · impedida/);
  assert.match(html, /JM Reparos Prediais/);
  assert.doesNotMatch(html, /og-user-choice\.png|og\.png/);
});

const profile = {
  schemaVersion: "1.0",
  id: "jm-reparos-itapoa",
  displayName: "JM Reparos Prediais",
  ownerName: "João Martins",
  demoProfile: true,
  legal: { type: "MEI", status: "active", evidence: "demo_fixture" },
  baseLocation: { city: "Itapoá", state: "SC", serviceRadiusKm: 40 },
  teamSize: 2,
  skills: [
    { id: "gutters_roofing", level: "specialist", evidence: "self_declared" },
    { id: "masonry", level: "experienced", evidence: "self_declared" },
    { id: "concrete_structures", level: "experienced", evidence: "self_declared" },
    { id: "basic_plumbing", level: "experienced", evidence: "self_declared" },
    { id: "drywall", level: "basic", evidence: "self_declared" },
  ],
  capabilities: ["technical_visit", "materials_supply", "local_transport", "site_cleanup", "waste_disposal"],
  exclusions: ["electrical", "metalwork", "signage", "outdoor_structures", "locksmith", "gate_automation", "sanitation_systems"],
  updatedAt: "2026-08-19T17:55:00.000-03:00",
};

test("a API entrega o snapshot auditável completo", async () => {
  const response = await request("/api/itapoa/opportunities");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.opportunities.length, 12);
  assert.equal(body.snapshot.coverage.detailsProcessed, 12);
  assert.equal(body.snapshot.binaryQa.downloaded, 30);
  assert.equal(response.headers.get("x-snapshot-captured-at"), body.snapshot.capturedAt);
});

test("a API recalcula matches quando as competências do perfil mudam", async () => {
  const calculate = async (candidate) => {
    const response = await request("/api/itapoa/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: candidate }),
    });
    assert.equal(response.status, 200);
    return response.json();
  };

  const baseline = await calculate(profile);
  assert.deepEqual(
    baseline.matches.filter((match) => match.band === "recommended").map((match) => match.opportunityId),
    ["12908", "12672"],
  );
  assert.equal(baseline.matches.filter((match) => match.blocked).length, 5);
  assert.equal(baseline.matches.find((match) => match.opportunityId === "12644").blocked, true);

  const reduced = await calculate({
    ...profile,
    skills: profile.skills.filter((skill) => !["gutters_roofing", "basic_plumbing"].includes(skill.id)),
  });
  assert.deepEqual(reduced.matches.filter((match) => match.band === "recommended"), []);
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
