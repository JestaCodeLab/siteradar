FROM python:3.12-slim-bookworm
WORKDIR /app
ENV TZ=Africa/Accra PYTHONUNBUFFERED=1 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY requirements.txt .
# libatomic1: the Node runtime bundled with recent Playwright versions needs it, and the slim image does not have it
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt && playwright install --with-deps chromium
COPY sitewatch ./sitewatch
COPY plugin ./plugin
COPY config.yaml .
# The browser opens customers' websites, so nothing here runs as root: a browser exploit then lands in an account that can only write to /app/data.
RUN useradd --create-home --uid 10001 app && mkdir -p /app/data && chown -R app:app /app/data
USER app
EXPOSE 8080
CMD ["sh", "-c", "python -m sitewatch serve --port ${PORT:-8080}"]
