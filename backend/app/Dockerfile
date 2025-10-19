FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential libpq-dev --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# context is backend/app so copy relative files
COPY requirements.txt /app/
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY . /app/

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
#CMD ["gunicorn", "project.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
