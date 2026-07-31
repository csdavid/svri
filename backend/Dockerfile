# Dockerfile para Backend FastAPI (Producción)
FROM python:3.11-slim

# Evitar la creación de archivos .pyc y forzar salida en tiempo real
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para PostgreSQL y compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente de la aplicación backend
COPY . .

EXPOSE 8008

# Comando de ejecución con Gunicorn y trabajadores Uvicorn para alta disponibilidad
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8008"]
