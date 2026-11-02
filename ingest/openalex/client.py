"""Клиент API OpenAlex: постраничная выборка работ с повторами при сбоях."""

import logging
from collections.abc import Iterator
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

log = logging.getLogger(__name__)

API_URL = "https://api.openalex.org/works"
PER_PAGE = 100  # максимум, который поддерживает API
# Без ключа OpenAlex не отдаёт cursor-страницы, а обычные ограничены первыми 10 000 результатами.
NO_KEY_MAX_RESULTS = 10_000
# В списках OpenAlex обрезает авторов до 100; полную запись отдаёт запрос по id (он бесплатный).
LIST_AUTHORSHIPS_CAP = 100

# Запрашиваем только нужные поля: так ответ меньше, а raw в базе компактнее.
SELECT_FIELDS = [
    "id",
    "doi",
    "display_name",
    "publication_year",
    "publication_date",
    "language",
    "type",
    "open_access",
    "best_oa_location",
    "primary_location",
    "primary_topic",
    "cited_by_count",
    "authorships",
    "abstract_inverted_index",
    "updated_date",
]


def build_filter(
    countries: list[str] | None = None,
    languages: list[str] | None = None,
    journal_countries: list[str] | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
) -> str:
    """Открытый доступ без отозванных статей и служебных страниц плюс выбранные условия.

    Значения внутри одного условия объединяются через «или», сами условия — через «и».
    """
    parts = ["is_oa:true", "is_retracted:false", "is_paratext:false"]
    if countries:
        parts.append("authorships.countries:" + "|".join(c.upper() for c in countries))
    if languages:
        parts.append("language:" + "|".join(lang.lower() for lang in languages))
    if journal_countries:
        codes = "|".join(c.upper() for c in journal_countries)
        parts.append("primary_location.source.country_code:" + codes)
    if year_from or year_to:
        parts.append(f"publication_year:{year_from or ''}-{year_to or ''}")
    return ",".join(parts)


class OpenAlexClient:
    def __init__(
        self, api_key: str | None = None, email: str | None = None, timeout: float = 60
    ) -> None:
        self.api_key = api_key or None
        self.email = email or None
        self.timeout = timeout
        self.session = requests.Session()
        retry = Retry(
            total=5,
            backoff_factor=2,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=("GET",),
            respect_retry_after_header=True,
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retry))
        self.session.headers["User-Agent"] = "Maqala/0.1 (https://github.com/unidropout/maqala)"
        if self.api_key:
            self.session.headers["Authorization"] = f"Bearer {self.api_key}"

    def iter_pages(self, filter_: str, limit: int | None = None) -> Iterator[list[dict[str, Any]]]:
        """Отдаёт страницы результатов, пока они не кончатся или не наберётся limit записей."""
        max_results = limit
        if not self.api_key:
            max_results = min(limit or NO_KEY_MAX_RESULTS, NO_KEY_MAX_RESULTS)
            if limit is None or limit > NO_KEY_MAX_RESULTS:
                log.warning(
                    "Нет OPENALEX_API_KEY: загрузим не больше %d записей", NO_KEY_MAX_RESULTS
                )

        params: dict[str, Any] = {
            "filter": filter_,
            "per_page": PER_PAGE,
            "select": ",".join(SELECT_FIELDS),
        }
        if self.email:
            params["mailto"] = self.email
        if self.api_key:
            params["cursor"] = "*"
        else:
            params["page"] = 1

        received = 0
        while True:
            data = self._get(params)
            results = data.get("results") or []
            if max_results is not None:
                results = results[: max_results - received]
            if not results:
                return
            received += len(results)
            yield [self._complete(record) for record in results]

            if max_results is not None and received >= max_results:
                return
            if self.api_key:
                next_cursor = data.get("meta", {}).get("next_cursor")
                if not next_cursor:
                    return
                params["cursor"] = next_cursor
            else:
                params["page"] += 1

    def _complete(self, record: dict[str, Any]) -> dict[str, Any]:
        """Дозапрашивает запись, если список авторов в ней обрезан."""
        if len(record.get("authorships") or []) < LIST_AUTHORSHIPS_CAP:
            return record
        work_id = record["id"].removeprefix("https://openalex.org/")
        params = {"select": ",".join(SELECT_FIELDS)}
        if self.email:
            params["mailto"] = self.email
        return self._get(params, url=f"{API_URL}/{work_id}")

    def _get(self, params: dict[str, Any], url: str = API_URL) -> dict[str, Any]:
        response = self.session.get(url, params=params, timeout=self.timeout)
        if not response.ok:
            # Тело ответа OpenAlex объясняет причину (неверный фильтр, кончился бюджет и т.п.).
            raise requests.HTTPError(
                f"OpenAlex {response.status_code}: {response.text[:500]}", response=response
            )
        return response.json()
