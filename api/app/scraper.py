from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable
from urllib.parse import parse_qs, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

from app.config import Settings
from app.models import (
    Anexo,
    CategoriaFiltro,
    DetalhesOportunidade,
    Duvida,
    Endereco,
    FiltrosAplicados,
    ListaOportunidades,
    MunicipioOpcao,
    Oportunidade,
    StatusOportunidade,
    UF,
)


class ScraperError(RuntimeError):
    """Erro compreensível na comunicação ou leitura do portal de origem."""


class OportunidadeNaoEncontrada(ScraperError):
    pass


class EstruturaPortalInvalida(ScraperError):
    pass


@dataclass(slots=True)
class _CacheEntry:
    value: Any
    expires_at: float


class TTLCache:
    def __init__(self) -> None:
        self._entries: dict[str, _CacheEntry] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry.expires_at <= time.monotonic():
                self._entries.pop(key, None)
                return None
            return entry.value

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        if ttl_seconds <= 0:
            return
        async with self._lock:
            self._entries[key] = _CacheEntry(
                value=value,
                expires_at=time.monotonic() + ttl_seconds,
            )


def _clean_text(value: str | None) -> str:
    return " ".join((value or "").replace("\xa0", " ").split())


def _without_prefix(value: str, prefix: str) -> str:
    return _clean_text(re.sub(rf"^{re.escape(prefix)}\s*", "", value, flags=re.I))


def _first_text(node: Tag | None, selector: str) -> str:
    if node is None:
        return ""
    child = node.select_one(selector)
    return _clean_text(child.get_text(" ", strip=True)) if child else ""


