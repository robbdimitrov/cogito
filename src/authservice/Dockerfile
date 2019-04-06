FROM python:3.7-alpine

RUN mkdir -p /usr/app
WORKDIR /usr/app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD [ "uwsgi", "--ini", "app.ini" ]
