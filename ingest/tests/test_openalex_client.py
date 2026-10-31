from ingest.openalex.client import OpenAlexClient, build_filter


class FakeClient(OpenAlexClient):
    """Отдаёт заранее заданные ответы вместо запросов к API и запоминает параметры."""

    def __init__(self, responses, api_key=None):
        super().__init__(api_key=api_key)
        self.responses = list(responses)
        self.calls = []

    def _get(self, params, url=None):
        self.calls.append({**params, "url": url} if url else dict(params))
        return self.responses.pop(0)


def page(n, start=0, next_cursor=None):
    return {
        "meta": {"next_cursor": next_cursor},
        "results": [{"id": f"W{i}"} for i in range(start, start + n)],
    }


def test_build_filter():
    assert build_filter(["kz", "UZ"]) == (
        "is_oa:true,is_retracted:false,is_paratext:false,authorships.countries:KZ|UZ"
    )


def test_pages_without_key_until_empty():
    client = FakeClient([page(100), page(30, 100), page(0)])
    pages = list(client.iter_pages("f"))

    assert [len(p) for p in pages] == [100, 30]
    assert [c["page"] for c in client.calls] == [1, 2, 3]
    assert "cursor" not in client.calls[0]


def test_limit_cuts_last_page():
    client = FakeClient([page(100), page(100, 100)])
    pages = list(client.iter_pages("f", limit=150))

    assert [len(p) for p in pages] == [100, 50]
    assert len(client.calls) == 2


def test_cursor_paging_with_key():
    client = FakeClient([page(100, next_cursor="abc"), page(10, 100)], api_key="k")
    pages = list(client.iter_pages("f"))

    assert [len(p) for p in pages] == [100, 10]
    assert [c["cursor"] for c in client.calls] == ["*", "abc"]
    assert client.session.headers["Authorization"] == "Bearer k"


def test_truncated_authorships_are_fetched_in_full():
    truncated = {"id": "https://openalex.org/W1", "authorships": [{}] * 100}
    full = {"id": "https://openalex.org/W1", "authorships": [{}] * 243}
    client = FakeClient([{"meta": {}, "results": [truncated, {"id": "W2"}]}, full, page(0)])
    (records,) = list(client.iter_pages("f"))

    assert len(records[0]["authorships"]) == 243
    assert records[1] == {"id": "W2"}
    assert client.calls[1]["url"].endswith("/works/W1")
