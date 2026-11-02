FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY oracle ./oracle
RUN useradd --uid 10001 --create-home oracle && mkdir /app/data && chown oracle:oracle /app/data
USER oracle
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz',timeout=3)"
CMD ["python","-m","uvicorn","oracle.api:create_app","--factory","--host","0.0.0.0","--port","8000","--workers","1","--no-access-log"]
