#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_HUGO="$ROOT/.hugo/bin/hugo"

export HUGO_CACHEDIR="${HUGO_CACHEDIR:-$ROOT/.hugo/cache}"

if [[ -x "$LOCAL_HUGO" ]]; then
  exec "$LOCAL_HUGO" "$@"
fi

echo "Local Hugo not found. Run: ./scripts/install-hugo.sh" >&2
exit 1
