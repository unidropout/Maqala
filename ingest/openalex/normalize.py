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

# Буквы, которые есть в казахском алфавите, но не в русском. «і» есть ещё в украинском и
# белорусском, поэтому одна она не доказывает казахский язык.
_KAZAKH_RE = re.compile(r"[әғқңөұүһіӘҒҚҢӨҰҮҺІ]")
_KAZAKH_ONLY_RE = re.compile(r"[әғқңөұүһӘҒҚҢӨҰҮҺ]")
_CYRILLIC_RE = re.compile(r"[а-яёА-ЯЁ]")
_LATIN_RE = re.compile(r"[a-zA-Z]")
_MIN_TITLE_LETTERS = 15

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
    abstract = clean_abstract(abstract_from_inverted_index(record.get("abstract_inverted_index")))

    return {
        "source": SOURCE,
        "source_id": strip_prefix(record["id"], "https://openalex.org/"),
        "doi": doi.lower() if doi else None,
        "title": title,
        "abstract": abstract,
        "publication_year": record.get("publication_year"),
        "publication_date": parse_date(record.get("publication_date")),
        "language": detect_language(title, abstract, record.get("language")),
        "work_type": record.get("type") or None,
        "license": best_oa.get("license") or primary.get("license") or None,
        "is_oa": bool(open_access.get("is_oa")),
        "oa_status": open_access.get("oa_status") or None,
        "landing_url": http_url(primary.get("landing_page_url"))
        or http_url(record.get("doi"))
        or record["id"],
        # Страница бесплатной версии надёжнее pdf_url: тот иногда указывает на картинку.
        "oa_url": http_url(best_oa.get("landing_page_url"))
        or http_url(best_oa.get("pdf_url"))
        or http_url(open_access.get("oa_url")),
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


def detect_language(title: str, abstract: str | None, source_language: str | None) -> str | None:
    """Уточняет язык по тексту: метка OpenAlex часто путает казахский, русский и английский.

    Казахские буквы (ә, ғ, қ, ...) надёжно отличают казахский от русского. Для остальных языков
    оставляем метку источника, кроме случая, когда «ru» или «kk» стоит у текста на латинице.

    Решает название: казахстанские журналы часто дают аннотацию сразу на трёх языках.
    Аннотация используется, только если в названии слишком мало букв (формулы, сокращения).
    """
    letters = len(_CYRILLIC_RE.findall(title)) + len(_LATIN_RE.findall(title))
    letters += len(_KAZAKH_RE.findall(title))
    text = title if letters >= _MIN_TITLE_LETTERS else f"{title} {abstract or ''}"
    if _KAZAKH_ONLY_RE.search(text):
        return "kk"
    if _KAZAKH_RE.search(text) and source_language not in ("uk", "be"):
        return "kk"
    cyrillic = len(_CYRILLIC_RE.findall(text))
    latin = len(_LATIN_RE.findall(text))
    if cyrillic > latin:
        return source_language if source_language not in (None, "en", "kk") else "ru"
    if source_language in ("ru", "kk"):
        return "en"
    return source_language or None


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


def http_url(value: str | None) -> str | None:
    """Только http(s)-ссылки: метаданные в OpenAlex присылают издатели, там бывает что угодно."""
    if value and value.lower().startswith(("http://", "https://")):
        return value
    return None


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
