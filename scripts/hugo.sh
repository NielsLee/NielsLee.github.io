#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_HUGO="$ROOT/.hugo/bin/hugo"

export HUGO_CACHEDIR="${HUGO_CACHEDIR:-$ROOT/.hugo/cache}"

if [[ -x "$LOCAL_HUGO" ]]; then
  exec "$LOCAL_HUGO" "$@"
fi

if command -v hugo >/dev/null 2>&1; then
  exec hugo "$@"
fi

echo "Hugo not found. Run: ./scripts/install-hugo.sh or install Hugo on PATH." >&2
exit 1
