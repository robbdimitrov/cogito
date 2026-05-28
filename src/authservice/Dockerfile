FROM python:3.13-slim
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd -m appuser && chown -R appuser:appuser /usr/src/app
USER appuser
CMD ["python", "main.py"]
