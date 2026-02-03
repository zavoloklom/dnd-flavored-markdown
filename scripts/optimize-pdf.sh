#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 input.pdf output.pdf" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="$2"

# TODO: Check input first

#qpdf --version
#
#qpdf \
#  --linearize \
#  --object-streams=generate \
#  --stream-data=compress \
#  --compression-level=9 \
#  --optimize-images \
#  --verbose \
#  --jpeg-quality=50 \
#  "$INPUT" "$OUTPUT"

#  --recompress-flate \
#  --decode-level=all \


gs \
  -dNOPAUSE -dBATCH \
  -dCompatibilityLevel=1.7 \
  -sDEVICE=pdfwrite \
  -dCompressPages=true \
  -dPreserveOverprintSettings=true \
  -dPreserveHalftoneInfo=true \
  -dPreserveOPIComments=true \
  -dPassThroughJPEGImages=true \
  -dHaveTransparency=true \
  -dPatternImagemask=true \
  -sOutputFile="${OUTPUT}" \
  "${INPUT}"

# Пример профиля: /ebook — обычно хороший баланс качество/размер.
# Можно поэкспериментировать с /screen, /ebook, /printer.  -dPDFSETTINGS=/screen \
#gs \
#  -sDEVICE=pdfwrite \
#  -dCompatibilityLevel=1.7 \
#  -dNOPAUSE -dBATCH \
#  -dCompressFonts=true \
#  -dEmbedAllFonts=true \
#  -dHaveTransparency=true \
#  -dCompressMode=1 \
#  -dTextFormat=1 \
#  -dPreserveTrMode=true \
#  -dPreserveOverprintSettings=true \
#  -dDownsampleColorImages=false \
#  -dDownsampleGrayImages=false \
#  -dDownsampleMonoImages=false \
#  -sOutputFile="${OUTPUT}" \
#  "${INPUT}"
#
#gs \
  #  -sDEVICE=pdfwrite \
  #  -dCompatibilityLevel=1.7 \
  #  -dNOPAUSE -dQUIET -dBATCH \
#  -dDetectDuplicateImages=true \
  #  -dCompressFonts=true \
#  -dDownsampleColorImages=true \
#  -dColorImageResolution=200 \
#  -dColorImageDownsampleThreshold=1.5 \
#  -dDownsampleGrayImages=true \
#  -dGrayImageResolution=200 \
#  -dGrayImageDownsampleThreshold=1.5 \
#  -dDownsampleMonoImages=false \
  #  -sOutputFile="${OUTPUT}" \
  #  "${INPUT}"