"""Адаптеры источников данных для Marketplace Hunter.

Принцип: каждый источник — отдельный адаптер с явным правовым основанием.
- Official1688Adapter: 1688 Open Platform (AppKey/AppSecret, квоты, поиск по фото 拍立淘).
- LicensedFeedAdapter: поставщик данных по Alibaba / Made-in-China по договору.
- SupplierSiteAdapter: Crawl4AI ТОЛЬКО для собственных сайтов заводов, с учётом robots.txt.
Массовый парсинг Alibaba.com и 1688.com с серверов не делаем: это нарушает правила площадок.
"""
from __future__ import annotations

import os
from typing import Protocol

import httpx

from .models import Candidate


class SourceAdapter(Protocol):
    name: str

    async def search(self, query_zh: str, query_en: str, image_url: str | None = None) -> list[Candidate]: ...


class Official1688Adapter:
    """Заглушка поверх 1688 Open Platform. Подпись запросов и эндпоинты — по документации open.1688.com
    после одобрения приложения; здесь только контракт, чтобы граф можно было собрать и протестировать."""

    name = "1688"

    def __init__(self) -> None:
        self.app_key = os.getenv("OPEN1688_APP_KEY")
        self.app_secret = os.getenv("OPEN1688_APP_SECRET")

    async def search(self, query_zh: str, query_en: str, image_url: str | None = None) -> list[Candidate]:
        if not (self.app_key and self.app_secret):
            return []  # нет допуска — Hunter перейдёт к следующему источнику и поставит задачу оператору
        raise NotImplementedError("Реализовать после получения доступа к 1688 Open Platform")


class LicensedFeedAdapter:
    name = "licensed_feed"

    def __init__(self) -> None:
        self.base_url = os.getenv("FEED_BASE_URL")

    async def search(self, query_zh: str, query_en: str, image_url: str | None = None) -> list[Candidate]:
        if not self.base_url:
            return []
        async with httpx.AsyncClient(base_url=self.base_url, timeout=20) as c:
            r = await c.get("/search", params={"q": query_en, "q_zh": query_zh})
            r.raise_for_status()
            return [Candidate.model_validate(x) for x in r.json()["items"]]


class SupplierSiteAdapter:
    """Обогащение карточки завода с его собственного сайта через сервис Crawl4AI из docker-compose."""

    name = "own_site"

    def __init__(self) -> None:
        self.crawl4ai = os.getenv("CRAWL4AI_URL", "http://crawl4ai:11235")

    async def fetch_markdown(self, url: str) -> str:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{self.crawl4ai}/crawl", json={"urls": [url], "crawler_config": {"check_robots_txt": True}})
            r.raise_for_status()
            results = r.json().get("results", [])
            return results[0].get("markdown", "") if results else ""

    async def search(self, query_zh: str, query_en: str, image_url: str | None = None) -> list[Candidate]:
        return []  # сайт завода не ищем, а обогащаем уже найденных кандидатов


def default_sources() -> list[SourceAdapter]:
    return [Official1688Adapter(), LicensedFeedAdapter()]
