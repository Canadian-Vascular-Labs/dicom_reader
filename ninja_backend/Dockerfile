FROM python:3.11-slim

# Set base working directory
WORKDIR /app

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all code into image
COPY . .

# Ensure PYTHONPATH points to project root
ENV PYTHONPATH=/app/apidemo
