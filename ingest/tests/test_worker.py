import pytest

from ingest.worker import parse_params


def test_parse_params_accepts_valid_job():
    selection, limit = parse_params(
        {"languages": ["KK"], "countries": ["kz"], "year_from": 2020, "limit": 500}
    )
    assert selection == {
        "countries": ["KZ"],
        "languages": ["kk"],
        "journal_countries": None,
        "year_from": 2020,
        "year_to": None,
    }
    assert limit == 500


@pytest.mark.parametrize(
    "params",
    [
        {},  # ничего не выбрано: загрузка всего OpenAlex
        {"countries": ["KZ'); drop table works;--"]},
        {"countries": "KZ"},
        {"languages": ["kk"], "year_from": "2020"},
        {"languages": ["kk"], "year_to": 1800},
        {"languages": ["kk"], "limit": 0},
        {"languages": ["kk"], "limit": 10**9},
    ],
)
def test_parse_params_rejects_bad_jobs(params):
    with pytest.raises(ValueError):
        parse_params(params)
