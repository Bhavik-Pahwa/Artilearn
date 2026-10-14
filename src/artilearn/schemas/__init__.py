"""JSON schemas (PRD Sec. 9) and a validator. Validation failure fails the job (MAT-13)."""

import json
from functools import cache
from importlib.resources import files

from jsonschema import Draft202012Validator

SCHEMAS = ("document", "question", "learner_event", "mastery_estimate")


class SchemaValidationError(ValueError):
    def __init__(self, schema: str, errors: list[str]):
        self.schema = schema
        self.errors = errors
        super().__init__(f"{schema}: {len(errors)} error(s): " + "; ".join(errors[:5]))


@cache
def _validator(name: str) -> Draft202012Validator:
    if name not in SCHEMAS:
        raise KeyError(f"unknown schema {name!r}")
    schema = json.loads(files(__package__).joinpath(f"{name}.schema.json").read_text("utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def errors(instance: dict, name: str) -> list[str]:
    out = []
    for e in _validator(name).iter_errors(instance):
        path = "/".join(map(str, e.absolute_path)) or "<root>"
        out.append(f"{path}: {e.message}")
    return out


def validate(instance: dict, name: str) -> None:
    if errs := errors(instance, name):
        raise SchemaValidationError(name, errs)
