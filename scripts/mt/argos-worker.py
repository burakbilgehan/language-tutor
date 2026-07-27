# T-064: batch MT worker for the build-time grammar seed translation.
#
# Protocol: reads one JSON array of strings from stdin, writes one JSON array
# of translated strings (same length, same order) to stdout. Everything else
# (progress, warnings) goes to stderr so stdout stays a clean JSON value.
#
# Run via the venv created by scripts/mt/setup-argos.sh — never assumes Argos
# is on the system Python.
import json
import sys


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: argos-worker.py <from_code> <to_code>", file=sys.stderr)
        sys.exit(2)
    from_code, to_code = sys.argv[1], sys.argv[2]

    import argostranslate.translate

    installed = argostranslate.translate.get_installed_languages()
    from_lang = next((l for l in installed if l.code == from_code), None)
    to_lang = next((l for l in installed if l.code == to_code), None)
    if from_lang is None or to_lang is None:
        print(
            f"language pair {from_code}->{to_code} not installed "
            f"(run scripts/mt/setup-argos.sh {from_code} {to_code})",
            file=sys.stderr,
        )
        sys.exit(1)
    translation = from_lang.get_translation(to_lang)

    texts = json.load(sys.stdin)
    if not isinstance(texts, list):
        print("stdin must be a JSON array of strings", file=sys.stderr)
        sys.exit(2)

    out = []
    total = len(texts)
    for i, text in enumerate(texts):
        out.append(translation.translate(text) if text else text)
        if (i + 1) % 50 == 0 or i + 1 == total:
            print(f"[argos] {i + 1}/{total}", file=sys.stderr)

    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
