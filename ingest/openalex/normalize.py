"""Приведение записи OpenAlex к единой схеме статьи (ТЗ §6.2)."""

import html
import re
from datetime import date
from typing import Any

SOURCE = "openalex"

_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_RE = re.compile(r"\s+")
# Издатели часто начинают аннотацию со служебного заголовка: «Abstract ...», «Аннотация. ...».
_ABSTRACT_LABEL_RE = re.compile(
    r"^(abstract|summary|аннотация|андатпа)\s*[:.\-—]?\s+", re.IGNORECASE
)

# Поля, которые не кладём в raw: аннотация уже лежит текстом, а индекс занимает больше всего места.
_RAW_EXCLUDE = {"abstract_inverted_index"}


def normalize(record: dict[str, Any]) -> dict[str, Any] | None:
    """Возвращает строку для таблицы works или None, если запись надо отбросить."""
    title = clean_text(record.get("display_name") or record.get("title"))
    if not title:
        return None

    primary = record.get("primary_location") or {}
    best_oa = record.get("best_oa_location") or {}
    open_access = record.get("open_access") or {}
    topic = record.get("primary_topic") or {}
    doi = strip_prefix(record.get("doi"), "https://doi.org/")

    return {
        "source": SOURCE,
        "source_id": strip_prefix(record["id"], "https://openalex.org/"),
        "doi": doi.lower() if doi else None,
        "title": title,
        "abstract": clean_abstract(
            abstract_from_inverted_index(record.get("abstract_inverted_index"))
        ),
        "publication_year": record.get("publication_year"),
        "publication_date": parse_date(record.get("publication_date")),
        "language": record.get("language") or None,
        "work_type": record.get("type") or None,
        "license": best_oa.get("license") or primary.get("license") or None,
        "is_oa": bool(open_access.get("is_oa")),
        "oa_status": open_access.get("oa_status") or None,
        "landing_url": primary.get("landing_page_url") or record.get("doi") or record["id"],
        # Страница бесплатной версии надёжнее pdf_url: тот иногда указывает на картинку.
        "oa_url": best_oa.get("landing_page_url")
        or best_oa.get("pdf_url")
        or open_access.get("oa_url")
        or None,
        "journal": (primary.get("source") or {}).get("display_name"),
        "field": (topic.get("field") or {}).get("display_name"),
        "subfield": (topic.get("subfield") or {}).get("display_name"),
        "topic": topic.get("display_name"),
        "cited_by_count": record.get("cited_by_count") or 0,
        "countries": countries(record.get("authorships") or []),
        "authors": authors(record.get("authorships") or []),
        "raw": {k: v for k, v in record.items() if k not in _RAW_EXCLUDE},
        "source_updated_at": record.get("updated_date"),
    }


def abstract_from_inverted_index(index: dict[str, list[int]] | None) -> str | None:
    """OpenAlex отдаёт аннотацию как {слово: [позиции]}; собираем обратно в текст."""
    if not index:
        return None
    positions = {pos: word for word, places in index.items() for pos in places}
    return " ".join(positions[pos] for pos in sorted(positions))


def countries(authorships: list[dict[str, Any]]) -> list[str]:
    found: set[str] = set()
    for authorship in authorships:
        found.update(authorship.get("countries") or [])
        for institution in authorship.get("institutions") or []:
            if institution.get("country_code"):
                found.add(institution["country_code"])
    return sorted(found)


def authors(authorships: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for authorship in authorships:
        author = authorship.get("author") or {}
        name = clean_text(author.get("display_name") or authorship.get("raw_author_name"))
        if not name:
            continue
        result.append(
            {
                "name": name,
                "orcid": strip_prefix(author.get("orcid"), "https://orcid.org/"),
                "institutions": [
                    {"name": inst["display_name"], "country": inst.get("country_code")}
                    for inst in authorship.get("institutions") or []
                    if inst.get("display_name")
                ],
            }
        )
    return result


def clean_abstract(value: str | None) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    return _ABSTRACT_LABEL_RE.sub("", text, count=1) or None


def clean_text(value: str | None) -> str | None:
    """Убирает HTML-теги и сущности, схлопывает пробелы. Пустая строка превращается в None."""
    if not value:
        return None
    text = _SPACE_RE.sub(" ", html.unescape(_TAG_RE.sub("", value))).strip()
    return text or None


def strip_prefix(value: str | None, prefix: str) -> str | None:
    if not value:
        return None
    return value.removeprefix(prefix)


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None
