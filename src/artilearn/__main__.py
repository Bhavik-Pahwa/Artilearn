"""CLI: `python -m artilearn ingest FILE [--subject ID] [--syllabus ID]` prints document JSON."""

import argparse
import json
import sys

from artilearn.ingest import ingest_file


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="artilearn")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("ingest", help="parse a PDF/DOCX/PPTX into document JSON")
    p.add_argument("file")
    p.add_argument("--subject")
    p.add_argument("--syllabus")
    args = parser.parse_args(argv)

    doc = ingest_file(args.file, subject_id=args.subject, syllabus_id=args.syllabus)
    json.dump(doc, sys.stdout, indent=2, ensure_ascii=False)
    print()
    return 1 if doc["processing"]["status"] == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
