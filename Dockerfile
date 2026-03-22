# Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build

# Build Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (ffmpeg required by media_downloader)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose the single application port
EXPOSE 9919

WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9919"]
