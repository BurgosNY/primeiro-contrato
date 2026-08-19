from datetime import datetime
from pathlib import Path

from app.models import (
    CategoriaFiltro,
    FiltrosAplicados,
    StatusOportunidade,
    UF,
)
from app.scraper import parse_detail, parse_listing


FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_listing_extracts_card_and_pagination() -> None:
    html = (FIXTURES / "listing.html").read_text(encoding="utf-8")
    filters = FiltrosAplicados(
        query=None,
        uf=UF.SC,
        municipios=["Cidade Exemplo"],
        categoria=CategoriaFiltro.TODAS,
        status_oportunidade=StatusOportunidade.ABERTAS,
    )

    result = parse_listing(
        html,
        source_url="https://contratamaisbrasil.sistema.gov.br/oportunidades/?uf=SC",
        page=1,
        filters=filters,
    )

    assert result.total == 13
    assert result.total_paginas == 2
    assert result.por_pagina == 1
    assert len(result.itens) == 1
    item = result.itens[0]
    assert item.id == 123
    assert item.atividade == "Pintor"
    assert item.bairro == "Centro"
    assert item.municipio == "Cidade Exemplo"
    assert item.status_portal == "PUBLICADO"
    assert item.data_expiracao == datetime.fromisoformat("2026-08-20T18:30:00-03:00")
    assert str(item.url_origem).endswith("/oportunidades/123")


def test_parse_detail_extracts_all_ver_mais_fields() -> None:
    html = (FIXTURES / "detail.html").read_text(encoding="utf-8")

    result = parse_detail(
        html,
        opportunity_id=123,
        source_url="https://contratamaisbrasil.sistema.gov.br/oportunidades/123",
    )

    assert result.id == 123
    assert result.categoria == "Manutenção predial"
    assert result.atividade == "Pintor"
    assert result.especificacao == "Pintura de paredes"
    assert result.orgao_demandante == "PREFEITURA MUNICIPAL DE EXEMPLO"
    assert result.local_execucao == "Escola Municipal"
    assert result.endereco.cidade == "Cidade Exemplo"
    assert result.endereco.estado == "SC"
    assert result.descricao == "Pintura completa da escola."
    assert result.forma_pagamento == "EMPENHO"
    assert result.prazo_pagamento == "30 dias"
    assert result.apenas_mei is True
    assert result.data_limite_execucao == "30 de Agosto de 2026"
    assert result.anexos[0].nome == "Anexo 1"
    assert result.anexos[0].url_expira_em == datetime.fromisoformat(
        "2026-08-19T13:00:00+00:00"
    )
    assert result.duvidas[0].pergunta == "É preciso visitar o local?"
    assert result.duvidas[0].resposta == "Sim, mediante agendamento."

