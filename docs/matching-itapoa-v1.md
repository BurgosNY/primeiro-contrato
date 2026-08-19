# Matching Itapoá v1

## Fontes de verdade

- Oportunidades: `data/itapoa-opportunities.public.json`, cópia byte a byte do snapshot auditável em `../../data/itapoa/normalized/opportunities.public.json`.
- Perfil: `app/itapoa/profile.ts`.
- Requisitos e pontuação: `app/itapoa/matching.ts`.
- APIs da demo: `GET /api/itapoa/opportunities` e `POST /api/itapoa/matches`.

## Perfil inicial

O perfil `JM Reparos Prediais` é uma persona de demonstração, não uma empresa verificada. Ele foi limitado ao conjunto coerente de serviços encontrado no snapshot:

- calhas, rufos e vedação;
- alvenaria e pequenos reparos;
- bases e pilares de concreto;
- hidráulica predial leve;
- remoção e recomposição de drywall.

Elétrica, serralheria, comunicação visual, chaveiro, automação de portões e sistemas especializados de esgoto ficam explicitamente fora do perfil inicial. Todas as competências têm evidência `self_declared`; a interface não as apresenta como certificadas.

## Pontuação

Cada oportunidade recebe até 100 pontos:

- enquadramento MEI e localização: 25;
- cobertura técnica ponderada: 55;
- capacidades operacionais: 15;
- força das evidências: 5.

Uma recomendação exige score de pelo menos 75, cobertura técnica de pelo menos 75% e nenhum impedimento. Alertas críticos de prazo são separados da aderência: uma empresa pode ter fit técnico alto e ainda assim não deve avançar até que o órgão corrija ou esclareça o prazo.

## Resultado inicial verificado

- `12908` — Instalação de Calhas e Rufos: 97, recomendada.
- `12672` — Instalação de Pontos de Água: 90, recomendada.
- `12644` — Construção de Estruturas: 90 de fit, mas impedida pelo prazo de execução publicado antes do fechamento das propostas.
- `12673` — Assentamento de Tijolos e Blocos: 75, revisar porque o escopo também exige elétrica, competência ausente no perfil.

O restante fica fora do perfil ou requer revisão. Alterar serviços e capacidades no editor chama a API de matching e recalcula as 12 oportunidades.
