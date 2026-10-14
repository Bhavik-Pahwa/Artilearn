"""Assistant tool contracts (PRD Sec. 8.4; AGT-02, AGT-03, milestone M6).

Every tool returns a ToolResult. The assistant may only describe an action as done when
`ok` is True (AGT-03); `describe` is the single place that phrasing comes from.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

TOOLS = (
    "retrieve_material",
    "verify_claims",
    "generate_questions",
    "start_quiz",
    "get_learner_summary",
    "build_revision_resource",
)
WRITE_TOOLS = frozenset({"start_quiz"})


@dataclass(frozen=True)
class ToolResult:
    tool: str
    tool_call_id: str
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None

    def __post_init__(self):
        if self.tool not in TOOLS:
            raise ValueError(f"unknown tool {self.tool!r}")
        if not self.ok and not self.error:
            raise ValueError("a failed ToolResult must carry an error")


def describe(result: ToolResult) -> str:
    if result.ok:
        return f"{result.tool} succeeded (call {result.tool_call_id})."
    return f"{result.tool} failed (call {result.tool_call_id}): {result.error}"
