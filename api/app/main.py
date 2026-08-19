from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Path, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.config import settings
from app.models import (
    CategoriaFiltro,
    DetalhesOportunidade,
    ErrorResponse,
    FiltrosDisponiveis,
    HealthResponse,
    ListaOportunidades,
    MunicipioOpcao,
    OpcaoFiltro,
    StatusOportunidade,
    UF,
)
from app.scraper import (
    ContrataMaisScraper,
    OportunidadeNaoEncontrada,
    ScraperError,
)


STATE_NAMES = {
    "AC": "Acre",
    "AL": "Alagoas",
    "AP": "Amapá",
    "AM": "Amazonas",
    "BA": "Bahia",
    "CE": "Ceará",
    "DF": "Distrito Federal",
    "ES": "Espírito Santo",
    "GO": "Goiás",
    "MA": "Maranhão",
    "MT": "Mato Grosso",
    "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais",
    "PA": "Pará",
    "PB": "Paraíba",
    "PR": "Paraná",
    "PE": "Pernambuco",
    "PI": "Piauí",
    "RJ": "Rio de Janeiro",
    "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul",
    "RO": "Rondônia",
    "RR": "Roraima",
    "SC": "Santa Catarina",
    "SP": "São Paulo",
    "SE": "Sergipe",
    "TO": "Tocantins",
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    timeout = httpx.Timeout(settings.timeout_seconds)
    limits = httpx.Limits(max_connections=20, max_keepalive_connections=10)
    transport = httpx.AsyncHTTPTransport(retries=2)
    headers = {
        "User-Agent": "ContrataMaisBrasilPublicAPI/1.0 (+public-data-integration)",
        "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }
    async with httpx.AsyncClient(
        timeout=timeout,
        limits=limits,
        transport=transport,
        headers=headers,
    ) as client:
        app.state.scraper = ContrataMaisScraper(client, settings)
        yield


app = FastAPI(
    title="API Contrata+Brasil",
    summary="Consulta pública de oportunidades municipais do Contrata+Brasil",
    description=(
        "API de web scraping que replica os filtros públicos do portal Contrata+Brasil "
        "e inclui, por padrão, os dados disponíveis em **Ver mais**."
    ),
    version="1.0.0",
    contact={"name": "Projeto Gov API"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


def get_scraper(request: Request) -> ContrataMaisScraper:
    return request.app.state.scraper


@app.exception_handler(OportunidadeNaoEncontrada)
async def not_found_handler(
    _request: Request, exc: OportunidadeNaoEncontrada
) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ScraperError)
async def scraper_error_handler(_request: Request, exc: ScraperError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Verifica se a API está no ar",
    tags=["Operação"],
)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get(
    "/api/v1/filtros",
    response_model=FiltrosDisponiveis,
    responses={502: {"model": ErrorResponse}},
    summary="Lista os valores aceitos pelos filtros",
    description=(
        "Retorna estados, categorias e status. Quando `uf` é informada, também "
        "retorna os municípios usados pelo próprio portal, obtidos na API do IBGE."
    ),
    tags=["Filtros"],
)
async def available_filters(
    uf: Annotated[
        UF | None,
        Query(description="UF usada para carregar a lista de municípios."),
    ] = None,
    scraper: ContrataMaisScraper = Depends(get_scraper),
) -> FiltrosDisponiveis:
    municipalities: list[MunicipioOpcao] = []
    if uf:
        municipalities = await scraper.get_municipalities(uf)
    return FiltrosDisponiveis(
        estados=[
            OpcaoFiltro(valor=code, rotulo=name)
            for code, name in STATE_NAMES.items()
        ],
        categorias=[
            OpcaoFiltro(valor="todas", rotulo="Todas"),
            OpcaoFiltro(
                valor="pequenos-reparos-escolas",
                rotulo="Pequenos Reparos e Manutenção em Escolas",
            ),
            OpcaoFiltro(
                valor="pequenos-reparos",
                rotulo="Pequenos Reparos e Manutenção",
            ),
        ],
        status=[
            OpcaoFiltro(valor="abertas", rotulo="Oportunidades Abertas"),
            OpcaoFiltro(valor="andamento", rotulo="Seleção em andamento"),
            OpcaoFiltro(valor="concluidas", rotulo="Concluídas"),
        ],
        municipios=municipalities,
    )


@app.get(
    "/api/v1/oportunidades",
    response_model=ListaOportunidades,
    responses={502: {"model": ErrorResponse}},
    summary="Busca oportunidades e seus detalhes",
    description=(
        "Replica busca, estado, município, categoria, status e paginação do portal. "
        "`municipio` pode ser repetido para selecionar mais de uma cidade. Por padrão, "
        "cada item já inclui todo o conteúdo público de **Ver mais**."
    ),
    tags=["Oportunidades"],
)
async def list_opportunities(
    query: Annotated[
        str | None,
        Query(
            min_length=1,
            max_length=200,
            description="Texto livre do campo 'O que você procura?'.",
        ),
    ] = None,
    uf: Annotated[
        UF | None,
        Query(description="Estado da execução da oportunidade."),
    ] = None,
    municipio: Annotated[
        list[str] | None,
        Query(
            min_length=1,
            max_length=100,
            description=(
                "Município. Repita o parâmetro para múltiplos valores, por exemplo: "
                "`?municipio=Florianópolis&municipio=Chapecó`."
            ),
        ),
    ] = None,
    categoria: Annotated[
        CategoriaFiltro,
        Query(description="Categoria visível no filtro do portal."),
    ] = CategoriaFiltro.TODAS,
    status_oportunidade: Annotated[
        StatusOportunidade,
        Query(description="Status visível no filtro do portal."),
    ] = StatusOportunidade.ABERTAS,
    pagina: Annotated[
        int,
        Query(ge=1, le=10_000, description="Página do resultado no portal."),
    ] = 1,
    incluir_detalhes: Annotated[
        bool,
        Query(
            description=(
                "Quando verdadeiro, acessa os links 'Ver mais' em paralelo e inclui "
                "endereço, descrição completa, pagamento, anexos e dúvidas."
            )
        ),
    ] = True,
    scraper: ContrataMaisScraper = Depends(get_scraper),
) -> ListaOportunidades:
    municipalities = [value.strip() for value in (municipio or []) if value.strip()]
    if municipalities and not uf:
        raise HTTPException(
            status_code=422,
            detail="Informe uf quando usar o filtro municipio.",
        )
    if len(municipalities) > 50 or any(len(value) > 100 for value in municipalities):
        raise HTTPException(
            status_code=422,
            detail="Informe no máximo 50 municípios, com até 100 caracteres cada.",
        )
    normalized_query = query.strip() if query else None
    return await scraper.list_opportunities(
        query=normalized_query or None,
        uf=uf,
        municipalities=municipalities,
        category=categoria,
        status=status_oportunidade,
        page=pagina,
        include_details=incluir_detalhes,
    )


@app.get(
    "/api/v1/oportunidades/{oportunidade_id}",
    response_model=DetalhesOportunidade,
    responses={
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
    summary="Obtém todo o conteúdo de 'Ver mais'",
    tags=["Oportunidades"],
)
async def get_opportunity(
    oportunidade_id: Annotated[
        int,
        Path(ge=1, description="Identificador numérico exibido na URL do portal."),
    ],
    scraper: ContrataMaisScraper = Depends(get_scraper),
) -> DetalhesOportunidade:
    return await scraper.get_opportunity(oportunidade_id)
