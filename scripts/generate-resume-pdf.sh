#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

hugo_args=("$@")
if [[ ${#hugo_args[@]} -eq 0 ]]; then
  hugo_args=(--ignoreCache)
fi

"$ROOT/scripts/hugo.sh" "${hugo_args[@]}"
node "$ROOT/scripts/generate-resume-pdf.mjs"
"$ROOT/scripts/hugo.sh" "${hugo_args[@]}"
