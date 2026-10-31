import copy
import json
from datetime import date
from pathlib import Path

import pytest

from ingest.openalex.normalize import abstract_from_inverted_index, clean_text, normalize

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture
def work_en() -> dict:
    return load("openalex_work_en.json")


@pytest.fixture
def work_ru() -> dict:
    return load("openalex_work_ru.json")


def test_full_record(work_en):
    work = normalize(work_en)

    assert work["source"] == "openalex"
    assert work["source_id"] == "W4404292906"
    assert work["doi"] == "10.3389/fbioe.2024.1444986"
    assert work["title"].startswith("Optimizing scaffold pore size for tissue engineering")
    assert work["abstract"].split()[:3] == work_en_abstract_start(work_en)
    assert work["publication_year"] == 2024
    assert isinstance(work["publication_date"], date)
    assert work["language"] == "en"
    assert work["work_type"] == "review"
    assert work["license"] == "cc-by"
    assert work["is_oa"] is True
    assert work["landing_url"] == "https://doi.org/10.3389/fbioe.2024.1444986"
    assert work["oa_url"]
    assert work["journal"] == "Frontiers in Bioengineering and Biotechnology"
    assert work["field"]
    assert work["countries"] == ["KZ"]
    assert len(work["authors"]) == 6
    assert work["authors"][0]["name"]
    assert work["authors"][0]["institutions"][0]["country"] == "KZ"
    assert "abstract_inverted_index" not in work["raw"]


def work_en_abstract_start(record: dict) -> list[str]:
    positions = {p: w for w, ps in record["abstract_inverted_index"].items() for p in ps}
    return [positions[0], positions[1], positions[2]]


def test_russian_record_without_license(work_ru):
    work = normalize(work_ru)

    assert work["language"] == "ru"
    assert "КАЗА" in work["title"]
    assert work["license"] is None
    # У одного из авторов страна не указана, остальные дают RU и KZ.
    assert work["countries"] == ["KZ", "RU"]


def test_missing_abstract(work_en):
    work_en["abstract_inverted_index"] = None
    assert normalize(work_en)["abstract"] is None


def test_missing_language(work_en):
    work_en["language"] = None
    assert normalize(work_en)["language"] is None


def test_missing_doi(work_en):
    work_en["doi"] = None
    work_en["primary_location"]["landing_page_url"] = None
    work = normalize(work_en)

    assert work["doi"] is None
    # Без DOI и страницы издателя ведём на запись в OpenAlex.
    assert work["landing_url"] == "https://openalex.org/W4404292906"


@pytest.mark.parametrize("title", [None, "", "   ", "<i></i>"])
def test_record_without_title_is_dropped(work_en, title):
    work_en["display_name"] = title
    assert normalize(work_en) is None


def test_missing_locations_and_topic(work_en):
    for key in ("primary_location", "best_oa_location", "primary_topic", "open_access"):
        work_en[key] = None
    work = normalize(work_en)

    assert work["journal"] is None
    assert work["field"] is None
    assert work["license"] is None
    assert work["is_oa"] is False


def test_does_not_modify_input(work_en):
    original = copy.deepcopy(work_en)
    normalize(work_en)
    assert work_en == original


def test_abstract_from_inverted_index():
    index = {"Open": [0], "science": [1, 3], "is": [2]}
    assert abstract_from_inverted_index(index) == "Open science is science"
    assert abstract_from_inverted_index({}) is None
    assert abstract_from_inverted_index(None) is None


def test_clean_text():
    assert clean_text("  Mass of <i>Bos taurus</i> &amp; cows\n") == "Mass of Bos taurus & cows"
    assert clean_text("Қазақстандағы ғылым") == "Қазақстандағы ғылым"
