#!/usr/bin/env bash
cd "$(dirname "$0")/.."
"$(dirname "$0")/hugo.sh" server -D --bind 0.0.0.0
