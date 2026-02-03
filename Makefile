.DEFAULT_GOAL := help
.PHONY: help docker dev dev-sync

%:
	@true

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

######
# CONFIGURATION
######

MSYS_NO_PATHCONV:=1 # Fix for Windows
ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

IMAGE_NAME=zavoloklom/dnd-flavored-markdown
IMAGE_TAG=dev

docker:
	docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

dev: docker ## Start development inside container. Note: node_modules are not synced.
	docker run --rm -it --ipc=host \
	  -v ${PWD}:/app \
	  --mount type=volume,dst=/app/node_modules \
	  --entrypoint /bin/bash \
	  -p 5173:5173 \
	  ${IMAGE_NAME}:${IMAGE_TAG}

dev-sync: docker ## Start development inside container. Note: all files are synced.
	docker run --rm -it -v ${PWD}:/app --entrypoint /bin/bash -p 5173:5173 ${IMAGE_NAME}:${IMAGE_TAG}




docker-opt:
	docker build -f Dockerfile.gs10 -t pdf-gs10:dev .

example: docker
	docker run --rm \
      -e DOC_PATH=/content/index.md \
      -e OUTPUT_FILE=sample.pdf \
      -v "${PWD}/generated:/app/generated" \
      dnd-flavored-markdown:dev

example-opt-dev:
	docker run --rm -it -v ${PWD}:/app --entrypoint /bin/bash pdf-gs10:dev


example-opt:
	docker run --rm \
      -v "${PWD}:/app" \
      pdf-gs10:dev \
      scripts/optimize-pdf.sh \
        /app/generated/example-ru.pdf \
        /app/generated/example-ru.optimized.pdf

example-ru: docker
	docker run --rm \
      -e DOC_PATH=/content/the-missing-merchant/ru.md \
      -e OUTPUT_FILE=the-missing-merchant-ru.pdf \
      -v "${PWD}/generated:/app/generated" \
      dnd-flavored-markdown:dev

example-ru-opt:
	docker run --rm \
      -v "${PWD}:/app" \
      pdf-gs10:dev \
      scripts/optimize-pdf.sh \
        /app/generated/the-missing-merchant-ru.pdf \
        /app/generated/the-missing-merchant-ru.optimized.pdf

the-missing-merchant: docker
	docker run --rm \
      -e DOC_PATH=content/the-missing-merchant/ru.md \
      -e OUTPUT_FILE=the-missing-merchant-ru.pdf \
      -e OPTIMIZE_FLATTEN_IMAGES=true \
      -v "${PWD}/generated:/app/generated" \
      ${IMAGE_NAME}:${IMAGE_TAG}
	docker run --rm \
      -v "${PWD}:/app" \
      pdf-gs10:dev \
      scripts/optimize-pdf.sh \
        /app/generated/the-missing-merchant-ru.pdf \
        /app/generated/the-missing-merchant-ru.optimized.pdf