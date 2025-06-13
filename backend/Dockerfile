FROM python:3.11-slim

# Set base working directory
WORKDIR /app/src

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all code into image
COPY ./src .

# Ensure PYTHONPATH points to project root
ENV PYTHONPATH=/app/src

# create default user
RUN adduser --disabled-password --gecos "" appuser
USER appuser