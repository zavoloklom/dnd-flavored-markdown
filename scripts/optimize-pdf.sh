#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 input.pdf output.pdf" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="$2"

# Пример профиля: /ebook — обычно хороший баланс качество/размер.
# Можно поэкспериментировать с /screen, /ebook, /printer.
gs \
  -sDEVICE=pdfwrite \
  -dCompatibilityLevel=1.7 \
  -dNOPAUSE -dQUIET -dBATCH \
  -dCompressFonts=true \
  -dEmbedAllFonts=true \
  -sOutputFile="${OUTPUT}" \
  "${INPUT}"
