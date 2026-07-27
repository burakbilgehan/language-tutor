#!/bin/sh
# T-064: one-time local setup for the Argos Translate MT engine used by
# scripts/mt-grammar-seed.ts. Not part of `npm install` / CI on purpose — this
# is a build-time content-generation tool run occasionally by the maintainer,
# not a runtime dependency of the app (same philosophy as the Max-subscription
# CLI: no per-call cost, no API key, nothing shipped to users).
#
# Usage: scripts/mt/setup-argos.sh [from_code] [to_code]
#   defaults to tr en (the only pair this ticket's scope needs).
set -e

FROM_CODE="${1:-tr}"
TO_CODE="${2:-en}"
VENV_DIR="$(cd "$(dirname "$0")/../.." && pwd)/.argos-venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "creating venv at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet argostranslate

# macOS python.org builds ship without a populated cert store; argostranslate's
# package-index fetch fails with CERTIFICATE_VERIFY_FAILED without this.
CERT_FILE="$("$VENV_DIR/bin/python3" -c 'import certifi; print(certifi.where())')"

SSL_CERT_FILE="$CERT_FILE" "$VENV_DIR/bin/python3" - "$FROM_CODE" "$TO_CODE" <<'PYEOF'
import sys
import argostranslate.package

from_code, to_code = sys.argv[1], sys.argv[2]
print(f"updating package index for {from_code}->{to_code}...")
argostranslate.package.update_package_index()
available = argostranslate.package.get_available_packages()
pkg = next(
    (p for p in available if p.from_code == from_code and p.to_code == to_code),
    None,
)
if pkg is None:
    print(f"NO {from_code}->{to_code} package available from Argos", file=sys.stderr)
    sys.exit(1)
print(f"downloading {pkg}...")
path = pkg.download()
argostranslate.package.install_from_path(path)
print("installed.")
PYEOF

echo "Argos $FROM_CODE->$TO_CODE ready. Run with:"
echo "  SSL_CERT_FILE=$CERT_FILE $VENV_DIR/bin/python3 scripts/mt/argos-worker.py $FROM_CODE $TO_CODE"
