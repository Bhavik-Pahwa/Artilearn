"""Pluggable evidence connectors (MAT-08, MAT-15). Concrete sources are blocked on PRD Q4."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ConnectorPolicy:
    """Required per source (MAT-15). Construction fails if a field is missing."""

    source_id: str
    access_method: str  # api | permitted_content | search_provider | manual_document
    rate_limit_per_min: int
    licence_note: str
    scraping_permitted: bool = False

    def __post_init__(self):
        if self.access_method not in {"api", "permitted_content", "search_provider", "manual_document"}:
            raise ValueError(f"invalid access_method {self.access_method!r}")
        if not self.licence_note.strip():
            raise ValueError("licence_note is required (MAT-15)")


@dataclass(frozen=True)
class RetrievedExcerpt:
    source_id: str
    url_or_doc: str
    excerpt: str
    excerpt_location: str
    retrieved_at: str


class ConnectorUnavailable(Exception):
    """Raised when a source can't be reached. Callers must mark claims `unverified` (MAT-08)."""


class Connector(Protocol):
    policy: ConnectorPolicy

    def search(self, claim_text: str, *, limit: int = 5) -> list[RetrievedExcerpt]: ...
