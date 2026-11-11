FROM python:3.12-slim-bookworm
WORKDIR /app
ENV TZ=Africa/Accra PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && playwright install --with-deps chromium
COPY sitewatch ./sitewatch
COPY plugin ./plugin
COPY config.yaml .
EXPOSE 8080
CMD ["sh", "-c", "python -m sitewatch serve --port ${PORT:-8080}"]
