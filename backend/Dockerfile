FROM python:3.12-slim

# HuggingFace Spaces runs on port 7860 — this is mandatory
ENV PORT=7860
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Needed so sentence-transformers downloads models to a writable location
ENV HF_HOME=/tmp/hf_cache
ENV TRANSFORMERS_CACHE=/tmp/hf_cache
ENV SENTENCE_TRANSFORMERS_HOME=/tmp/sentence_transformers

WORKDIR /app

# Install system dependencies needed by psycopg2 and spacy
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spacy model at build time (so it's baked into the image)
RUN python -m spacy download en_core_web_sm

# Copy all backend source code
COPY . .

# Start the server on port 7860 (HuggingFace requirement)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
