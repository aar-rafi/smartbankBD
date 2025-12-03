# ML Services Dockerfile (Fraud Detection & Signature Verification)
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY server/ml/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML code and model
COPY server/ml/ /app/ml/
COPY best_siamese_transformer.pth /app/model/best_siamese_transformer.pth

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=/app/model/best_siamese_transformer.pth

WORKDIR /app/ml

# Default command (will be overridden in docker-compose)
CMD ["python", "fraud_prediction.py", "--server", "--port", "5002"]
