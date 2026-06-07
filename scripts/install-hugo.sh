#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(cat "$ROOT/.hugo-version")"
INSTALL_DIR="$ROOT/.hugo/bin"
BINARY="$INSTALL_DIR/hugo"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64) ARCH="universal" ;;
  x86_64|amd64) ARCH="universal" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

if [[ "$OS" != "darwin" && "$OS" != "linux" ]]; then
  echo "Unsupported OS: $OS" >&2
  exit 1
fi

if [[ "$OS" == "linux" ]]; then
  ARCH="amd64"
fi

ARCHIVE="hugo_extended_${VERSION}_${OS}-${ARCH}.tar.gz"
URL="https://github.com/gohugoio/hugo/releases/download/v${VERSION}/${ARCHIVE}"
TMP="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

mkdir -p "$INSTALL_DIR"
curl -fsSL -o "$TMP/${ARCHIVE}" "$URL"
tar -xzf "$TMP/${ARCHIVE}" -C "$TMP" hugo
install -m 755 "$TMP/hugo" "$BINARY"

echo "Installed: $("$BINARY" version)"
