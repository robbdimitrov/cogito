FROM python:3.13-slim
RUN mkdir -p /usr/app
WORKDIR /usr/app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd -m appuser && chown -R appuser:appuser /usr/app
USER appuser
CMD ["python", "main.py"]
