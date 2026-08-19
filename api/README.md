# API Contrata+Brasil

API REST em FastAPI que consulta as páginas públicas de oportunidades do
[Contrata+Brasil](https://contratamaisbrasil.sistema.gov.br/oportunidades/),
repassa os filtros disponíveis no portal e agrega a cada resultado o conteúdo
da página **Ver mais**.

## O que a API entrega

- busca textual, UF, um ou vários municípios, categoria, status e paginação;
- endereço completo e órgão demandante;
- descrição completa, atividade e especificação;
- forma e prazo de pagamento, restrição a MEI e data limite de execução;
- anexos e perguntas/respostas públicas;
- Swagger UI em `/docs`, ReDoc em `/redoc` e OpenAPI em `/openapi.json`;
- cache em memória e limite de concorrência para reduzir carga no portal público.

## Executar localmente

Requer Python 3.12 ou mais recente.

```bash
python -m venv .venv
```

No Windows/PowerShell:

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

No Linux/macOS:

```bash
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Abra <http://localhost:8000/docs>.

## Endpoints

### `GET /api/v1/filtros`

Lista estados, categorias e status. Com uma UF, retorna também os municípios
da mesma fonte IBGE utilizada pela interface do portal:

```bash
curl "http://localhost:8000/api/v1/filtros?uf=SC"
```

### `GET /api/v1/oportunidades`

Os parâmetros correspondem aos filtros públicos do portal:

| Parâmetro | Exemplo | Observação |
|---|---|---|
| `query` | `pintura` | Busca textual |
| `uf` | `SC` | Sigla de estado validada |
| `municipio` | `Florianópolis` | Pode ser repetido; exige `uf` |
| `categoria` | `pequenos-reparos` | `todas`, `pequenos-reparos-escolas` ou `pequenos-reparos` |
| `status_oportunidade` | `abertas` | `abertas`, `andamento` ou `concluidas` |
| `pagina` | `1` | Página do portal |
| `incluir_detalhes` | `true` | Inclui o conteúdo de **Ver mais**; padrão `true` |

Exemplo:

```bash
curl "http://localhost:8000/api/v1/oportunidades?uf=SC&municipio=Florian%C3%B3polis&status_oportunidade=abertas"
```

Mais de um município:

```bash
curl "http://localhost:8000/api/v1/oportunidades?uf=SC&municipio=Florian%C3%B3polis&municipio=Chapec%C3%B3"
```

Para uma resposta mais rápida, sem acessar cada página de detalhes:

```bash
curl "http://localhost:8000/api/v1/oportunidades?uf=SC&incluir_detalhes=false"
```

### `GET /api/v1/oportunidades/{id}`

Retorna somente o conteúdo completo de **Ver mais**:

```bash
curl "http://localhost:8000/api/v1/oportunidades/12700"
```

## Docker

```bash
docker compose up --build
```

## Testes

```bash
pytest -q
```

## Configuração

Copie `.env.example` para `.env` se quiser alterar timeout, concorrência ou
tempo de cache. URLs de anexos podem ser assinadas e temporárias; por isso a API
também informa `url_expira_em` quando o portal publica os dados necessários.

Esta integração depende da estrutura HTML de um portal externo. Alterações no
site podem exigir atualização dos seletores; nesse caso a API retorna HTTP 502
com uma mensagem explícita, em vez de entregar campos silenciosamente errados.

