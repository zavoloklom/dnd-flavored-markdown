FROM node:24-bullseye

WORKDIR /app

# Установим curl (для entrypoint.sh)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ghostscript \
    qpdf \
    mupdf-tools \
  && rm -rf /var/lib/apt/lists/*

# package.json и lock-файл
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Установка браузера для Playwright
RUN npx playwright install --with-deps chromium

# Копируем весь проект
COPY . .

# Папка для PDF (будет volume)
RUN mkdir -p /app/generated

ENV OUTPUT_DIR=/app/generated
ENV VITE_PORT=5173
ENV VITE_HOST=0.0.0.0

# Значение по умолчанию, чтобы образ был runnable
ENV DOC_PATH=/content/the-missing-merchant/ru.md
ENV OUTPUT_FILE=the-missing-merchant-ru.pdf

EXPOSE 5173

CMD ["./entrypoint.sh"]