def _parse_optional_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _signed_url_expiration(url: str) -> datetime | None:
    query = parse_qs(urlparse(url).query)
    issued = query.get("X-Goog-Date", [None])[0]
    expires = query.get("X-Goog-Expires", [None])[0]
    if not issued or not expires:
        return None
    try:
        start = datetime.strptime(issued, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        return start + timedelta(seconds=int(expires))
    except (TypeError, ValueError):
        return None


def _labeled_value(root: Tag, label: str) -> str | None:
    wanted = _clean_text(label).rstrip(":").casefold()
    for strong in root.find_all("strong"):
        current = _clean_text(strong.get_text(" ", strip=True)).rstrip(":").casefold()
        if current != wanted or not strong.parent:
            continue
        full_text = _clean_text(strong.parent.get_text(" ", strip=True))
        raw_label = _clean_text(strong.get_text(" ", strip=True))
        value = _clean_text(full_text[len(raw_label) :].lstrip(": "))
        return value or None
    return None


def parse_listing(
    html: str,
    *,
    source_url: str,
    page: int,
    filters: FiltrosAplicados,
) -> ListaOportunidades:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(".demanda-card")

    summary = soup.find(
        string=re.compile(r"Mostrando\s+\d+\s*-\s*\d+\s+de\s+\d+", re.I)
    )
    if summary is None:
        heading = next(
            (
                element
                for element in soup.find_all(["h1", "h2", "h3", "h4"])
                if "Mostrando" in _clean_text(element.get_text(" ", strip=True))
            ),
            None,
        )
        summary_text = _clean_text(heading.get_text(" ", strip=True)) if heading else ""
    else:
        summary_text = _clean_text(summary.parent.get_text(" ", strip=True))

    match = re.search(
        r"Mostrando\s+(\d+)\s*-\s*(\d+)\s+de\s+(\d+)", summary_text, re.I
    )
    if not match:
        raise EstruturaPortalInvalida(
            "O portal respondeu, mas o resumo de paginação não foi reconhecido."
        )

    start, end, total = (int(group) for group in match.groups())
    per_page = max(0, end - start + 1) if total else 0
    pagination = soup.select_one("nav.br-pagination")
    total_pages = int(pagination.get("data-total", "0")) if pagination else 0
    if total and not total_pages:
        total_pages = max(1, (total + max(per_page, 1) - 1) // max(per_page, 1))

    items: list[Oportunidade] = []
    for card in cards:
        link = card.select_one('a[href*="/oportunidades/"]')
        href = str(link.get("href", "")) if link else ""
        id_match = re.search(r"/oportunidades/(\d+)/?", href)
        if not id_match:
            continue

        location = _first_text(card, ".local-servico")
        bairro: str | None = None
        municipio: str | None = None
        if "/" in location:
            bairro_raw, municipio_raw = location.rsplit("/", 1)
            bairro = _clean_text(bairro_raw) or None
            municipio = _clean_text(municipio_raw) or None
        elif location:
            municipio = location

        timer = card.select_one(".timer")
        expires_input = card.select_one(".timer_limit")
        source = urljoin(source_url, href)
        items.append(
            Oportunidade(
                id=int(id_match.group(1)),
                atividade=_first_text(card, ".titulo-servico"),
                orgao_demandante=_first_text(card, ".orgao-servico"),
                bairro=bairro,
                municipio=municipio,
                descricao_resumida=_first_text(card, ".card-content p"),
                status_portal=str(timer.get("data-status")) if timer else None,
                status_texto=(
                    _clean_text(timer.get_text(" ", strip=True)) if timer else None
                ),
                data_expiracao=_parse_optional_datetime(
                    str(expires_input.get("value")) if expires_input else None
                ),
                url_origem=source,
            )
        )

    return ListaOportunidades(
        pagina=page,
        por_pagina=per_page,
        total=total,
        total_paginas=total_pages,
        filtros_aplicados=filters,
        itens=items,
    )


def parse_detail(html: str, *, opportunity_id: int, source_url: str) -> DetalhesOportunidade:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.select_one("#main-content")
    if not isinstance(main, Tag):
        raise EstruturaPortalInvalida(
            "O portal respondeu, mas a área de detalhes não foi reconhecida."
        )

    intro = main.select_one("div.d-flex.align-items-start.justify-content-between.mb-4")
    section = main.select_one(":scope > div.d-flex.flex-column")
    if not isinstance(intro, Tag) or not isinstance(section, Tag):
        raise EstruturaPortalInvalida(
            "O portal respondeu, mas os campos da oportunidade não foram reconhecidos."
        )

    category_node = intro.select_one(".text-up-05")
    category = _clean_text(category_node.get_text(" ", strip=True)) if category_node else None

    activity: str | None = None
    specification: str | None = None
    for node in intro.select(".text-up-6"):
        text = _clean_text(node.get_text(" ", strip=True))
        if text.casefold().startswith("atividade:"):
            activity = _without_prefix(text, "Atividade:")
        elif text.casefold().startswith("especificação:"):
            specification = _without_prefix(text, "Especificação:")

    headings = [_clean_text(h.get_text(" ", strip=True)) for h in section.find_all("h4")]
    organization = next(
        (_without_prefix(value, "Órgão demandante:") for value in headings if value.casefold().startswith("órgão demandante:")),
        "",
    )
    execution_place = next(
        (_without_prefix(value, "Local de Execução:") for value in headings if value.casefold().startswith("local de execução:")),
        None,
    )

    description_heading = next(
        (
            h
            for h in section.find_all("h4")
            if _clean_text(h.get_text(" ", strip=True)).casefold()
            == "descrição do serviço solicitado"
        ),
        None,
    )
    description_node = description_heading.find_next("p") if description_heading else None
    description = (
        _clean_text(description_node.get_text(" ", strip=True))
        if isinstance(description_node, Tag)
        else ""
    )

    if not activity or not organization or not description:
        raise EstruturaPortalInvalida(
            "O portal respondeu, mas faltam campos essenciais da oportunidade."
        )

    mei_text = _labeled_value(section, "Apenas MEI:")
    mei: bool | None = None
    if mei_text:
        if mei_text.casefold() == "sim":
            mei = True
        elif mei_text.casefold() in {"não", "nao"}:
            mei = False

    attachments: list[Anexo] = []
    for index, image in enumerate(section.select("img.media-item"), start=1):
        src = str(image.get("src", "")).strip()
        if not src:
            continue
        absolute_url = urljoin(source_url, src)
        attachments.append(
            Anexo(
                nome=_clean_text(str(image.get("alt", ""))) or f"Anexo {index}",
                url=absolute_url,
                url_expira_em=_signed_url_expiration(absolute_url),
            )
        )

    questions: list[Duvida] = []
    for container in section.select("div.d-flex.flex-column.mb-3"):
        question: str | None = None
        answer: str | None = None
        for paragraph in container.find_all("p"):
            strong = paragraph.find("strong")
            if not strong:
                continue
            label = _clean_text(strong.get_text(" ", strip=True)).rstrip(":").casefold()
            value = _clean_text(paragraph.get_text(" ", strip=True))
            value = _clean_text(value[len(_clean_text(strong.get_text(" ", strip=True))) :].lstrip(": "))
            if label == "pergunta":
                question = value
            elif label == "resposta":
                answer = value or None
        if question:
            questions.append(Duvida(pergunta=question, resposta=answer))

    return DetalhesOportunidade(
        id=opportunity_id,
        categoria=category,
        atividade=activity,
        especificacao=specification,
        orgao_demandante=organization,
        local_execucao=execution_place,
        endereco=Endereco(
            logradouro=_labeled_value(section, "Logradouro:"),
            numero=_labeled_value(section, "Número:"),
            complemento=_labeled_value(section, "Complemento:"),
            bairro=_labeled_value(section, "Bairro:"),
            cidade=_labeled_value(section, "Cidade:"),
            estado=_labeled_value(section, "Estado:"),
            ponto_referencia=_labeled_value(section, "Ponto de referência:"),
        ),
        descricao=description,
        forma_pagamento=_labeled_value(section, "Forma de pagamento:"),
        prazo_pagamento=_labeled_value(section, "Prazo de pagamento:"),
        apenas_mei=mei,
        data_limite_execucao=_labeled_value(section, "Data limite de execução:"),
        anexos=attachments,
        duvidas=questions,
        url_origem=source_url,
    )


class ContrataMaisScraper:
    def __init__(self, client: httpx.AsyncClient, settings: Settings) -> None:
        self.client = client
        self.settings = settings
        self.cache = TTLCache()
        self._detail_semaphore = asyncio.Semaphore(settings.max_concurrency)

    async def _fetch_text(
        self,
        url: str,
        *,
        params: Iterable[tuple[str, str]] | None = None,
        cache_ttl: int,
        not_found_message: str | None = None,
    ) -> tuple[str, str]:
        request = self.client.build_request("GET", url, params=list(params or []))
        cache_key = str(request.url)
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            response = await self.client.send(request, follow_redirects=True)
        except httpx.TimeoutException as exc:
            raise ScraperError("O portal de origem excedeu o tempo de resposta.") from exc
        except httpx.RequestError as exc:
            raise ScraperError("Não foi possível conectar ao portal de origem.") from exc

        if response.status_code == 404 and not_found_message:
            raise OportunidadeNaoEncontrada(not_found_message)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ScraperError(
                f"O portal de origem respondeu com HTTP {response.status_code}."
            ) from exc

        value = (response.text, str(response.url))
        await self.cache.set(cache_key, value, cache_ttl)
        return value

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
    ) -> ListaOportunidades:
        params: list[tuple[str, str]] = [("page", str(page))]
        if query:
            params.append(("query", query))
        if uf:
            params.append(("uf", uf.value))
        params.extend(("municipio", municipality) for municipality in municipalities)
        if category.pdde is not None:
            params.append(("pdde", category.pdde))
        params.append(("status_oportunidade", status.value))

        html, final_url = await self._fetch_text(
            f"{self.settings.contrata_mais_base_url}/oportunidades/",
            params=params,
            cache_ttl=self.settings.list_cache_ttl_seconds,
        )
        filters = FiltrosAplicados(
            query=query,
            uf=uf,
            municipios=municipalities,
            categoria=category,
            status_oportunidade=status,
        )
        result = parse_listing(
            html,
            source_url=final_url,
            page=page,
            filters=filters,
        )

        if include_details and result.itens:
            await self._enrich_details(result.itens)
        return result

    async def _enrich_details(self, items: list[Oportunidade]) -> None:
        async def load(item: Oportunidade) -> None:
            try:
                async with self._detail_semaphore:
                    item.detalhes = await self.get_opportunity(item.id)
            except ScraperError as exc:
                item.erro_detalhes = str(exc)

        await asyncio.gather(*(load(item) for item in items))

    async def get_opportunity(self, opportunity_id: int) -> DetalhesOportunidade:
        source_url = (
            f"{self.settings.contrata_mais_base_url}/oportunidades/{opportunity_id}"
        )
        html, final_url = await self._fetch_text(
            source_url,
            cache_ttl=self.settings.detail_cache_ttl_seconds,
            not_found_message=f"Oportunidade {opportunity_id} não encontrada.",
        )
        return parse_detail(
            html,
            opportunity_id=opportunity_id,
            source_url=final_url,
        )

    async def get_municipalities(self, uf: UF) -> list[MunicipioOpcao]:
        url = f"{self.settings.ibge_base_url}/localidades/estados/{uf.value}/municipios"
        html, _ = await self._fetch_text(
            url,
            cache_ttl=self.settings.filters_cache_ttl_seconds,
        )
        try:
            data = json.loads(html)
            return sorted(
                [MunicipioOpcao(id=int(item["id"]), nome=str(item["nome"])) for item in data],
                key=lambda item: item.nome,
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise EstruturaPortalInvalida(
                "A lista de municípios retornada pelo IBGE não foi reconhecida."
            ) from exc
