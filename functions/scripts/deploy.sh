#!/usr/bin/env bash
set -euo pipefail

# Load Firebase project info from the repo .env so there's a single source of truth.
set -a
. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.env"
set +a

PROJECT_ID="${EXPO_PUBLIC_FIREBASE_PROJECT_ID:-}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID in .env" >&2
  exit 1
fi

TMP_CONFIG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.firebase.json.tmp"
trap 'rm -f "$TMP_CONFIG"' EXIT

cat > "$TMP_CONFIG" <<'EOF'
{
  "functions": {
    "source": "."
  }
}
EOF

firebase deploy --only functions --project "$PROJECT_ID" --config "$TMP_CONFIG"
