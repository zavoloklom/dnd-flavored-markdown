docker:
	docker build -t dnd-flavored-markdown:dev .

example-ru: docker
	docker run --rm \
      -e DOC_PATH=/content/the-missing-merchant/ru.md \
      -e OUTPUT_FILE=the-missing-merchant-ru.pdf \
      -v "${PWD}/generated:/app/generated" \
      dnd-flavored-markdown:dev

example-ru-opt: docker
	docker run --rm \
      -v "${PWD}/generated:/app/generated" \
      dnd-flavored-markdown:dev \
      scripts/optimize-pdf.sh \
        /app/generated/the-missing-merchant-ru.pdf \
        /app/generated/the-missing-merchant-ru.optimized.pdf