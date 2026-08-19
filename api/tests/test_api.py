from pathlib import Path

import httpx

from app.main import app, get_scraper
from app.models import (
    CategoriaFiltro,
    FiltrosAplicados,
    MunicipioOpcao,
    StatusOportunidade,
    UF,
)
from app.scraper import parse_detail, parse_listing


FIXTURES = Path(__file__).parent / "fixtures"


class FakeScraper:
    async def get_municipalities(self, uf: UF) -> list[MunicipioOpcao]:
        assert uf == UF.SC
        return [MunicipioOpcao(id=1, nome="Cidade Exemplo")]

    async def list_opportunities(
        self,
        *,
        query: str | None,
        uf: UF | None,
        municipalities: list[str],
        category: CategoriaFiltro,
        status: StatusOportunidade,
        page: int,
        include_details: bool,
    ):
        filters = FiltrosAplicados(
            query=query,
            uf=uf,
            municipios=municipalities,
            categoria=category,
            status_oportunidade=status,
        )
        result = parse_listing(
            (FIXTURES / "listing.html").read_text(encoding="utf-8"),
            source_url="https://contratamaisbrasil.sistema.gov.br/oportunidades/",
            page=page,
            filters=filters,
        )
        if include_details:
            result.itens[0].detalhes = await self.get_opportunity(123)
        return result

    async def get_opportunity(self, opportunity_id: int):
        return parse_detail(
            (FIXTURES / "detail.html").read_text(encoding="utf-8"),
            opportunity_id=opportunity_id,
            source_url=(
                "https://contratamaisbrasil.sistema.gov.br/"
                f"oportunidades/{opportunity_id}"
            ),
        )


app.dependency_overrides[get_scraper] = lambda: FakeScraper()


async def test_swagger_exposes_portal_filters() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    operation = response.json()["paths"]["/api/v1/oportunidades"]["get"]
    parameters = {item["name"] for item in operation["parameters"]}
    assert {
        "query",
        "uf",
        "municipio",
        "categoria",
        "status_oportunidade",
        "pagina",
        "incluir_detalhes",
    } <= parameters


async def test_list_endpoint_includes_ver_mais_details_by_default() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/oportunidades",
            params={"uf": "SC", "municipio": "Cidade Exemplo"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["filtros_aplicados"]["municipios"] == ["Cidade Exemplo"]
    assert body["itens"][0]["detalhes"]["endereco"]["cidade"] == "Cidade Exemplo"
    assert body["itens"][0]["detalhes"]["duvidas"][0]["resposta"]


async def test_municipality_requires_state() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/oportunidades",
            params={"municipio": "Cidade Exemplo"},
        )

    assert response.status_code == 422
    assert "uf" in response.json()["detail"]


async def test_filters_endpoint_returns_municipalities_for_state() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/filtros", params={"uf": "SC"})

    assert response.status_code == 200
    assert response.json()["municipios"] == [{"id": 1, "nome": "Cidade Exemplo"}]
