from pathlib import Path

import httpx

from app.config import Settings
from app.models import CategoriaFiltro, StatusOportunidade, UF
from app.scraper import ContrataMaisScraper


FIXTURES = Path(__file__).parent / "fixtures"


async def test_service_forwards_filters_enriches_details_and_uses_cache() -> None:
    listing_html = (FIXTURES / "listing.html").read_text(encoding="utf-8")
    detail_html = (FIXTURES / "detail.html").read_text(encoding="utf-8")
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/oportunidades/":
            return httpx.Response(200, text=listing_html)
        if request.url.path == "/oportunidades/123":
            return httpx.Response(200, text=detail_html)
        return httpx.Response(404)

    settings = Settings(
        contrata_mais_base_url="https://portal.example",
        ibge_base_url="https://ibge.example/api/v1",
        max_concurrency=2,
        list_cache_ttl_seconds=60,
        detail_cache_ttl_seconds=60,
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        scraper = ContrataMaisScraper(client, settings)
        for _ in range(2):
            result = await scraper.list_opportunities(
                query="pintura",
                uf=UF.SC,
                municipalities=["Cidade Exemplo", "Outra Cidade"],
                category=CategoriaFiltro.REPAROS_ESCOLAS,
                status=StatusOportunidade.EM_ANDAMENTO,
                page=2,
                include_details=True,
            )

    assert result.itens[0].detalhes is not None
    assert result.itens[0].detalhes.endereco.cidade == "Cidade Exemplo"
    assert len(requests) == 2
    listing_request = requests[0]
    assert listing_request.url.params["page"] == "2"
    assert listing_request.url.params["query"] == "pintura"
    assert listing_request.url.params["uf"] == "SC"
    assert listing_request.url.params.get_list("municipio") == [
        "Cidade Exemplo",
        "Outra Cidade",
    ]
    assert listing_request.url.params["pdde"] == "true"
    assert listing_request.url.params["status_oportunidade"] == "andamento"

