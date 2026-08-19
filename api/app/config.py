from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    contrata_mais_base_url: str = os.getenv(
        "CONTRATA_MAIS_BASE_URL",
        "https://contratamaisbrasil.sistema.gov.br",
    ).rstrip("/")
    ibge_base_url: str = os.getenv(
        "IBGE_BASE_URL",
        "https://servicodados.ibge.gov.br/api/v1",
    ).rstrip("/")
    timeout_seconds: float = float(os.getenv("SCRAPER_TIMEOUT_SECONDS", "30"))
    max_concurrency: int = max(
        1, min(int(os.getenv("SCRAPER_MAX_CONCURRENCY", "6")), 12)
    )
    list_cache_ttl_seconds: int = max(
        0, int(os.getenv("LIST_CACHE_TTL_SECONDS", "60"))
    )
    detail_cache_ttl_seconds: int = max(
        0, int(os.getenv("DETAIL_CACHE_TTL_SECONDS", "300"))
    )
    filters_cache_ttl_seconds: int = max(
        0, int(os.getenv("FILTERS_CACHE_TTL_SECONDS", "3600"))
    )


settings = Settings()

